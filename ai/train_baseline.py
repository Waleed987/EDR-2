import os
import joblib
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from data_prep import prepare_data


OUTPUT_DIR = "models"
BASELINE_MODEL_PATH = os.path.join(OUTPUT_DIR, "baseline_model.joblib")
PREPROCESSOR_PATH = os.path.join(OUTPUT_DIR, "preprocessor.joblib")


def build_model_pipeline(preprocessor):
    # Encoder for categoricals after imputation in preprocessor
    model = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
    pipe = Pipeline(steps=[
        ("prep", preprocessor),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ("model", model)
    ])
    return pipe


def train_and_evaluate():
    splits = prepare_data()
    X_train, y_train = splits["X_train"], splits["y_train"].astype(int)
    X_valid, y_valid = splits["X_valid"], splits["y_valid"].astype(int)
    preprocessor = splits["preprocessor"]

    # Note: ColumnTransformer already handles numeric/categorical; keep OneHot minimal if needed
    # Here we fit a simple model directly on preprocessed numerical + imputed categorical labels
    numeric = [c for c in X_train.columns if c not in ["event_type", "module", "features.parent_process", "features.process_name", "features.filename", "features.domain", "features.country", "features.hash", "features.registry_key", "features.ip"]]
    categorical = [c for c in X_train.columns if c not in numeric]

    # Additional check: ensure IP-like columns are treated as categorical
    for col in X_train.columns:
        if 'ip' in col.lower() and col in numeric:
            numeric.remove(col)
            if col not in categorical:
                categorical.append(col)

    model_pipeline = Pipeline(steps=[
        ("pre", ColumnTransformer([
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), numeric),
            ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("encode", OneHotEncoder(handle_unknown="ignore"))]), categorical)
        ])),
        ("clf", RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced"))
    ])

    model_pipeline.fit(X_train, y_train)
    preds = model_pipeline.predict(X_valid)
    acc = accuracy_score(y_valid, preds)
    precision, recall, f1, _ = precision_recall_fscore_support(y_valid, preds, average="weighted", zero_division=0)

    print("Accuracy:", acc)
    print("Precision:", precision)
    print("Recall:", recall)
    print("F1-Score:", f1)
    print("Confusion Matrix:\n", confusion_matrix(y_valid, preds))
    print("Classification Report:\n", classification_report(y_valid, preds, zero_division=0))

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(model_pipeline, BASELINE_MODEL_PATH)
    print(f"[+] Saved baseline model to {BASELINE_MODEL_PATH}")

    return BASELINE_MODEL_PATH


if __name__ == "__main__":
    train_and_evaluate()

