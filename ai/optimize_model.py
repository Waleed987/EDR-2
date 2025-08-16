import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from data_prep import prepare_data
from sklearn.metrics import classification_report, accuracy_score


OUTPUT_DIR = "models"
OPT_MODEL_PATH = os.path.join(OUTPUT_DIR, "optimized_model.joblib")


def build_preprocess(X):
    numeric = [c for c in X.columns if c not in ["event_type", "module", "features.parent_process", "features.process_name", "features.filename", "features.domain", "features.country", "features.hash", "features.registry_key", "features.ip"]]
    categorical = [c for c in X.columns if c not in numeric]
    
    # Additional check: ensure IP-like columns are treated as categorical
    for col in X.columns:
        if 'ip' in col.lower() and col in numeric:
            numeric.remove(col)
            if col not in categorical:
                categorical.append(col)

    pre = ColumnTransformer([
        ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), numeric),
        ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), categorical)
    ])
    return pre


def optimize():
    splits = prepare_data()
    X_train, y_train = splits["X_train"], splits["y_train"].astype(int)
    X_valid, y_valid = splits["X_valid"], splits["y_valid"].astype(int)
    X_all = pd.concat([X_train, X_valid], axis=0)
    y_all = pd.concat([y_train, y_valid], axis=0)

    pre = build_preprocess(X_all)

    candidates = {
        "rf": (RandomForestClassifier(class_weight="balanced", random_state=42), {
            "clf__n_estimators": [200, 400, 600],
            "clf__max_depth": [None, 10, 20]
        }),
        "gb": (GradientBoostingClassifier(random_state=42), {
            "clf__n_estimators": [100, 200],
            "clf__learning_rate": [0.05, 0.1],
            "clf__max_depth": [3]
        }),
        "lr": (LogisticRegression(max_iter=200, class_weight="balanced"), {
            "clf__C": [0.1, 1.0, 10.0]
        }),
        "svc": (SVC(probability=True, class_weight="balanced"), {
            "clf__C": [0.5, 1.0, 2.0],
            "clf__kernel": ["rbf", "linear"]
        })
    }

    best_score = -1
    best_model = None
    best_name = None

    for name, (clf, grid) in candidates.items():
        pipe = Pipeline([("pre", pre), ("clf", clf)])
        search = GridSearchCV(pipe, grid, cv=5, n_jobs=-1, scoring="f1_weighted")
        search.fit(X_train, y_train)
        print(f"[+] {name} best params: {search.best_params_}, score: {search.best_score_}")
        if search.best_score_ > best_score:
            best_score = search.best_score_
            best_model = search.best_estimator_
            best_name = name

    # Finalize on combined train+valid, evaluate briefly
    best_model.fit(X_all, y_all)
    preds = best_model.predict(X_all)
    print("[✓] Final model:", best_name)
    print(classification_report(y_all, preds, zero_division=0))

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    joblib.dump(best_model, OPT_MODEL_PATH)
    print(f"[+] Saved optimized model to {OPT_MODEL_PATH}")

    return OPT_MODEL_PATH


if __name__ == "__main__":
    optimize()

