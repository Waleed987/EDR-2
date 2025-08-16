import os
import time
import json
import hashlib
import mimetypes
import platform
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pymongo import MongoClient
import threading
import subprocess
from log_sender import send_to_backend
from severity_scoring import score_event
from realtime_decision import decide_action

# === CONFIGURATION ===
DOWNLOAD_FOLDER = os.path.join(os.path.expanduser("~"), "Downloads")
LOG_DIR = "D:/CyberSecurity-Learning-Materials/EDR project/detections_api/logs"
LOG_FILE = "D:/CyberSecurity-Learning-Materials/EDR project/detections_api/logs/download_log.json"
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "edr_logs"
COLLECTION_NAME = "download_logs"

# === SETUP MONGO ===
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()  # Test connection
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    print("[+] MongoDB connection established")
except Exception as e:
    print(f"[!] MongoDB connection failed: {e}")
    client = None
    collection = None

# === LOG DIRECTORY AND FILE SETUP ===
os.makedirs(LOG_DIR, exist_ok=True)
if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, "w") as f:
        json.dump([], f)

class DownloadHandler(FileSystemEventHandler):
    def __init__(self):
        self.pending_files = {}  # Track files that might still be downloading
    
    def on_created(self, event):
        if event.is_directory:
            return
        
        file_path = event.src_path
        file_name = os.path.basename(file_path)
        
        print(f"[DEBUG] File created: {file_name}")
        
        # Skip known temporary files
        if file_name.endswith((".tmp", ".crdownload", ".part", ".download")):
            print(f"[DEBUG] Skipping temp file: {file_name}")
            return
        
        # Add to pending files to check later
        self.pending_files[file_path] = time.time()
        
        # Start a timer to check if file is complete
        timer = threading.Timer(3.0, self.check_file_complete, args=[file_path])
        timer.start()
    
    def on_moved(self, event):
        """Handle file moves (common when downloads complete)"""
        if event.is_directory:
            return
        
        src_name = os.path.basename(event.src_path)
        dest_name = os.path.basename(event.dest_path)
        
        print(f"[DEBUG] File moved: {src_name} -> {dest_name}")
        
        # Check if it's a temp file being renamed to final name
        if (src_name.endswith((".tmp", ".crdownload", ".part", ".download")) and
            not dest_name.endswith((".tmp", ".crdownload", ".part", ".download"))):
            print(f"[DEBUG] Temp file renamed to final: {dest_name}")
            self.log_download(event.dest_path)
    
    def on_modified(self, event):
        """Handle file modifications"""
        if event.is_directory:
            return
        
        file_path = event.src_path
        file_name = os.path.basename(file_path)
        
        # Skip temp files
        if file_name.endswith((".tmp", ".crdownload", ".part", ".download")):
            return
        
        # Update timestamp for pending files
        if file_path in self.pending_files:
            self.pending_files[file_path] = time.time()
    
    def get_file_hash(self, file_path, algorithms=['md5', 'sha1', 'sha256']):
        """Calculate file hashes"""
        hashes = {}
        try:
            with open(file_path, 'rb') as f:
                file_data = f.read()
                for algo in algorithms:
                    if algo == 'md5':
                        hashes['md5'] = hashlib.md5(file_data).hexdigest()
                    elif algo == 'sha1':
                        hashes['sha1'] = hashlib.sha1(file_data).hexdigest()
                    elif algo == 'sha256':
                        hashes['sha256'] = hashlib.sha256(file_data).hexdigest()
        except Exception as e:
            print(f"[!] Error calculating hashes for {file_path}: {e}")
            # Return empty hashes instead of failing completely
            for algo in algorithms:
                hashes[algo] = None
        return hashes
    
    def get_file_signature(self, file_path):
        """Get file signature/magic bytes"""
        try:
            with open(file_path, 'rb') as f:
                # Read first 32 bytes for signature
                signature = f.read(32)
                return signature.hex() if signature else None
        except Exception as e:
            print(f"[!] Error reading file signature for {file_path}: {e}")
            return None
    
    def get_pe_info(self, file_path):
        """Extract PE file information (Windows executables)"""
        pe_info = {}
        try:
            # Check if it's a PE file by reading DOS header
            with open(file_path, 'rb') as f:
                dos_header = f.read(2)
                if dos_header != b'MZ':
                    return pe_info
            
            # Use PowerShell to get file version info (Windows only)
            if platform.system() == "Windows":
                try:
                    # Escape the file path properly for PowerShell
                    escaped_path = file_path.replace("'", "''")
                    cmd = f'''powershell -Command "try {{ $props = Get-ItemProperty -Path '{escaped_path}' -ErrorAction Stop; $props.VersionInfo | Select-Object CompanyName, FileDescription, FileVersion, ProductName, ProductVersion, LegalCopyright, OriginalFilename | ConvertTo-Json }} catch {{ Write-Output '{{}}' }}"'''
                    
                    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
                    if result.returncode == 0 and result.stdout.strip():
                        version_info = json.loads(result.stdout.strip())
                        if version_info and isinstance(version_info, dict):
                            pe_info = {
                                'company_name': version_info.get('CompanyName'),
                                'file_description': version_info.get('FileDescription'),
                                'file_version': version_info.get('FileVersion'),
                                'product_name': version_info.get('ProductName'),
                                'product_version': version_info.get('ProductVersion'),
                                'copyright': version_info.get('LegalCopyright'),
                                'original_filename': version_info.get('OriginalFilename')
                            }
                except Exception as e:
                    print(f"[DEBUG] PowerShell PE info extraction failed for {file_path}: {e}")
        except Exception as e:
            print(f"[!] Error extracting PE info for {file_path}: {e}")
        
        return pe_info
    
    def get_entropy(self, file_path):
        """Calculate file entropy (measure of randomness)"""
        try:
            with open(file_path, 'rb') as f:
                # Read file in chunks for large files
                data = b''
                chunk_size = 8192
                max_size = 10 * 1024 * 1024  # Limit to 10MB for entropy calculation
                
                while len(data) < max_size:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    data += chunk
                
                if not data:
                    return 0
                
                # Count byte frequencies
                byte_counts = [0] * 256
                for byte in data:
                    byte_counts[byte] += 1
                
                # Calculate entropy
                entropy = 0
                data_len = len(data)
                for count in byte_counts:
                    if count > 0:
                        frequency = count / data_len
                        import math
                        entropy -= frequency * math.log2(frequency)
                
                return round(entropy, 4)
        except Exception as e:
            print(f"[!] Error calculating entropy for {file_path}: {e}")
            return None
    
    def check_zone_identifier(self, file_path):
        """Check Windows Zone Identifier (marks files from internet)"""
        if platform.system() != "Windows":
            return None
        
        try:
            # Escape the file path properly for PowerShell
            escaped_path = file_path.replace("'", "''")
            cmd = f'''powershell -Command "try {{ Get-Content -Path '{escaped_path}:Zone.Identifier' -ErrorAction Stop }} catch {{ }}"'''
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
        except Exception as e:
            print(f"[DEBUG] Zone identifier check failed for {file_path}: {e}")
        return None
    
    def check_file_complete(self, file_path):
        """Check if a file download is complete"""
        if not os.path.exists(file_path):
            return
        
        file_name = os.path.basename(file_path)
        
        # Skip if it's still a temp file
        if file_name.endswith((".tmp", ".crdownload", ".part", ".download")):
            return
        
        # Check if file size is stable (not growing)
        try:
            size1 = os.path.getsize(file_path)
            time.sleep(1)
            if not os.path.exists(file_path):  # File might have been deleted
                return
            size2 = os.path.getsize(file_path)
            
            if size1 == size2 and size1 > 0:
                # File size is stable, likely complete
                print(f"[DEBUG] File appears complete: {file_name}")
                self.log_download(file_path)
            else:
                # File still changing, check again later
                print(f"[DEBUG] File still changing: {file_name}")
                timer = threading.Timer(2.0, self.check_file_complete, args=[file_path])
                timer.start()
        except Exception as e:
            print(f"[DEBUG] Error checking file {file_path}: {e}")
    
    def log_download(self, file_path):
        """Log the completed download"""
        if not os.path.exists(file_path):
            print(f"[!] File doesn't exist: {file_path}")
            return
        
        file_name = os.path.basename(file_path)
        print(f"[DEBUG] Starting to log download: {file_name}")
        
        # Remove from pending files
        self.pending_files.pop(file_path, None)
        
        try:
            file_size = os.path.getsize(file_path)
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            file_ctime = datetime.fromtimestamp(os.path.getctime(file_path))
            file_atime = datetime.fromtimestamp(os.path.getatime(file_path))
        except Exception as e:
            print(f"[!] Error getting file info for {file_path}: {e}")
            file_size = 0
            file_mtime = datetime.now()
            file_ctime = datetime.now()
            file_atime = datetime.now()
        
        # Get file extension and MIME type
        try:
            file_ext = os.path.splitext(file_name)[1].lower()
            mime_type, encoding = mimetypes.guess_type(file_path)
        except Exception as e:
            print(f"[!] Error getting mime type for {file_path}: {e}")
            file_ext = ""
            mime_type = None
            encoding = None
        
        print(f"[DEBUG] Calculating hashes for: {file_name}")
        hashes = self.get_file_hash(file_path)
        
        print(f"[DEBUG] Getting file signature for: {file_name}")
        signature = self.get_file_signature(file_path)
        
        print(f"[DEBUG] Calculating entropy for: {file_name}")
        entropy = self.get_entropy(file_path)
        
        print(f"[DEBUG] Checking PE info for: {file_name}")
        pe_info = self.get_pe_info(file_path)
        
        print(f"[DEBUG] Checking zone identifier for: {file_name}")
        zone_info = self.check_zone_identifier(file_path)
        
        # Collect all file metadata
        try:
            log_entry = {
                # Basic file info
                "file_name": file_name,
                "path": file_path,
                "size_bytes": file_size,
                "file_extension": file_ext,
                "mime_type": mime_type,
                "encoding": encoding,
                
                # Timestamps
                "timestamp": datetime.now().isoformat(),
                "file_modified": file_mtime.isoformat() if file_mtime else None,
                "file_created": file_ctime.isoformat() if file_ctime else None,
                "file_accessed": file_atime.isoformat() if file_atime else None,
                
                # Security-relevant hashes
                "hashes": hashes,
                
                # File analysis
                "file_signature": signature,
                "entropy": entropy,
                
                # Executable info (if applicable)
                "pe_info": pe_info if pe_info else None,
                
                # Download source info
                "zone_identifier": zone_info,
                
                # System info
                "system_info": {
                    "os": platform.system(),
                    "os_version": platform.version(),
                    "machine": platform.machine(),
                    "user": os.getenv('USERNAME') or os.getenv('USER')
                },
                
                # Risk indicators (calculated)
                "risk_indicators": {
                    "high_entropy": entropy > 7.5 if entropy is not None else False,
                    "suspicious_extension": file_ext in ['.exe', '.scr', '.pif', '.com', '.bat', '.cmd', '.vbs', '.js', '.jar', '.msi'],
                    "no_version_info": not bool(pe_info) if file_ext in ['.exe', '.dll'] else None,
                    "from_internet": zone_info is not None,
                    "large_file": file_size > 50 * 1024 * 1024 if file_size else False  # >50MB
                }
            }
        except Exception as e:
            print(f"[!] Error creating log entry for {file_path}: {e}")
            return
        
        print(f"[DEBUG] Log entry created for: {file_name}")
        
        # Log to local JSON FIRST (more reliable)
        json_success = False
        try:
            print(f"[DEBUG] Attempting to write to: {LOG_FILE}")
            
            # Ensure the directory exists
            os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
            
            # Read existing data
            if os.path.exists(LOG_FILE):
                with open(LOG_FILE, "r", encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                        if not isinstance(data, list):
                            print("[DEBUG] JSON file format incorrect, starting fresh")
                            data = []
                    except json.JSONDecodeError:
                        print("[DEBUG] JSON file corrupted, starting fresh")
                        data = []
            else:
                print("[DEBUG] JSON file doesn't exist, creating new")
                data = []
            
            # Add new entry
            data.append(log_entry)
            
            # Write back with error handling
            with open(LOG_FILE, "w", encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False, default=str)
            
            json_success = True
            print(f"[+]  Logged to JSON: {file_name}")
            
        except Exception as e:
            print(f"[!] Error writing to JSON log file: {e}")
            print(f"[DEBUG] LOG_FILE path: {LOG_FILE}")
            print(f"[DEBUG] Current working directory: {os.getcwd()}")
        
        # Compute severity and send to backend as unified module 'download'
        try:
            sev = score_event("Download Detected", {"file": file_name, "path": file_path, "size_bytes": file_size, "entropy": entropy})
            log_entry["severity"] = sev
        except Exception:
            pass

        try:
            action, conf = decide_action("download", "Download Detected", log_entry)
            log_entry.update({"ml_action": action, "ml_confidence": conf})
            send_to_backend("download", "Download Detected", log_entry)
        except Exception as e:
            print(f"[!] Backend send failed: {e}")

        # Log to MongoDB with full details
        if collection is not None:
            try:
                # Create a copy for MongoDB (with same detailed data)
                mongo_entry = log_entry.copy()
                result = collection.insert_one(mongo_entry)
                print(f"[+]  Logged to MongoDB with ID: {result.inserted_id}")
            except Exception as e:
                print(f"[!] MongoDB error: {e}")
        
        if json_success:
            print(f"[+]  DOWNLOAD DETECTED & LOGGED: {file_name} ({file_size} bytes)")
        else:
            print(f"[!]  DOWNLOAD DETECTED BUT LOGGING FAILED: {file_name} ({file_size} bytes)")

def scan_existing_files():
    """Scan for any files that might have been downloaded before monitoring started"""
    print("[+] Scanning for recent downloads...")
    try:
        current_time = time.time()
        for filename in os.listdir(DOWNLOAD_FOLDER):
            file_path = os.path.join(DOWNLOAD_FOLDER, filename)
            
            # Skip directories and temp files
            if os.path.isdir(file_path) or filename.endswith((".tmp", ".crdownload", ".part", ".download")):
                continue
            
            # Check if file was modified in the last 5 minutes
            file_mtime = os.path.getmtime(file_path)
            if current_time - file_mtime < 300:  # 5 minutes
                print(f"[+] Found recent file: {filename}")
    except Exception as e:
        print(f"[!] Error scanning existing files: {e}")

if __name__ == "__main__":
    print(f" Monitoring downloads in: {DOWNLOAD_FOLDER}")
    print(f" Logging to: {LOG_FILE}")
    print(f" Debug mode enabled")
    
    # Scan for recent files
    scan_existing_files()
    
    # Start monitoring
    observer = Observer()
    handler = DownloadHandler()
    observer.schedule(handler, DOWNLOAD_FOLDER, recursive=False)
    observer.start()
    
    print("[+]  Download monitoring started!")
    print("[+] Try downloading a file to test...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("\n Monitoring stopped.")
    
    observer.join()
    
    # Close MongoDB connection
    if client:
        client.close()