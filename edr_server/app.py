from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sys
import os
import json
import subprocess
import psutil
import signal
import time
import threading

from modules.mongo_writer import insert_log, get_download_logs

# Flask setup
app = Flask(__name__)
CORS(app)

# Path to logs directory
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')

# Process management
PROCESS_STORE = {}
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))

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

# Process management functions
def get_process_info(pid):
    """Get process information by PID"""
    try:
        process = psutil.Process(pid)
        return {
            'pid': pid,
            'status': process.status(),
            'create_time': process.create_time(),
            'uptime': time.time() - process.create_time()
        }
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return None

def format_uptime(seconds):
    """Format uptime in human readable format"""
    hours, remainder = divmod(int(seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    elif minutes > 0:
        return f"{minutes}m {seconds}s"
    else:
        return f"{seconds}s"

def start_process_internal(process_name):
    """Start a specific process"""
    commands = {
        'monitor': {
            'cmd': ['python', 'agent/monitor.py'],
            'cwd': PROJECT_ROOT,
            'description': 'EDR Monitor Agent',
            'show_console': True
        },
        'ai_training': {
            'cmd': ['python', 'ai/test_console.py'],
            'cwd': PROJECT_ROOT,
            'description': 'AI Training Test',
            'show_console': True
        }
    }
    
    if process_name not in commands:
        return {'success': False, 'error': f'Unknown process: {process_name}'}
    
    # Check if process is already running
    if process_name in PROCESS_STORE and PROCESS_STORE[process_name]['process'].poll() is None:
        return {'success': False, 'error': f'Process {process_name} is already running'}
    
    try:
        cmd_config = commands[process_name]
        
        # Create process with visible console window
        if cmd_config.get('show_console', False) and os.name == 'nt':
            # Windows: Create new console window
            process = subprocess.Popen(
                cmd_config['cmd'],
                cwd=cmd_config['cwd'],
                creationflags=subprocess.CREATE_NEW_CONSOLE,
                stdout=None,
                stderr=None
            )
        else:
            # Fallback: capture output for logging
            process = subprocess.Popen(
                cmd_config['cmd'],
                cwd=cmd_config['cwd'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
        
        PROCESS_STORE[process_name] = {
            'process': process,
            'start_time': time.time(),
            'description': cmd_config['description'],
            'logs': []
        }
        
        return {'success': True, 'pid': process.pid}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def stop_process_internal(process_name):
    """Stop a specific process"""
    if process_name not in PROCESS_STORE:
        return {'success': False, 'error': f'Process {process_name} not found'}
    
    try:
        process = PROCESS_STORE[process_name]['process']
        if process.poll() is None:  # Process is still running
            process.terminate()
            # Wait for graceful termination
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()  # Force kill if doesn't terminate gracefully
        
        del PROCESS_STORE[process_name]
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# API endpoints for process management
@app.route("/api/processes/status", methods=["GET"])
def get_process_status():
    """Get status of all managed processes"""
    status = {
        'backend': {
            'status': 'running',  # Backend is running if this endpoint responds
            'pid': os.getpid(),
            'uptime': format_uptime(time.time() - psutil.Process().create_time())
        },
        'monitor': {'status': 'stopped', 'pid': None, 'uptime': None},
        'ai_training': {'status': 'stopped', 'pid': None, 'uptime': None}
    }
    
    # Check managed processes
    for process_name, process_info in PROCESS_STORE.items():
        process = process_info['process']
        if process.poll() is None:  # Process is running
            uptime = time.time() - process_info['start_time']
            status[process_name] = {
                'status': 'running',
                'pid': process.pid,
                'uptime': format_uptime(uptime)
            }
        else:
            status[process_name] = {
                'status': 'stopped',
                'pid': None,
                'uptime': None
            }
    
    return jsonify(status), 200

@app.route("/api/processes/start", methods=["POST"])
def start_process():
    """Start a process"""
    data = request.get_json()
    process_name = data.get('process')
    
    if not process_name:
        return jsonify({'error': 'Process name is required'}), 400
    
    if process_name == 'backend':
        return jsonify({'error': 'Backend server is already running'}), 400
    
    result = start_process_internal(process_name)
    
    if result['success']:
        return jsonify({'message': f'Process {process_name} started successfully', 'pid': result['pid']}), 200
    else:
        return jsonify({'error': result['error']}), 500

@app.route("/api/processes/stop", methods=["POST"])
def stop_process():
    """Stop a process"""
    data = request.get_json()
    process_name = data.get('process')
    
    if not process_name:
        return jsonify({'error': 'Process name is required'}), 400
    
    if process_name == 'backend':
        return jsonify({'error': 'Cannot stop backend server from API'}), 400
    
    result = stop_process_internal(process_name)
    
    if result['success']:
        return jsonify({'message': f'Process {process_name} stopped successfully'}), 200
    else:
        return jsonify({'error': result['error']}), 500

@app.route("/api/processes/restart", methods=["POST"])
def restart_process():
    """Restart a process"""
    data = request.get_json()
    process_name = data.get('process')
    
    if not process_name:
        return jsonify({'error': 'Process name is required'}), 400
    
    if process_name == 'backend':
        return jsonify({'error': 'Cannot restart backend server from API'}), 400
    
    # Stop the process first
    stop_result = stop_process_internal(process_name)
    
    # Wait a moment for cleanup
    time.sleep(1)
    
    # Start the process again
    start_result = start_process_internal(process_name)
    
    if start_result['success']:
        return jsonify({'message': f'Process {process_name} restarted successfully', 'pid': start_result['pid']}), 200
    else:
        return jsonify({'error': f'Failed to restart {process_name}: {start_result["error"]}'}), 500

@app.route("/api/processes/logs/<process_name>", methods=["GET"])
def get_process_logs(process_name):
    """Get logs for a specific process"""
    # This is a placeholder - in a real implementation, you'd read actual process logs
    return jsonify({
        'process': process_name,
        'logs': f'Logs for {process_name} would be displayed here.\nThis feature can be enhanced to read actual log files.'
    }), 200

# YARA Scanner API endpoints
@app.route("/api/yara/logs", methods=["GET"])
def get_yara_logs():
    """Get YARA scan results"""
    try:
        yara_log_file = os.path.join(LOGS_DIR, 'yara_logs.json')
        if os.path.exists(yara_log_file):
            with open(yara_log_file, 'r') as f:
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

@app.route("/api/yara/rules", methods=["GET"])
def get_yara_rules():
    """Get available YARA rules"""
    try:
        rules_dir = os.path.join(PROJECT_ROOT, 'agent', 'yara_rules')
        rules = []
        if os.path.exists(rules_dir):
            for filename in os.listdir(rules_dir):
                if filename.endswith('.yar') or filename.endswith('.yara'):
                    rule_path = os.path.join(rules_dir, filename)
                    try:
                        with open(rule_path, 'r') as f:
                            content = f.read()
                            rules.append({
                                'filename': filename,
                                'path': rule_path,
                                'size': os.path.getsize(rule_path),
                                'modified': datetime.fromtimestamp(os.path.getmtime(rule_path)).isoformat(),
                                'content_preview': content[:200] + "..." if len(content) > 200 else content
                            })
                    except Exception as e:
                        rules.append({
                            'filename': filename,
                            'path': rule_path,
                            'error': str(e)
                        })
        return jsonify(rules), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# VirusTotal API endpoints
@app.route("/api/virustotal/results", methods=["GET"])
def get_virustotal_results():
    """Get VirusTotal scan results"""
    try:
        vt_results_file = os.path.join(PROJECT_ROOT, 'detections_api', 'logs', 'vt_results.json')
        if os.path.exists(vt_results_file):
            with open(vt_results_file, 'r') as f:
                results = json.load(f)
                return jsonify(results), 200
        return jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/virustotal/scan", methods=["POST"])
def trigger_virustotal_scan():
    """Trigger VirusTotal scan"""
    try:
        # Run the VT checker script
        vt_script_path = os.path.join(PROJECT_ROOT, 'detections_api', 'vt_checker.py')
        result = subprocess.run(['python', vt_script_path], 
                              capture_output=True, text=True, timeout=300)
        
        return jsonify({
            'status': 'completed',
            'stdout': result.stdout,
            'stderr': result.stderr,
            'return_code': result.returncode
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Scan timeout after 5 minutes'}), 408
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# AI/ML Model API endpoints
@app.route("/api/ai/models", methods=["GET"])
def get_ai_models():
    """Get AI model information"""
    try:
        models_dir = os.path.join(PROJECT_ROOT, 'models')
        ai_models_dir = os.path.join(PROJECT_ROOT, 'ai', 'models')
        
        models = []
        
        # Check both model directories
        for models_path in [models_dir, ai_models_dir]:
            if os.path.exists(models_path):
                for filename in os.listdir(models_path):
                    if filename.endswith('.joblib'):
                        model_path = os.path.join(models_path, filename)
                        stat = os.stat(model_path)
                        models.append({
                            'name': filename,
                            'path': model_path,
                            'size': stat.st_size,
                            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            'type': 'baseline' if 'baseline' in filename else 'optimized' if 'optimized' in filename else 'unknown'
                        })
        
        return jsonify(models), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ai/train", methods=["POST"])
def trigger_ai_training():
    """Trigger AI model training"""
    try:
        training_script = os.path.join(PROJECT_ROOT, 'ai', 'complete_training_pipeline.py')
        
        # Start training in background
        process = subprocess.Popen(
            ['python', training_script],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Store process for monitoring
        PROCESS_STORE['ai_training_manual'] = {
            'process': process,
            'start_time': time.time(),
            'description': 'Manual AI Training',
            'logs': []
        }
        
        return jsonify({
            'status': 'started',
            'pid': process.pid,
            'message': 'AI training started in background'
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/ai/predictions", methods=["GET"])
def get_ai_predictions():
    """Get recent AI predictions from logs"""
    try:
        # Look for ML predictions in endpoint logs
        endpoint_logs = []
        log_file = os.path.join(LOGS_DIR, 'endpoint_logs.json')
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            # Look for logs with ML predictions
                            if ('ml_action' in log.get('data', {}) or 
                                'ml_confidence' in log.get('data', {})):
                                endpoint_logs.append(log)
                        except json.JSONDecodeError:
                            continue
        
        return jsonify(endpoint_logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Real-time Alerts API endpoints
@app.route("/api/alerts/high-severity", methods=["GET"])
def get_high_severity_alerts():
    """Get high severity alerts"""
    try:
        alerts = []
        
        # Check severity logs for high severity events
        severity_file = os.path.join(LOGS_DIR, 'severity_scores.json')
        if os.path.exists(severity_file):
            with open(severity_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            score = log.get('data', {}).get('score', 0)
                            if score >= 6:  # High severity threshold
                                alerts.append({
                                    **log,
                                    'alert_type': 'high_severity',
                                    'severity_level': 'critical' if score >= 8 else 'high'
                                })
                        except json.JSONDecodeError:
                            continue
        
        # Sort by timestamp (most recent first)
        alerts.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        return jsonify(alerts[:50]), 200  # Return latest 50 alerts
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/alerts/malware", methods=["GET"])
def get_malware_alerts():
    """Get malware detection alerts"""
    try:
        alerts = []
        
        # Check YARA logs
        yara_file = os.path.join(LOGS_DIR, 'yara_logs.json')
        if os.path.exists(yara_file):
            with open(yara_file, 'r') as f:
                for line in f:
                    if line.strip():
                        try:
                            log = json.loads(line.strip())
                            alerts.append({
                                **log,
                                'alert_type': 'malware_detection',
                                'source': 'yara'
                            })
                        except json.JSONDecodeError:
                            continue
        
        # Check VirusTotal results
        vt_file = os.path.join(PROJECT_ROOT, 'detections_api', 'logs', 'vt_results.json')
        if os.path.exists(vt_file):
            with open(vt_file, 'r') as f:
                try:
                    vt_results = json.load(f)
                    for result in vt_results:
                        if result.get('vt_result', {}).get('malicious_count', 0) > 0:
                            alerts.append({
                                'timestamp': result.get('timestamp'),
                                'event': 'Malware Detected',
                                'data': result,
                                'alert_type': 'malware_detection',
                                'source': 'virustotal'
                            })
                except json.JSONDecodeError:
                    pass
        
        return jsonify(alerts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

if __name__ == "__main__":
    print("[*] EDR Backend API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000 )
