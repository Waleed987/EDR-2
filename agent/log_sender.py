import socket
import requests
import time

BACKEND_URL = "http://localhost:5000/log"


def get_agent_ip():
    try:
        return socket.gethostbyname(socket.gethostname())
    except:
        return "Unknown"

def get_agent_name():
    try:
        return socket.gethostname()
    except:
        return "Unknown"

AGENT_IP = get_agent_ip()
AGENT_NAME = get_agent_name()


def send_to_backend(module, event, data):
    payload = {
        "agent_ip": AGENT_IP,
        "agent_name": AGENT_NAME,

        "module": module,
        "event": event,
        "data": data,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=3, verify=False)
        if response.status_code != 200:
            print(f"[!] Failed to log to server: {response.text}")
    except Exception as e:
        print(f"[ERROR] Backend log failed: {e}")
