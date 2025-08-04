# Import required libraries
import socket
import psutil  # For process monitoring
import time  # For delays and timestamps
import json  # For log formatting
import os  # For file/directory handling
from watchdog.observers import Observer  # To watch file system changes
from watchdog.events import FileSystemEventHandler  # To define what to do on file events
import threading  # To run process monitoring in a parallel thread
from log_sender import send_to_backend
from collections import defaultdict
import subprocess
import ipaddress
import win32process
import win32api
import winreg
from process_tree_monitor import run_process_tree_monitor
import sys
from severity_scoring import score_event

#-----------------------Trusted IPS Checking----------------------#
def load_trusted_ranges(path="trusted_ips.json"):
    try:
        with open(path, "r") as f:
            ip_list = json.load(f)
            return [ipaddress.ip_network(cidr) for cidr in ip_list]
    except Exception as e:
        print("[!] Failed to load trusted IPs:", e)
        return []

trusted_ranges = load_trusted_ranges()

def is_ip_trusted(ip):
    try:
        ip_obj = ipaddress.ip_address(ip)
        return any(ip_obj in net for net in trusted_ranges)
    except ValueError:
        return False

#----------------------------------------------------------------------#

log_file = "D:/CyberSecurity-Learning-Materials/EDR project/logs/endpoint_logs.json"
os.makedirs(os.path.dirname(log_file), exist_ok=True)

# ------------------ PROCESS MONITORING ------------------
def check_suspicious_modules(pid):
    suspicious_dlls = ["user32.dll", "kernel32.dll", "advapi32.dll"]
    try:
        h_process = win32api.OpenProcess(0x0410, False, pid)
        modules = win32process.EnumProcessModules(h_process)
        paths = [win32process.GetModuleFileNameEx(h_process, m).lower() for m in modules]
        return any(any(dll in path for dll in suspicious_dlls) for path in paths)
    except Exception:
        return False

def monitor_processes():
    seen = set()
    suspicious_keywords = ["keylogger", "rat", "remoteadmin", "ransom", "locker", "stealer", "info_stealer"]
    suspicious_parents = ["powershell.exe", "cmd.exe", "wscript.exe", "mshta.exe"]
    score = score_event(event_type, data)

    while True:
        for proc in psutil.process_iter(['pid', 'name', 'ppid']):
            if proc.pid not in seen:
                seen.add(proc.pid)
                proc_name = proc.info['name'].lower()
                parent_name = "unknown"
                try:
                    parent = psutil.Process(proc.ppid())
                    parent_name = parent.name().lower()
                except Exception:
                    pass

                log_event("Process Created", {
                    "pid": proc.pid,
                    "name": proc.info['name'],
                    "parent": parent_name
                })

                send_to_backend("process", "Process Created", {
                    "pid": proc.pid,
                    "name": proc.info['name'],
                    "parent": parent_name
                    
                })

                if any(keyword in proc_name for keyword in suspicious_keywords):
                    log_event("Suspicious Process", {
                        "pid": proc.pid,
                        "name": proc.info['name'],
                        "reason": "Matched suspicious keyword"
                    })
                    print(f"[ALERT] Suspicious process detected: {proc.info['name']}")
                    send_to_backend("process", "Suspicious Process", {
                        "pid": proc.pid,
                        "name": proc.info['name'],
                        "reason": "Matched suspicious keyword"
                    })

                if parent_name in suspicious_parents:
                    log_event("Suspicious Parent Process", {
                        "pid": proc.pid,
                        "name": proc.info['name'],
                        "parent": parent_name
                    })
                    if parent_name in suspicious_parents:
                        print(f"[ALERT] Suspicious parent process: {proc.info['name']} (Parent: {parent_name})")

                    send_to_backend("process", "Suspicious Parent Process", {
                        "pid": proc.pid,
                        "name": proc.info['name'],
                        "parent": parent_name
                    })

                if check_suspicious_modules(proc.pid):
                    log_event("Suspicious Process Modules", {
                        "pid": proc.pid,
                        "name": proc.info['name']
                    })
                    if check_suspicious_modules(proc.pid):
                        print(f"[ALERT] Suspicious modules in: {proc.info['name']}")

                    send_to_backend("process", "Suspicious Process Modules", {
                        "pid": proc.pid,
                        "name": proc.info['name']
                    })
        time.sleep(3)

# ------------------ NETWORK CONNECTION MONITORING ------------------
def monitor_network():
    socket.setdefaulttimeout(2)
    seen = set()
    suspicious_ports = [1337, 5555, 6666, 8081, 9001, 3389, 22]

    while True:
        connections = psutil.net_connections(kind='inet')

        for conn in connections:
            if conn.status == "ESTABLISHED" and conn.raddr:
                conn_id = (conn.pid, conn.raddr.ip, conn.raddr.port)

                if conn_id not in seen:
                    seen.add(conn_id)

                    try:
                        proc = psutil.Process(conn.pid)
                        proc_name = proc.name()
                    except Exception:
                        proc_name = "Unknown"

                    remote_ip = conn.raddr.ip
                    is_trusted = is_ip_trusted(remote_ip)

                    try:
                        reverse_dns = socket.gethostbyaddr(remote_ip)[0]
                    except Exception:
                        reverse_dns = "Unknown"

                    log_data = {
                        "pid": conn.pid,
                        "process": proc_name,
                        "local_addr": f"{conn.laddr[0]}:{conn.laddr[1]}" if conn.laddr else "",
                        "remote_addr": f"{conn.raddr[0]}:{conn.raddr[1]}" if conn.raddr else "",
                        "status": conn.status,
                        "trusted": is_trusted,
                        "domain": reverse_dns
                    }

                    log_event("Network Connection", log_data)
                    send_to_backend("network", "Network Connection", log_data)

                    if not is_trusted or conn.raddr.port in suspicious_ports or proc_name == "Unknown":
                        log_event("Suspicious Network", {
                            **log_data,
                            "reason": "Untrusted IP / Suspicious port / Unknown process"
                        })
                        print(f"[ALERT] Suspicious network connection: {proc_name} -> {remote_ip}:{conn.raddr.port}")

                        send_to_backend("network", "Suspicious Network", {
                            **log_data,
                            "reason": "Untrusted IP / Suspicious port / Unknown process"
                        })
        time.sleep(5)

#---------------------------USB Detection---------------------------#
def monitor_usb():
    seen_devices = set()

    while True:
        current_devices = {
            part.device
            for part in psutil.disk_partitions(all=False)
            if 'removable' in part.opts or part.device.startswith('F:')
        }

        new_devices = current_devices - seen_devices
        for dev in new_devices:
            send_to_backend("usb", "USB Inserted", {"device": dev})

        removed_devices = seen_devices - current_devices
        for dev in removed_devices:
            send_to_backend("usb", "USB Removed", {"device": dev})

        seen_devices = current_devices
        time.sleep(10)

# ------------------ AUTORUN PERSISTENCE DETECTION ------------------
def detect_autorun_registry():
    suspicious_entries = []
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\\Microsoft\Windows\\CurrentVersion\\Run")
        for i in range(winreg.QueryInfoKey(key)[1]):
            name, value, _ = winreg.EnumValue(key, i)
            suspicious_entries.append({name: value})
    except Exception:
        pass
    return suspicious_entries

def monitor_autorun():
    while True:
        autoruns = detect_autorun_registry()
        for entry in autoruns:
            log_event("Autorun Entry Detected", entry)
            send_to_backend("autorun", "Autorun Entry Detected", entry)
        time.sleep(30)

# ------------------ FILE MONITORING ------------------
class Watcher:
    def __init__(self, paths):
        self.paths = paths
        self.observer = Observer()

    def run(self):
        event_handler = Handler()

        for path in self.paths:
            try:
                self.observer.schedule(event_handler, path, recursive=True)
            except Exception as e:
                log_event("WatchError", {"path": path, "error": str(e)})

        self.observer.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.observer.stop()
        self.observer.join()

#----------------------- FILE MODIFICATION DETECTION ------------------#
file_change_counter = defaultdict(int)
last_reset_time = time.time()
suspicious_extensions = [".locked", ".crypted", ".enc", ".encrypt", ".rnsm", ".crpt", ".encfile"]
file_mod_threshold = 30

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        global last_reset_time
        now = time.time()
        if now - last_reset_time > 30:
            file_change_counter.clear()
            last_reset_time = now

        file_change_counter[event.src_path] += 1
        total_mods = sum(file_change_counter.values())

        log_event("File Modified", {"path": event.src_path})
        send_to_backend("file", "File Modified", {"path": event.src_path})

        if "C:/Windows" in str(event.src_path):
            log_event("System File Touched", {"file": event.src_path})
            send_to_backend("file", "System File Touched", {"file": event.src_path})

        if total_mods > file_mod_threshold:
            log_event("Suspicious Behavior", {
                "reason": "Rapid file modification",
                "count": total_mods
            })
            send_to_backend("file", "Suspicious Behavior", {
                "reason": "Rapid file modification",
                "count": total_mods
            })
            print(f"[ALERT] Rapid file modifications detected! Total: {total_mods}")

    def on_created(self, event):
        log_event("File Created", {"path": event.src_path})
        send_to_backend("file", "File Created", {"path": event.src_path})
        print(f"[ALERT] Suspicious file extension created: {event.src_path}")

        if any(str(event.src_path).endswith(ext) for ext in suspicious_extensions):
            log_event("Suspicious File Extension", {"file": event.src_path})
            send_to_backend("file", "Suspicious File Extension", {"file": event.src_path})

    def on_deleted(self, event):
        log_event("File Deleted", {"path": event.src_path})
        send_to_backend("file", "File Deleted", {"path": event.src_path})

# ------------------ LOGGING FUNCTION ------------------
def log_event(event_type, data):
    try:
        with open(log_file, "a") as f:
            f.write(json.dumps({
                "event": event_type,
                "details": data,
                "time": time.ctime()
            }) + "\n")
    except Exception as e:
        print("[ERROR] Logging failed:", e)

# ------------------ MAIN PROGRAM START ------------------
try:
    from yara_scanner import run_yara_scanner
    yara_available = True
except Exception as e:
    print(f"[WARNING] YARA scanner not available: {e}")
    yara_available = False

if __name__ == "__main__":
    print("[*] Agent Started...")

    # Ensure all referenced directories exist
    required_dirs = [
        os.path.dirname(log_file),
        "D:/CyberSecurity-Learning-Materials/EDR project/logs",
        "D:/CyberSecurity-Learning-Materials/EDR project/agent/signature-base/yara",
        "C:/Users/ahmad/Downloads",
        "C:/Users/ahmad/Desktop"
    ]
    for d in required_dirs:
        try:
            os.makedirs(d, exist_ok=True)
        except Exception as e:
            print(f"[WARNING] Could not create directory {d}: {e}")

    # started process monitoring thread
    threading.Thread(target=monitor_processes, daemon=True).start()
    print("[*] Process monitoring started...")
    
    threading.Thread(target=run_process_tree_monitor, daemon=True).start()
    print("[*] Process Tree Monitor Running...")
    
    # started network monitoring thread
    threading.Thread(target=monitor_network, daemon=True).start()
    print("[*] Network monitoring started...")
    
    # Run YARA scanner in a background thread if available
    if yara_available:
        threading.Thread(target=run_yara_scanner, daemon=True).start()
        print("[*] YARA Scanner Started...")
    else:
        print("[!] YARA Scanner not started.")
    
    # start USB monitoring thread
    threading.Thread(target=monitor_usb, daemon=True).start()   
    print("[*] USB monitoring started...")
    
    # start autorun monitoring thread
    threading.Thread(target=monitor_autorun, daemon=True).start()
    print("[*] Autorun monitoring started...")

    watch_paths = [
        "C:/Users/ahmad/Desktop",
        "C:/Windows/System32"
    ]
    # Start the file watcher
    watcher = Watcher(paths=watch_paths)
    threading.Thread(target=watcher.run, daemon=True).start()
    print("[*] Monitoring started...")

    # Optional: Keep the main thread alive
    while True:
        time.sleep(10)
