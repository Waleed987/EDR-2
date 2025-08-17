# file_trigger_detector.py

import os
import threading
import time
import json
import psutil
from datetime import datetime

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from log_sender import send_to_backend
from severity_scoring import score_event
from realtime_decision import decide_action

# ------------------ CONFIG ------------------ #
SUSPICIOUS_FILES = [
    "C:/Users/ahmad/Desktop/logic bombs exapmles/target.txt",
    "C:/Users/ahmad/Documents/sensitive_data.xlsx"
]

TRIGGER_TIME_WINDOW = 3  # seconds
SUSPICIOUS_EXECUTABLES = ["powershell.exe", "cmd.exe", "wscript.exe", "mshta.exe"]
LOG_FILE = "C:/Users/pc/Desktop/EDR-2/logs/file_trigger_logs.json"

# ------------------ HELPERS ------------------ #
def get_recent_processes(after_time):
    suspicious = []
    for proc in psutil.process_iter(['pid', 'name', 'create_time']):
        try:
            if proc.info['name'].lower() in SUSPICIOUS_EXECUTABLES:
                if time.time() - proc.info['create_time'] <= TRIGGER_TIME_WINDOW:
                    suspicious.append(proc.info)
        except Exception:
            continue
    return suspicious

def log_locally(event_type, data):
    try:
        with open(LOG_FILE, "a") as f:
            json.dump({"event": event_type, "data": data, "time": time.ctime()}, f)
            f.write("\n")
    except Exception as e:
        print("[!] Local Log Error:", e)
        
        
def log_correlation(trigger_file, process_info):
    correlation_data = {
        "trigger_file": trigger_file,
        "trigger_time": datetime.now().isoformat(),
        "process_name": process_info['name'],
        "pid": process_info['pid'],
        "process_start_time": time.ctime(process_info['create_time']),
    }

    try:
        with open(LOG_FILE, "a") as f:
            json.dump({"event": "Correlated Trigger-Process", "correlation": correlation_data}, f)
            f.write("\n")
    except Exception as e:
        print("[!] Correlation Log Error:", e)

    send_to_backend("logic_bomb", "Correlated Trigger-Process", correlation_data)


# ------------------ EVENT HANDLER ------------------ #
file_event_timestamps = {}

class FileTriggerHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if os.path.normpath(event.src_path) in map(os.path.normpath, SUSPICIOUS_FILES):


            print(f"[Trigger Watch] File modified: {event.src_path}")
            file_event_timestamps[event.src_path] = time.time()

            time.sleep(TRIGGER_TIME_WINDOW + 1)
            procs = get_recent_processes(after_time=file_event_timestamps[event.src_path])
            for proc in procs:
                alert_data = {
                    "file": event.src_path,
                    "proc_name": proc['name'],
                    "pid": proc['pid'],
                    "created_at": proc['create_time']
                }
                
                print(f"[!] File-triggered Process Detected: {alert_data}")
                
                
                # 1. Log individual event with severity
                severity = score_event("File-triggered Process", alert_data)
                alert_with_sev = {**alert_data, "severity": severity}
                log_locally("File-triggered Process", alert_with_sev)
                action, conf = decide_action("logic_bomb", "File-triggered Process", alert_with_sev)
                alert_with_sev.update({"ml_action": action, "ml_confidence": conf})
                send_to_backend("logic_bomb", "File-triggered Process", alert_with_sev)

                # 2. Log correlation
                corr_sev = score_event("Correlated Trigger-Process", alert_data)
                log_correlation(event.src_path, proc)

# ------------------ RUNNER ------------------ #
def run_file_trigger_monitor(paths_to_watch):
    observer = Observer()
    handler = FileTriggerHandler()
    for path in paths_to_watch:
        observer.schedule(handler, path, recursive=True)

    observer.start()
    print("[*] File Trigger Monitor Running...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    
    WATCH_PATHS = ["C:/Users/ahmad/Desktop", "C:/Users/ahmad/Documents"]
    print("I am running")
    threading.Thread(target=run_file_trigger_monitor, args=(WATCH_PATHS,), daemon=True).start()
    
    while True:
        time.sleep(10)
