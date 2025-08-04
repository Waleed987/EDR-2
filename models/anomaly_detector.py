# anomaly_detector.py
import json
import ipaddress

# Load the trusted baseline file
def load_baseline(path="baseline.json"):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        print("[!] Failed to load baseline:", e)
        return {}

# Helper to check if IP belongs to trusted CIDR ranges
def is_ip_in_trusted_ranges(ip, ranges):
    try:
        ip_obj = ipaddress.ip_address(ip)
        return any(ip_obj in ipaddress.ip_network(rng) for rng in ranges)
    except:
        return False

# Main scoring function
def anomaly_score(event_type, data, baseline):
    score = 0

    if event_type == "Process Created":
        if data["name"] not in baseline.get("trusted_processes", []):
            score += 30
        if data["parent"] not in baseline.get("trusted_parents", []):
            score += 30

    elif event_type == "Network Connection":
        ip_part = data["remote_addr"].split(":")[0]
        port_part = int(data["remote_addr"].split(":")[1])

        if not is_ip_in_trusted_ranges(ip_part, baseline.get("trusted_ips", [])):
            score += 40
        if port_part not in baseline.get("trusted_ports", []):
            score += 20
        if data["process"] not in baseline.get("trusted_processes", []):
            score += 20

    elif event_type == "Autorun Entry Detected":
        for key in data.keys():
            if key not in baseline.get("trusted_autoruns", []):
                score += 50

    elif event_type == "Suspicious Behavior":
        score += 60

    return score

# Example usage (for testing or integration)
if __name__ == "__main__":
    baseline = load_baseline("baseline.json")

    sample_event = {
        "event_type": "Process Created",
        "data": {
            "name": "evilrat.exe",
            "parent": "cmd.exe"
        }
    }

    score = anomaly_score(sample_event["event_type"], sample_event["data"], baseline)
    print(f"[!] Anomaly Score: {score}")

    if score > 50:
        print("[ALERT] Possible malicious activity detected.")
