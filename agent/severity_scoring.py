# severity_scoring.py

import uuid
from log_sender import send_to_backend  
import time
import json
import os

SCORE_LOG_FILE = "C:/Users/pc/Desktop/EDR-2/logs/severity_scores.json"

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

    # --- Generic modules ---
    elif event_type in ("Process Created",):
        # Lower severity by default
        parent = (data.get("parent") or "").lower()
        name = (data.get("name") or "").lower()
        if any(k in name for k in ["powershell", "cmd", "wscript", "mshta"]):
            score += 4
        if parent in ["powershell.exe", "cmd.exe", "wscript.exe", "mshta.exe"]:
            score += 3
        score = max(score, 1)
    elif event_type in ("Suspicious Process", "Suspicious Parent Process", "Suspicious Process Modules"):
        score += 6
    elif event_type == "Network Connection":
        if not data.get("trusted", True):
            score += 4
        try:
            port = int(str(data.get("remote_addr", ":")).split(":")[1])
            if port in [1337, 5555, 6666, 8081, 9001, 3389, 22]:
                score += 3
        except Exception:
            pass
        score = max(score, 1)
    elif event_type == "Suspicious Network":
        score += 7
    elif event_type in ("File Modified", "File Created", "File Deleted", "System File Touched"):
        score += 2
        if str(data.get("file") or data.get("path") or "").lower().startswith("c:/windows"):
            score += 3
    elif event_type == "Suspicious File Extension":
        score += 6
    elif event_type == "Autorun Entry Detected":
        score += 6
    elif event_type == "USB Inserted":
        score += 3
    elif event_type == "USB Removed":
        score += 1
    elif event_type == "Untrusted Process Tree":
        score += 7
    elif event_type == "YARA Match Detected":
        score += 8
    elif event_type == "Download Detected":
        # Use entropy and extension for heuristic
        entropy = data.get("entropy")
        file_ext = (data.get("file_extension") or data.get("path") or "")
        try:
            if isinstance(entropy, (int, float)) and entropy > 7.5:
                score += 3
        except Exception:
            pass
        if any(str(file_ext).lower().endswith(ext) for ext in [".exe", ".dll", ".scr", ".js", ".vbs", ".jar", ".msi"]):
            score += 4

    score = min(score, 10)

    # Prepare full event log
    event_record = {
        "event_id": str(uuid.uuid4()),
        "timestamp": time.time(),
        "event_type": event_type,
        "source": "agent",
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
