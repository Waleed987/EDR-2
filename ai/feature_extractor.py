import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
import os

# ------------------ CONFIG ------------------ #
NORMALIZED_CSV_PATH = "D:/CyberSecurity-Learning-Materials/EDR project/logs/normalized_logs.csv"
FEATURE_OUTPUT_PATH = "dataset/features.csv"
LABEL_OUTPUT_PATH = "dataset/labels.csv"

def extract_features(csv_path=NORMALIZED_CSV_PATH):
    try:
        df = pd.read_csv(csv_path)

        if df.empty:
            print("[!] No data found in normalized log file.")
            return None, None

        # ------------------ Adjusted Feature Names ------------------ #
        feature_cols = [
            'features.score',
            'event_type',
            'features.cpu', 'features.uptime', 'features.duration',
            'features.port', 'features.is_external_ip', 'features.is_suspicious_ip',
            'features.parent_process', 'features.process_name'
        ]
        available_cols = [col for col in feature_cols if col in df.columns]
        df = df[available_cols]

        # Drop fully empty columns (fixes sklearn warnings)
        df = df.dropna(axis=1, how='all')

        # Separate labels
        y = df['features.score'] if 'features.score' in df.columns else None

        # Categorical vs numeric
        categorical_cols = [col for col in ['event_type', 'features.parent_process', 'features.process_name'] if col in df.columns]
        numeric_cols = [col for col in df.columns if col not in categorical_cols and col != 'features.score']

        # ------------------ Impute numeric ------------------ #
        if numeric_cols:
            imputer = SimpleImputer(strategy="mean")
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

        # Combine features
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
        return None, None


# ------------------ RUN ------------------ #
if __name__ == "__main__":
    X, y = extract_features()
