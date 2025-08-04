# severity_scoring.py

import uuid
from log_sender import send_to_backend  
import time
import json
import os

SCORE_LOG_FILE = "D:/CyberSecurity-Learning-Materials/EDR project/logs/severity_scores.json"

def score_event(event_type, data):
    score = 0

    # Scoring logic
    if event_type == "Suspicious Sleep Detected":
        score += 6 if data.get("uptime", 0) > 600 else 4
        if data.get("cpu", 0) < 1:
            score += 2
    elif event_type == "Long sleep() in Script":
        score += min(int(data.get("duration", 0) / 100), 5)
    elif event_type == "Suspicious Scheduled Task":
        task_str = str(data).lower()
        if "powershell" in task_str:
            score += 7
        elif "cmd" in task_str:
            score += 5
        else:
            score += 4
    elif event_type == "Consistent Execution Time":
        score += 6
    elif event_type == "Time-Based Execution Window":
        score += 5
    elif event_type == "File-triggered Process":
        score += 7
        if "powershell" in data.get("proc_name", "").lower():
            score += 2

    score = min(score, 10)

    # Prepare full event log
    event_record = {
        "event_id": str(uuid.uuid4()),
        "timestamp": time.time(),
        "event_type": event_type,
        "source": "logic_bomb_detector",
        "data": data,
        "score": score
    }

    # Send to backend
    send_to_backend("severity_score", event_type, event_record)

    # Log locally
    try:
        os.makedirs(os.path.dirname(SCORE_LOG_FILE), exist_ok=True)
        with open(SCORE_LOG_FILE, "a") as f:
            json.dump(event_record, f)
            f.write("\n")
    except Exception as e:
        print("[!] Failed to log severity score:", e)

    return score
