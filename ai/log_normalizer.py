import pymongo
import json
import datetime
from bson import json_util
import pandas as pd
import os

# ---------- Configuration ----------
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "edr_logs"
OUTPUT_JSON_PATH = "D:/CyberSecurity-Learning-Materials/EDR project/logs/normalized_logs.json"
OUTPUT_CSV_PATH = OUTPUT_JSON_PATH.replace(".json", ".csv")

# ---------- Collection Map ----------
collection_modules = {
    "logic_bomb_logs": "logic_bomb",
    "process_logs": "process_monitor",
    "file_logs": "file_monitor",
    "autorun_logs": "autorun_monitor",
    "network_logs": "network_monitor",
    "usb_logs": "usb_monitor",
    "yara_scan_logs": "yara_scan",
    "process_tree_logs": "process_tree",
    "download_logs": "download",
    "severity_score_logs": "severity_score"
}

# ---------- Connect MongoDB ----------
client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

# ---------- Normalizer ----------
def normalize_document(doc, module):
    features = {
        "process_name": None,
        "parent_process": None,
        "pid": None,
        "cpu": None,
        "uptime": None,
        "duration": None,
        "filename": None,
        "hash": None,
        "registry_key": None,
        "ip": None,
        "domain": None,
        "asn": None,
        "country": None,
        "score": None  # will become features.score
    }

    data = doc.get("data", {})

    # Map severity → features.score (prefer nested data.severity since server nests fields)
    sev = data.get("severity", None)
    if sev is None:
        sev = doc.get("severity", None)
    features["score"] = sev
    features["timestamp"] = doc.get("timestamp", str(datetime.datetime.utcnow()))

    # Module-specific logic
    if module == "logic_bomb":
        features["process_name"] = data.get("name")
        features["cpu"] = data.get("cpu")
        features["uptime"] = data.get("uptime")
        features["duration"] = data.get("duration")
        # keep features.score as set above
        

    elif module == "process_monitor":
        features["process_name"] = data.get("name") or data.get("process_name")
        features["parent_process"] = data.get("parent")

    elif module == "file_monitor":
        features["filename"] = data.get("file") or data.get("filename") or data.get("path")
        features["hash"] = data.get("hash")

    elif module == "autorun_monitor":
        features["registry_key"] = data.get("value")

    elif module == "network_monitor":
        features["ip"] = (data.get("remote_addr", ":").split(":")[0]
                           if isinstance(data.get("remote_addr"), str) else data.get("ip"))
        features["domain"] = data.get("domain")
        features["asn"] = data.get("asn")
        features["country"] = data.get("country")

    # Ensure label is same as score
    label_value = features["score"]

    return {
        "event_type": doc.get("event_type") or doc.get("event") or "unknown",
        "module": module,
        "timestamp": doc.get("timestamp", str(datetime.datetime.utcnow())),
        "features": features,
        "label": label_value
    }

# ---------- Main Routine ----------
def run_normalizer():
    all_logs = []

    for collection_name, module in collection_modules.items():
        collection = db[collection_name]
        docs = collection.find()

        doc_count = 0
        for doc in docs:
            normalized = normalize_document(doc, module)
            all_logs.append(normalized)
            doc_count += 1

        print(f"[✓] Processed {doc_count} docs from {collection_name}")

    # Save structured JSON logs
    with open(OUTPUT_JSON_PATH, "w") as f:
        json.dump(all_logs, f, indent=4, default=json_util.default)
    print(f"[✓] Saved normalized logs to JSON: {OUTPUT_JSON_PATH}")

    # --------- Save Flattened CSV --------- #
    flattened = []
    for entry in all_logs:
        flat = {
            "event_type": entry["event_type"],
            "module": entry["module"],
            "timestamp": entry["timestamp"],
            "label": entry["label"]  # keep label as a separate column
        }
        flat.update({f"features.{k}": v for k, v in entry["features"].items()})
        flattened.append(flat)

    df = pd.DataFrame(flattened)
    os.makedirs(os.path.dirname(OUTPUT_CSV_PATH), exist_ok=True)
    df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"[✓] Saved flattened logs to CSV: {OUTPUT_CSV_PATH}")

if __name__ == "__main__":
    run_normalizer()
