import os
import json
import time
from log_sender import send_to_backend
from severity_scoring import score_event
from realtime_decision import decide_action

try:
    import yara
    yara_available = True
except Exception as e:
    print(f"[ERROR] YARA module not available: {e}")
    yara_available = False

# ------------------ CONFIG ------------------ #
YARA_RULES_DIR = ["C:/Users/pc/Desktop/EDR-2/agent/signature-base/yara"]

TARGET_DIRS = ["C:/Users/pc/Downloads", "C:/Users/pc/Desktop"]
LOG_FILE = "C:/Users/pc/Desktop/EDR-2/logs/yara_logs.json"

# ------------------ Load Rules ------------------ #
def load_yara_rules():
    if not yara_available:
        return None
    rules = {}
    index = 0
    for dir_path in YARA_RULES_DIR:
        if not os.path.isdir(dir_path):
            print(f"[WARNING] YARA rules directory does not exist: {dir_path}")
            continue
        for file in os.listdir(dir_path):
            if file.endswith(".yar") or file.endswith(".yara"):
                full_path = os.path.join(dir_path, file)
                rules[f"r{index}"] = full_path
                index += 1
    if not rules:
        print("[WARNING] No YARA rules found. Skipping YARA scan.")
        return None
    try:
        return yara.compile(filepaths=rules)
    except Exception as e:
        print(f"[ERROR] Failed to compile YARA rules: {e}")
        return None

# ------------------ Logger ------------------ #
def log_event(event_type, data):
    severity = score_event(event_type, data)
    data = {**data, "severity": severity}
    log_entry = {
        "event": event_type,
        "data": data,
        "timestamp": time.ctime()
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    action, conf = decide_action("yara_scan", event_type, data)
    data.update({"ml_action": action, "ml_confidence": conf})
    send_to_backend("yara_scan", event_type, data)

# ------------------ Scanner ------------------ #
def scan_files_with_yara():
    if not yara_available:
        return
    rules = load_yara_rules()
    if not rules:
        return
    for directory in TARGET_DIRS:
        if not os.path.isdir(directory):
            print(f"[WARNING] Target directory does not exist: {directory}")
            continue
        for root, _, files in os.walk(directory):
            for file in files:
                try:
                    path = os.path.join(root, file)
                    matches = rules.match(filepath=path)
                    if matches:
                        log_event("YARA Match Detected", {
                            "file": path,
                            "matches": [match.rule for match in matches]
                        })
                except Exception as e:
                    print(f"[ERROR] YARA scan failed for {path}: {e}")
                    continue

# ------------------ Runner ------------------ #
def run_yara_scanner():
    if not yara_available:
        print("[!] YARA is not available. Skipping YARA scanner thread.")
        return
    print("[*] YARA Scanner Running...")
    while True:
        scan_files_with_yara()
        time.sleep(300)  # Every 5 minutes
