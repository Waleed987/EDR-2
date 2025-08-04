import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

# ---------- CONFIG ----------
FEATURES_PATH = "D:/CyberSecurity-Learning-Materials/EDR project/ai/dataset/features.csv"

# ---------- LOAD FEATURES ----------
try:
    df = pd.read_csv(FEATURES_PATH)

    if df.empty:
        print("[!] Feature file is empty.")
        exit()

    # ---------- CORRELATION MATRIX ----------
    corr = df.corr(numeric_only=True)
    threshold = 0.2
    filtered_corr = corr[(corr > threshold) | (corr < -threshold)].dropna(how='all').dropna(axis=1, how='all')


    # ---------- PLOT HEATMAP ----------
    plt.figure(figsize=(20, 16))  # Increase size
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", square=True, cbar_kws={"shrink": 0.8})

    plt.xticks(rotation=45, ha='right', fontsize=8)
    plt.yticks(rotation=0, fontsize=8)

    plt.title("Feature Correlation Heatmap", fontsize=14)
    plt.tight_layout()
    plt.show()

    print("meow")

except FileNotFoundError:
    print(f"[!] File not found: {FEATURES_PATH}")
except Exception as e:
    print(f"[!] Error: {e}")
