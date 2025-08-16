import os
import sys

# Configurable thresholds
LOW_THRESHOLD = 0.4
HIGH_THRESHOLD = 0.8

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        try:
            # Try to import the realtime inference module
            try:
                from ai.realtime_inference import RealTimePredictor
            except ImportError:
                # If that fails, try adding the project root to path
                ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
                if ROOT_DIR not in sys.path:
                    sys.path.insert(0, ROOT_DIR)
                from ai.realtime_inference import RealTimePredictor
            
            # Check if model file exists - look in ai/models relative to project root
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
            model_path = os.path.join(project_root, "ai", "models", "optimized_model.joblib")
            if not os.path.exists(model_path):
                print(f"[!] Model file not found: {model_path}")
                print("[!] Run the ML pipeline first: python ai/optimize_model.py")
                return None
            
            _predictor = RealTimePredictor(model_path)
            print("[+] Realtime ML model loaded successfully")
        except Exception as e:
            print(f"[!] Failed to load realtime model: {e}")
            print("[!] Agent will continue without ML predictions")
            _predictor = None
    return _predictor

def decide_action(module, event_type, data):
    predictor = get_predictor()
    if predictor is None:
        # Fallback to severity-based decision when ML is not available
        severity = data.get("severity", 0)
        if severity >= 8:
            return "block", severity / 10.0
        elif severity >= 5:
            return "alert", severity / 10.0
        else:
            return "log", severity / 10.0

    try:
        _, conf = predictor.predict_event(module, event_type, data)
    except Exception as e:
        print(f"[!] Realtime prediction failed: {e}")
        # Fallback to severity-based decision
        severity = data.get("severity", 0)
        if severity >= 8:
            return "block", severity / 10.0
        elif severity >= 5:
            return "alert", severity / 10.0
        else:
            return "log", severity / 10.0

    if conf >= HIGH_THRESHOLD:
        return "block", conf
    if conf >= LOW_THRESHOLD:
        return "alert", conf
    return "log", conf

