from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sys
import os
import json

from modules.mongo_writer import insert_log, get_download_logs

# Flask setup
app = Flask(__name__)
CORS(app)

# Path to logs directory
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')

@app.route("/log", methods=["POST"])
def receive_log():
    data = request.get_json()

    required_fields = ["module", "event", "data", "timestamp", "agent_ip", "agent_name"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    log_entry = {
        "agent_ip": data["agent_ip"],
        "agent_name": data["agent_name"],
        "module": data["module"],
        "event": data["event"],
        "data": data["data"],
        "timestamp": data["timestamp"]
    }

    result = insert_log(data["module"], log_entry)

    if result["status"] == "success":
        return jsonify({"status": "success", "id": result["id"]}), 200
    else:
        return jsonify({"status": "error", "message": result["message"]}), 500

@app.route("/download_logs", methods=["GET"])
def fetch_download_logs():
    logs = get_download_logs()
    return jsonify(logs), 200

@app.route("/api/logs/endpoint", methods=["GET"])
def get_endpoint_logs():
    """Get endpoint logs from the logs folder"""
    try:
        log_file = os.path.join(LOGS_DIR, 'endpoint_logs.json')
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = []
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs.append(log)
                        except json.JSONDecodeError:
                            continue
                return jsonify(logs), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/logs/severity", methods=["GET"])
def get_severity_logs():
    """Get severity score logs from the logs folder"""
    try:
        log_file = os.path.join(LOGS_DIR, 'severity_scores.json')
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = []
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs.append(log)
                        except json.JSONDecodeError:
                            continue
                return jsonify(logs), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/logs/process_tree", methods=["GET"])
def get_process_tree_logs():
    """Get process tree logs from the logs folder"""
    try:
        log_file = os.path.join(LOGS_DIR, 'process_tree_logs.json')
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = []
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs.append(log)
                        except json.JSONDecodeError:
                            continue
                return jsonify(logs), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/logs/downloads", methods=["GET"])
def get_download_logs_api():
    """Get download logs from the logs folder"""
    try:
        log_file = os.path.join(LOGS_DIR, 'downloads_log.json')
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = []
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs.append(log)
                        except json.JSONDecodeError:
                            continue
                return jsonify(logs), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/logs/all", methods=["GET"])
def get_all_logs():
    """Get all logs from the logs folder"""
    try:
        logs_data = {
            "endpoint": [],
            "severity": [],
            "processTree": [],
            "downloads": []
        }
        
        # Read endpoint logs
        endpoint_file = os.path.join(LOGS_DIR, 'endpoint_logs.json')
        if os.path.exists(endpoint_file):
            with open(endpoint_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs_data["endpoint"].append(log)
                        except json.JSONDecodeError:
                            continue
        
        # Read severity logs
        severity_file = os.path.join(LOGS_DIR, 'severity_scores.json')
        if os.path.exists(severity_file):
            with open(severity_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs_data["severity"].append(log)
                        except json.JSONDecodeError:
                            continue
        
        # Read process tree logs
        process_tree_file = os.path.join(LOGS_DIR, 'process_tree_logs.json')
        if os.path.exists(process_tree_file):
            with open(process_tree_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs_data["processTree"].append(log)
                        except json.JSONDecodeError:
                            continue
        
        # Read download logs
        downloads_file = os.path.join(LOGS_DIR, 'downloads_log.json')
        if os.path.exists(downloads_file):
            with open(downloads_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            logs_data["downloads"].append(log)
                        except json.JSONDecodeError:
                            continue
        
        return jsonify(logs_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

if __name__ == "__main__":
    print("[*] EDR Backend API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000 )
