import os
import shutil
import time
import psutil


QUARANTINE_DIR = "C:/Users/pc/Desktop/EDR-2/quarantine"


def ensure_quarantine_dir():
    try:
        os.makedirs(QUARANTINE_DIR, exist_ok=True)
    except Exception as e:
        print(f"[!] Failed to create quarantine dir: {e}")


def quarantine_file(path):
    ensure_quarantine_dir()
    try:
        base = os.path.basename(path)
        ts = int(time.time())
        dest = os.path.join(QUARANTINE_DIR, f"{ts}_{base}")
        shutil.move(path, dest)
        return True, dest
    except Exception as e:
        return False, str(e)


def kill_process(pid):
    try:
        proc = psutil.Process(int(pid))
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except psutil.TimeoutExpired:
            proc.kill()
        return True, "terminated"
    except Exception as e:
        return False, str(e)


def execute_action(module, event_type, data, action):
    if action != "block":
        return {"executed": False, "result": "no-op"}

    # Try process termination first
    pid = data.get("pid")
    if pid is not None:
        ok, result = kill_process(pid)
        return {"executed": ok, "result": result}

    # Try file quarantine
    path = data.get("path") or data.get("file")
    if path:
        ok, result = quarantine_file(path)
        return {"executed": ok, "result": result}

    return {"executed": False, "result": "no target"}

