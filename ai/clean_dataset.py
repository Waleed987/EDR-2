import os
import pandas as pd

def clean_dataset():
    """Clean up the existing dataset and regenerate clean files"""
    
    # Paths
    dataset_dir = "dataset"
    features_path = os.path.join(dataset_dir, "features.csv")
    labels_path = os.path.join(dataset_dir, "labels.csv")
    
    print("[+] Cleaning up existing dataset...")
    
    # Remove existing files if they exist
    for path in [features_path, labels_path]:
        if os.path.exists(path):
            os.remove(path)
            print(f"[+] Removed: {path}")
    
    # Check if normalized logs exist
    normalized_path = "C:/Users/pc/Desktop/EDR-2/logs/normalized_logs.csv"
    if not os.path.exists(normalized_path):
        print(f"[!] Normalized logs not found: {normalized_path}")
        print("[!] Please run: python ai/log_normalizer.py first")
        return
    
    print("[+] Regenerating clean dataset...")
    
    # Run feature extraction
    try:
        from feature_extractor import extract_features
        X, y = extract_features(normalized_path)
        
        if X is not None and y is not None:
            print(f"[+] Successfully generated clean dataset:")
            print(f"    Features: {X.shape[0]} rows, {X.shape[1]} columns")
            print(f"    Labels: {len(y)} samples")
            print(f"    Label distribution:\n{y.value_counts().sort_index()}")
        else:
            print("[!] Feature extraction failed")
            
    except Exception as e:
        print(f"[!] Error during feature extraction: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    clean_dataset() 