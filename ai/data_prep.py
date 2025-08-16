import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer


NORMALIZED_CSV_PATH = "D:/CyberSecurity-Learning-Materials/EDR project/logs/normalized_logs.csv"
OUTPUT_DIR = "dataset"


def prepare_data(csv_path=NORMALIZED_CSV_PATH):
    df = pd.read_csv(csv_path)
    if df.empty:
        raise ValueError("Normalized CSV is empty")

    print(f"[+] Loaded {len(df)} rows from normalized CSV")
    print(f"[+] Columns: {list(df.columns)}")

    # Identify features and label
    label_col = "label" if "label" in df.columns else None
    if label_col is None:
        # Backfill from severity
        if "features.score" in df.columns:
            df["label"] = df["features.score"].fillna(0)
            label_col = "label"
        else:
            raise ValueError("No label column present in normalized data")

    # Clean labels - remove empty strings and convert to numeric
    df[label_col] = df[label_col].replace("", pd.NA)
    df = df.dropna(subset=[label_col])
    df[label_col] = pd.to_numeric(df[label_col], errors='coerce')
    df = df.dropna(subset=[label_col])
    
    print(f"[+] After cleaning: {len(df)} rows with valid labels")
    print(f"[+] Label distribution:\n{df[label_col].value_counts().sort_index()}")

    # Select candidate feature columns
    feature_cols = [
        'event_type', 'module',
        'features.score', 'features.cpu', 'features.uptime', 'features.duration',
        'features.filename', 'features.hash', 'features.registry_key',
        'features.ip', 'features.domain', 'features.asn', 'features.country',
        'features.parent_process', 'features.process_name'
    ]
    available_cols = [c for c in feature_cols if c in df.columns]
    X = df[available_cols].copy()
    y = df[label_col].copy()

    # Split numeric vs categorical
    categorical = [c for c in X.columns if c in ["event_type", "module", "features.parent_process", "features.process_name", "features.filename", "features.domain", "features.country", "features.hash", "features.registry_key", "features.ip"] and c in X.columns]
    numeric = [c for c in X.columns if c not in categorical]
    
    # Additional check: ensure IP-like columns are treated as categorical
    for col in X.columns:
        if 'ip' in col.lower() and col in numeric:
            numeric.remove(col)
            if col not in categorical:
                categorical.append(col)

    # Build preprocessing pipeline
    numeric_tf = Pipeline(steps=[
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler())
    ])

    categorical_tf = Pipeline(steps=[
        ("impute", SimpleImputer(strategy="most_frequent"))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_tf, numeric),
            ("cat", categorical_tf, categorical)
        ],
        remainder="drop"
    )

    # Stratified split if label has reasonable distribution
    stratify = y if y.nunique() <= 20 and len(y) > 0 else None

    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=stratify)
    X_valid, X_test, y_valid, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=(y_temp if stratify is not None else None))

    print(f"[+] Split sizes - Train: {len(X_train)}, Valid: {len(X_valid)}, Test: {len(X_test)}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Save raw splits to CSV for transparency
    X_train.assign(label=y_train).to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
    X_valid.assign(label=y_valid).to_csv(os.path.join(OUTPUT_DIR, "valid.csv"), index=False)
    X_test.assign(label=y_test).to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)

    return {
        "X_train": X_train, "y_train": y_train,
        "X_valid": X_valid, "y_valid": y_valid,
        "X_test": X_test, "y_test": y_test,
        "preprocessor": preprocessor,
        "feature_names": list(X.columns)
    }


if __name__ == "__main__":
    prepare_data()

