# process_tree_monitor.py

import psutil
import json
import time
import os
from datetime import datetime
from log_sender import send_to_backend
from severity_scoring import score_event
from realtime_decision import decide_action

# ------------------ CONFIG ------------------ #
BASELINE_PATH = "C:/Users/pc/Desktop/EDR-2/baseline/trusted_process_relationships.json"
LOG_PATH = "C:/Users/pc/Desktop/EDR-2/logs/process_tree_logs.json"
CHECK_INTERVAL = 30  # seconds

# ------------------ HELPERS ------------------ #
def load_baseline():
    try:
        with open(BASELINE_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return []

def log_locally(event):
    try:
        with open(LOG_PATH, "a") as f:
            json.dump(event, f)
            f.write("\n")
    except Exception as e:
        print("[!] Local logging failed:", e)

# ------------------ DETECTOR ------------------ #
def detect_untrusted_process_tree():
    trusted_pairs = load_baseline()
    trusted_set = set((entry['parent'], entry['child']) for entry in trusted_pairs)

    for proc in psutil.process_iter(['pid', 'ppid', 'name']):
        try:
            child = proc.info['name']
            parent = psutil.Process(proc.info['ppid']).name()

            pair = (parent, child)

            if pair not in trusted_set:
                event = {
                    "event": "Untrusted Process Tree",
                    "parent": parent,
                    "child": child,
                    "pid": proc.info['pid'],
                    "ppid": proc.info['ppid'],
                    "timestamp": datetime.now().isoformat()
                }
                print(f"[!] Untrusted Process Tree: {event}")
                log_locally(event)
                try:
                    sev = score_event("Untrusted Process Tree", event)
                    event = {**event, "severity": sev}
                except Exception:
                    pass
                action, conf = decide_action("process_tree", "Untrusted Process Tree", event)
                event.update({"ml_action": action, "ml_confidence": conf})
                send_to_backend("process_tree", "Untrusted Process Tree", event)

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

# ------------------ RUNNER ------------------ #
def run_process_tree_monitor():
   
    while True:
        detect_untrusted_process_tree()
        time.sleep(CHECK_INTERVAL)


