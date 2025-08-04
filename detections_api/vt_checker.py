import json
import time
import requests
import os
import logging
from datetime import datetime
from requests.exceptions import RequestException
from dotenv import load_dotenv

load_dotenv()

# === CONFIGURATION ===
# Replace LOG_FILE with the server endpoint
LOG_ENDPOINT = os.getenv("LOG_ENDPOINT", "http://localhost:5000/download_logs")
# Ensure VT_API_KEY is always a string
VT_API_KEY = os.getenv("VT_API_KEY") or ""
MAX_CHECKS_PER_RUN = 50  # Limit checks to stay within API limits
SLEEP_BETWEEN_CHECKS = 15  # Seconds between checks to respect VT rate limits
OUTPUT_FILE = "logs/vt_results.json"  # File to store VT results

# Ensure logs directory exists BEFORE setting up logging
os.makedirs("logs", exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/vt_checker.log"),
        logging.StreamHandler()
    ]
)

def check_hash_virustotal(sha256: str, api_key: str):
    """Check file hash against VirusTotal"""
    if not sha256 or not api_key:
        return None
        
    url = f"https://www.virustotal.com/api/v3/files/{sha256}"
    headers = {"x-apikey": api_key}
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            stats = result.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            return {
                "malicious_count": stats.get("malicious", 0),
                "suspicious_count": stats.get("suspicious", 0),
                "undetected_count": stats.get("undetected", 0),
                "harmless_count": stats.get("harmless", 0),
                "total_engines": sum(stats.values()),
                "permalink": result.get("data", {}).get("links", {}).get("self"),
                "first_submitted": result.get("data", {}).get("attributes", {}).get("first_submission_date"),
                "last_analysis_date": result.get("data", {}).get("attributes", {}).get("last_analysis_date"),
                "popular_threat_classification": result.get("data", {}).get("attributes", {}).get("popular_threat_classification"),
                "vt_checked_at": datetime.utcnow().isoformat() + "Z"
            }
        elif response.status_code == 404:
            logging.info(f"SHA256 not found in VirusTotal: {sha256}")
            return {"status": "not_found"}
        else:
            logging.warning(f"VT API error for {sha256}: HTTP {response.status_code}")
            return {"error": f"HTTP_{response.status_code}"}
    except RequestException as e:
        logging.error(f"Request failed for {sha256}: {e}")
        return {"error": str(e)}

def process_log_entries(log_entries):
    """Process log entries and check against VirusTotal"""
    results = []
    checked_count = 0
    
    # Load previous results if available
    previous_results = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r") as f:
                previous_results = {item["sha256"]: item for item in json.load(f)}
        except Exception as e:
            logging.error(f"Error loading previous results: {e}")
    
    for entry in log_entries:
        if checked_count >= MAX_CHECKS_PER_RUN:
            logging.info("Reached max checks per run limit")
            break
            
        # Get SHA256 from log entry
        sha256 = entry.get("hashes", {}).get("sha256")
        
        if not sha256:
            logging.warning(f"Skipping entry without SHA256: {entry.get('file_name')}")
            continue
        
        # Skip if we already have results for this hash
        if sha256 in previous_results:
            results.append(previous_results[sha256])
            continue
        
        # Check against VirusTotal
        logging.info(f"Checking VT for: {entry.get('file_name')} ({sha256})")
        vt_result = check_hash_virustotal(sha256, VT_API_KEY)
        
        if vt_result:
            result_entry = {
                "file_name": entry.get("file_name"),
                "path": entry.get("path"),
                "sha256": sha256,
                "timestamp": entry.get("timestamp"),
                "vt_result": vt_result
            }
            results.append(result_entry)
            checked_count += 1
            
            # Save intermediate results
            with open(OUTPUT_FILE, "w") as f:
                json.dump(results, f, indent=2)
            
            # Respect VT rate limits
            if checked_count < MAX_CHECKS_PER_RUN:
                time.sleep(SLEEP_BETWEEN_CHECKS)
    
    return results

def main():
    # Fetch log entries from the server endpoint
    try:
        response = requests.get(LOG_ENDPOINT, timeout=30)
        if response.status_code != 200:
            logging.error(f"Failed to fetch logs from server: HTTP {response.status_code}")
            return
        log_entries = response.json()
        # Normalize to list format
        if isinstance(log_entries, dict):
            log_entries = [log_entries]
        if not log_entries:
            logging.info("No entries found in server logs")
            return
        logging.info(f"Loaded {len(log_entries)} log entries from server")
        # Process entries
        results = process_log_entries(log_entries)
        # Save final results
        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2)
            logging.info(f"Saved {len(results)} results to {OUTPUT_FILE}")
        # Print summary
        malicious_files = [r for r in results if r.get("vt_result", {}).get("malicious_count", 0) > 0]
        logging.info(f"Detection summary: {len(malicious_files)} malicious files found")
        # Print malicious files
        if malicious_files:
            logging.warning("🚨 MALICIOUS FILES DETECTED:")
            for file in malicious_files:
                logging.warning(f"- {file['file_name']} (Detections: {file['vt_result']['malicious_count']}/{file['vt_result']['total_engines']})")
    except Exception as e:
        logging.exception(f"Critical error: {e}")

if __name__ == "__main__":
    logging.info("Starting VirusTotal checker")
    main()
    logging.info("VT checker completed")