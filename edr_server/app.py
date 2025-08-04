from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sys
import os

from modules.mongo_writer import insert_log, get_download_logs

# Flask setup
app = Flask(__name__)
CORS(app)



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

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

if __name__ == "__main__":
    print("[*] EDR Backend API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000 )
