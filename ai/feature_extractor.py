import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
import os

# ------------------ CONFIG ------------------ #
NORMALIZED_CSV_PATH = "C:/Users/pc/Desktop/EDR-2/logs/normalized_logs.csv"
FEATURE_OUTPUT_PATH = "dataset/features.csv"
LABEL_OUTPUT_PATH = "dataset/labels.csv"

def extract_features(csv_path=NORMALIZED_CSV_PATH):
    try:
        df = pd.read_csv(csv_path)

        if df.empty:
            print("[!] No data found in normalized log file.")
            return None, None

        print(f"[+] Loaded {len(df)} rows from normalized CSV")
        print(f"[+] Available columns: {list(df.columns)}")

        # ------------------ Feature Names ------------------ #
        feature_cols = [
            'event_type', 'module',
            'features.score', 'features.cpu', 'features.uptime', 'features.duration',
            'features.port', 'features.is_external_ip', 'features.is_suspicious_ip',
            'features.parent_process', 'features.process_name',
            'features.filename', 'features.hash', 'features.registry_key',
            'features.ip', 'features.domain', 'features.asn', 'features.country'
        ]
        available_cols = [col for col in feature_cols if col in df.columns]
        df = df[available_cols]
        
        print(f"[+] Using {len(available_cols)} feature columns: {available_cols}")

        # Drop fully empty columns
        df = df.dropna(axis=1, how='all')
        print(f"[+] After dropping empty columns: {df.shape[1]} columns")

        # ------------------ Labels ------------------ #
        label_col = None
        if 'features.score' in df.columns:
            label_col = 'features.score'
        elif 'label' in df.columns:
            label_col = 'label'
        elif 'severity' in df.columns:
            label_col = 'severity'

        if label_col:
            y = df[label_col].copy()
            # Clean labels - remove empty strings and convert to numeric
            y = y.replace("", pd.NA)
            y = pd.to_numeric(y, errors='coerce')
            
            # Remove rows with invalid labels
            valid_mask = y.notna()
            df = df[valid_mask]
            y = y[valid_mask]
            
            print(f"[+] After cleaning labels: {len(df)} rows with valid labels")
            print(f"[+] Label distribution:\n{y.value_counts().sort_index()}")
            
            y = pd.Series(y, name="label")
        else:
            print("[!] No label column ('features.score', 'label', or 'severity') found.")
            y = None

        # ------------------ Split Categorical / Numeric ------------------ #
        categorical_cols = [col for col in ['event_type', 'module', 'features.parent_process', 'features.process_name', 'features.filename', 'features.domain', 'features.country', 'features.hash', 'features.registry_key', 'features.ip'] if col in df.columns]
        numeric_cols = [col for col in df.columns if col not in categorical_cols and col != label_col]
        
        # Additional check: ensure IP-like columns are treated as categorical
        for col in df.columns:
            if 'ip' in col.lower() and col in numeric_cols:
                numeric_cols.remove(col)
                if col not in categorical_cols:
                    categorical_cols.append(col)
        
        print(f"[+] Categorical columns: {categorical_cols}")
        print(f"[+] Numeric columns: {numeric_cols}")

        # ------------------ Impute numeric ------------------ #
        if numeric_cols:
            imputer = SimpleImputer(strategy="median")
            df_numeric = pd.DataFrame(imputer.fit_transform(df[numeric_cols]), columns=numeric_cols)
        else:
            df_numeric = pd.DataFrame()

        # ------------------ One-hot encode categoricals ------------------ #
        if categorical_cols:
            encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            encoded = encoder.fit_transform(df[categorical_cols])
            encoded_df = pd.DataFrame(encoded, columns=encoder.get_feature_names_out(categorical_cols))
        else:
            encoded_df = pd.DataFrame()

        # ------------------ Combine Features ------------------ #
        df_combined = pd.concat([df_numeric.reset_index(drop=True), encoded_df.reset_index(drop=True)], axis=1)

        # ------------------ Save ------------------ #
        os.makedirs(os.path.dirname(FEATURE_OUTPUT_PATH), exist_ok=True)
        df_combined.to_csv(FEATURE_OUTPUT_PATH, index=False)

        if y is not None:
            y.to_csv(LABEL_OUTPUT_PATH, index=False)

        print(f"[+] Saved features to {FEATURE_OUTPUT_PATH}")
        if y is not None:
            print(f"[+] Saved labels to {LABEL_OUTPUT_PATH}")
        print(f"[+] Extracted {df_combined.shape[0]} rows and {df_combined.shape[1]} features.")

        return df_combined, y

    except Exception as e:
        print("[!] Error during feature extraction:", e)
        import traceback
        traceback.print_exc()
        return None, None


# ------------------ RUN ------------------ #
if __name__ == "__main__":
    X, y = extract_features()
