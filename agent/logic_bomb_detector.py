# logic_bomb_detector.py

import threading
import psutil
import time
import subprocess
import json
import datetime
import platform
import os
import ast
from collections import defaultdict, deque
from file_trigger_detector import run_file_trigger_monitor
from severity_scoring import score_event  
from log_sender import send_to_backend
from realtime_decision import decide_action

# ------------------ CONFIG ------------------ #

IDLE_CPU_THRESHOLD = 1.0  # percent
IDLE_CHECK_INTERVAL = 5  # seconds
TASK_QUERY_INTERVAL = 60  # seconds
BASELINE_PATH = "C:/Users/pc/Desktop/EDR-2/baseline/baseline.json"
SLEEP_THRESHOLD = 300  # seconds
EXECUTION_PATTERN_WINDOW = 7  # days
EXECUTION_TIME_VARIANCE = 2  # minutes
TASK_SCHEDULE_CHECK_HOURS = [2, 3, 4, 5]  # suspicious times
LOG_BOMB_LOG = "C:/Users/pc/Desktop/EDR-2/logs/logic_bomb_logs.json"

# ------------------ Helpers ------------------ #
def load_baseline():
    try:
        with open(BASELINE_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def save_baseline(data):
    try:
        with open(BASELINE_PATH, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print("[!] Failed to save baseline:", e)

def log_locally(event_type, data):
    try:
        with open(LOG_BOMB_LOG, "a") as f:
            json.dump({"event": event_type, "data": data, "time": time.ctime()}, f)
            f.write("\n")
    except Exception as e:
        print("[!] Failed to log locally:", e)

# ------------------ SLEEP BOMB DETECTION ------------------ #
def detect_sleeping_processes():
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'create_time']):
        try:
            if proc.status() == psutil.STATUS_SLEEPING:
                uptime = time.time() - proc.create_time()
                cpu = proc.cpu_percent(interval=1.0)

                if uptime > SLEEP_THRESHOLD and cpu < IDLE_CPU_THRESHOLD:
                    log_data = {
                        "pid": proc.pid,
                        "name": proc.name(),
                        "uptime": uptime,
                        "cpu": cpu,
                        "status": "sleeping"
                    }
                    send_alert("Suspicious Sleep Detected", log_data)
        except Exception:
            continue

# ------------------ TIME TRIGGER DETECTION ------------------ #
def check_system_time_trigger():
    now = datetime.datetime.now()
    suspicious_hours = [2, 3, 4, 23]
    suspicious_dates = [(29, 7), (31, 12)]

    if now.hour in suspicious_hours or (now.day, now.month) in suspicious_dates:
        send_alert("Time-Based Execution Window", {"timestamp": now.isoformat()})

# ------------------ Repeated Time Execution ------------------ #
process_history = defaultdict(deque)

def track_process_execution_time():
    for proc in psutil.process_iter(['pid', 'name', 'create_time']):
        try:
            name = proc.info['name']
            exec_time = time.strftime('%H:%M', time.localtime(proc.info['create_time']))

            if name:
                times = process_history[name]
                if len(times) >= EXECUTION_PATTERN_WINDOW:
                    times.popleft()
                times.append(exec_time)

                if len(times) == EXECUTION_PATTERN_WINDOW:
                    hours = [int(t.split(':')[0]) * 60 + int(t.split(':')[1]) for t in times]
                    if max(hours) - min(hours) <= EXECUTION_TIME_VARIANCE:
                        send_alert("Consistent Execution Time", {"name": name, "times": list(times)})

        except Exception:
            continue

# ------------------ Detect Long Sleeps in Script ------------------ #
def detect_long_sleep_in_script(script_path):
    try:
        with open(script_path, 'r') as f:
            tree = ast.parse(f.read())
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and getattr(node.func, 'attr', '') == 'sleep':
                    if isinstance(node.args[0], ast.Constant) and node.args[0].value >= SLEEP_THRESHOLD:
                        send_alert("Long sleep() in Script", {"file": script_path, "duration": node.args[0].value})
                        return True
    except Exception as e:
        print(f"[!] Sleep scan failed for {script_path}:", e)
    return False

# ------------------ TASK SCHEDULER MONITOR ------------------ #
###def detect_suspicious_scheduled_tasks():
    baseline = load_baseline()
    trusted_tasks = baseline.get("scheduled_tasks", [])

    try:
        result = subprocess.run(
            ["schtasks", "/query", "/fo", "LIST", "/v"],
            capture_output=True, text=True, timeout=10
        )
        output = result.stdout
        tasks = output.split("\n\n")

        for task in tasks:
            if any(keyword in task.lower() for keyword in ["temp", "sleep", "delay", ".exe", "powershell"]):
                task_name = next((line for line in task.splitlines() if "TaskName" in line), "Unknown")
                if task_name not in trusted_tasks:
                    send_alert("Suspicious Scheduled Task", {"task": task_name, "details": task})

    except Exception as e:
        send_alert("Task Query Error", {"error": str(e)})

# ------------------ Script Scanner ------------------ #
def scan_scripts_for_sleep(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                detect_long_sleep_in_script(path)

# ------------------ ALERT FUNCTION ------------------ #
def send_alert(event_type, data):
    severity = score_event(event_type, data)
    data["severity"] = severity
    print(f"[!] {event_type} (Severity {severity}): {data}")
    log_locally(event_type, data)
    action, conf = decide_action("logic_bomb", event_type, data)
    data.update({"ml_action": action, "ml_confidence": conf})
    send_to_backend("logic_bomb", event_type, data)

# ------------------ RUNNER ------------------ #

    
if __name__ == "__main__":
    print("[*] Logic Bomb Detector Running...")
    scan_scripts_for_sleep("C:/Users/pc/Desktop/EDR-2/scripts")
    
    WATCH_PATHS = ["C:/Users/ahmad/Desktop/Logic bombs exapmles", "C:/Users/ahmad/Documents"]
   
        
    threading.Thread(target=detect_sleeping_processes, daemon=True).start()
    print("[*] Sleep monitoring started...")
    check_system_time_trigger()
    threading.Thread(target=check_system_time_trigger, daemon=True).start()
    print("[*] Time bomb detection started...")
    ###detect_suspicious_scheduled_tasks()
    threading.Thread(target=run_file_trigger_monitor, args=(WATCH_PATHS,), daemon=True).start()
    print("i am working")
    track_process_execution_time()
    threading.Thread(target=track_process_execution_time, daemon=True).start()
    print("[*] processor execution detection started...")
            
    while True:
        time.sleep(10)
