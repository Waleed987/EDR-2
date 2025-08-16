import os
import joblib
import pandas as pd
from sklearn.preprocessing import OneHotEncoder


MODEL_PATH = os.path.join("models", "optimized_model.joblib")


class RealTimePredictor:
    def __init__(self, model_path=MODEL_PATH):
        self.model = joblib.load(model_path)

    def preprocess_event(self, module, event_type, data):
        row = {
            "event_type": event_type,
            "module": module,
            "features.score": data.get("severity", 0),
            "features.cpu": data.get("cpu"),
            "features.uptime": data.get("uptime"),
            "features.duration": data.get("duration"),
            "features.filename": data.get("file") or data.get("filename") or data.get("path"),
            "features.hash": data.get("hash"),
            "features.registry_key": data.get("value"),
            "features.ip": (data.get("remote_addr", ":").split(":")[0] if isinstance(data.get("remote_addr"), str) else data.get("ip")),
            "features.domain": data.get("domain"),
            "features.asn": data.get("asn"),
            "features.country": data.get("country"),
            "features.parent_process": data.get("parent"),
            "features.process_name": data.get("name") or data.get("process_name")
        }
        return pd.DataFrame([row])

    def predict_event(self, module, event_type, data):
        X = self.preprocess_event(module, event_type, data)
        proba = None
        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(X)
            score = float(max(proba[0]))
        else:
            # Fallback to decision_function or dummy confidence
            score = 0.5
        pred = int(self.model.predict(X)[0])
        return pred, score


if __name__ == "__main__":
    rtp = RealTimePredictor()
    print(rtp.predict_event("process", "Process Created", {"name": "powershell.exe", "parent": "explorer.exe"}))

