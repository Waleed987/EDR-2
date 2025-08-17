#!/usr/bin/env python3
"""
Complete AI Training Pipeline
This script performs the entire ML pipeline when started from the Process Control Panel:
1. Log Normalization (from raw logs)
2. Feature Extraction
3. Data Preparation
4. Model Training
5. Model Evaluation
"""

import os
import sys
import time
import json
import pandas as pd
from datetime import datetime

# Add the project root to the path so we can import modules
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

def print_step(step, message):
    """Print a formatted step message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] 🤖 STEP {step}: {message}")

def print_progress(message):
    """Print a progress message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] ⚙️  {message}")

def print_success(message):
    """Print a success message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] ✅ {message}")

def print_error(message):
    """Print an error message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] ❌ {message}")

def normalize_json_logs():
    """
    Step 1: Normalize logs from JSON files in the logs directory
    This replaces the MongoDB-based log_normalizer.py with a file-based approach
    """
    print_step(1, "NORMALIZING LOGS FROM JSON FILES")
    
    logs_dir = os.path.join(project_root, "logs")
    output_path = os.path.join(logs_dir, "normalized_logs.csv")
    
    # Log file mappings
    log_files = {
        "endpoint_logs.json": "endpoint_monitor",
        "severity_scores.json": "severity_score",
        "process_tree_logs.json": "process_tree",
        "downloads_log.json": "download"
    }
    
    all_normalized = []
    
    for filename, module in log_files.items():
        filepath = os.path.join(logs_dir, filename)
        
        if not os.path.exists(filepath):
            print_progress(f"⚠️  {filename} not found, skipping...")
            continue
            
        print_progress(f"Processing {filename}...")
        
        try:
            with open(filepath, 'r') as f:
                log_count = 0
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        log_entry = json.loads(line)
                        normalized = normalize_log_entry(log_entry, module)
                        if normalized:
                            all_normalized.append(normalized)
                            log_count += 1
                    except json.JSONDecodeError:
                        continue
                
                print_progress(f"  → Processed {log_count} entries from {filename}")
                
        except Exception as e:
            print_error(f"Error processing {filename}: {e}")
            continue
    
    if not all_normalized:
        print_error("No valid log entries found! Make sure log files exist and contain data.")
        return False
    
    # Convert to DataFrame and save
    df = pd.DataFrame(all_normalized)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print_success(f"Normalized {len(all_normalized)} log entries → {output_path}")
    return True

def normalize_log_entry(log_entry, module):
    """Normalize a single log entry based on its module type"""
    
    features = {
        "process_name": None,
        "parent_process": None,
        "pid": None,
        "cpu": None,
        "uptime": None,
        "duration": None,
        "filename": None,
        "hash": None,
        "registry_key": None,
        "ip": None,
        "domain": None,
        "asn": None,
        "country": None,
        "score": None
    }
    
    # Extract data from different log structures
    data = log_entry.get("data", {})
    details = log_entry.get("details", {})
    
    # Handle severity/score
    severity = (log_entry.get("severity") or 
                log_entry.get("score") or 
                data.get("severity") or 
                data.get("score") or
                details.get("severity") or
                details.get("score"))
    features["score"] = severity
    
    # Module-specific extraction
    if module == "endpoint_monitor":
        features["process_name"] = (details.get("name") or 
                                   data.get("name") or 
                                   data.get("process_name"))
        features["pid"] = details.get("pid") or data.get("pid")
        features["ip"] = (details.get("remote_addr", ":").split(":")[0] if 
                         details.get("remote_addr") else None)
        
    elif module == "process_tree":
        features["process_name"] = data.get("name") or data.get("process_name")
        features["parent_process"] = data.get("parent")
        features["pid"] = data.get("pid")
        
    elif module == "download":
        features["filename"] = (data.get("filename") or 
                               data.get("file") or 
                               log_entry.get("filename"))
        features["hash"] = data.get("hash")
        
    elif module == "severity_score":
        # These are already processed scores
        features["score"] = log_entry.get("score") or log_entry.get("severity")
    
    # Only return entries with some meaningful data
    if any(v is not None for v in features.values()) or severity is not None:
        return {
            "event_type": (log_entry.get("event_type") or 
                          log_entry.get("event") or 
                          "unknown"),
            "module": module,
            "timestamp": log_entry.get("timestamp") or log_entry.get("time"),
            **{f"features.{k}": v for k, v in features.items()},
            "label": severity or 1  # Default to low severity if none specified
        }
    
    return None

def extract_features():
    """Step 2: Extract and process features from normalized logs"""
    print_step(2, "EXTRACTING FEATURES")
    
    try:
        from ai.feature_extractor import extract_features as extract_features_func
        print_progress("Running feature extraction...")
        X, y = extract_features_func()
        
        if X is not None and y is not None:
            print_success(f"Extracted {X.shape[0]} samples with {X.shape[1]} features")
            return True
        else:
            print_error("Feature extraction failed")
            return False
    except Exception as e:
        print_error(f"Feature extraction error: {e}")
        return False

def prepare_data():
    """Step 3: Prepare data for training"""
    print_step(3, "PREPARING DATA FOR TRAINING")
    
    try:
        # First clean the data to handle classes with too few samples
        normalized_csv = os.path.join(project_root, "logs", "normalized_logs.csv")
        df = pd.read_csv(normalized_csv)
        
        print_progress("Cleaning data for training...")
        
        # Clean labels
        if "label" not in df.columns and "features.score" in df.columns:
            df["label"] = df["features.score"].fillna(1)
        
        df["label"] = df["label"].replace("", pd.NA)
        df = df.dropna(subset=["label"])
        df["label"] = pd.to_numeric(df["label"], errors="coerce")
        df = df.dropna(subset=["label"])
        
        # Check class distribution and remove classes with too few samples
        label_counts = df["label"].value_counts()
        print_progress(f"Label distribution: {dict(label_counts)}")
        
        # Remove classes with less than 2 samples (needed for stratified split)
        valid_labels = label_counts[label_counts >= 2].index
        df_filtered = df[df["label"].isin(valid_labels)]
        
        if len(df_filtered) < len(df):
            removed_count = len(df) - len(df_filtered)
            print_progress(f"⚠️  Removed {removed_count} samples with rare labels for stable training")
        
        # Save cleaned data back
        df_filtered.to_csv(normalized_csv, index=False)
        
        # Now run data preparation
        from ai.data_prep import prepare_data as prep_func
        print_progress("Preparing train/validation/test splits...")
        splits = prep_func()
        
        print_success(f"Data prepared - Train: {len(splits['X_train'])}, "
                     f"Valid: {len(splits['X_valid'])}, Test: {len(splits['X_test'])}")
        return splits
    except Exception as e:
        print_error(f"Data preparation error: {e}")
        import traceback
        traceback.print_exc()
        return None

def train_model(splits):
    """Step 4: Train the machine learning model"""
    print_step(4, "TRAINING MACHINE LEARNING MODEL")
    
    try:
        from ai.train_baseline import train_and_evaluate
        print_progress("Training RandomForest classifier...")
        
        # Override the prepare_data call in train_baseline to use our splits
        import ai.train_baseline as baseline_module
        original_prepare_data = baseline_module.prepare_data
        baseline_module.prepare_data = lambda: splits
        
        model_path = train_and_evaluate()
        
        # Restore original function
        baseline_module.prepare_data = original_prepare_data
        
        print_success(f"Model training completed → {model_path}")
        return True
    except Exception as e:
        print_error(f"Model training error: {e}")
        import traceback
        traceback.print_exc()
        return False

def optimize_model():
    """Step 5: Optimize model with hyperparameter tuning"""
    print_step(5, "OPTIMIZING MODEL (OPTIONAL)")
    
    try:
        print_progress("Running hyperparameter optimization...")
        
        # Check if optimize_model.py exists
        optimize_script = os.path.join(project_root, "ai", "optimize_model.py")
        if os.path.exists(optimize_script):
            from ai.optimize_model import main as optimize_main
            optimize_main()
            print_success("Model optimization completed")
        else:
            print_progress("⚠️  optimize_model.py not found, skipping optimization")
        
        return True
    except Exception as e:
        print_progress(f"⚠️  Optimization failed (non-critical): {e}")
        return True  # Non-critical failure

def main():
    """Main training pipeline"""
    import time
    start_time = time.time()
    
    print("=" * 80)
    print("🤖 EDR AI TRAINING PIPELINE STARTED")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Step 1: Normalize logs
        if not normalize_json_logs():
            print_error("Pipeline failed at log normalization step")
            return False
        
        print()
        
        # Step 2: Extract features
        if not extract_features():
            print_error("Pipeline failed at feature extraction step")
            return False
        
        print()
        
        # Step 3: Prepare data
        splits = prepare_data()
        if splits is None:
            print_error("Pipeline failed at data preparation step")
            return False
        
        print()
        
        # Step 4: Train model
        if not train_model(splits):
            print_error("Pipeline failed at model training step")
            return False
        
        print()
        
        # Step 5: Optimize model (optional)
        optimize_model()
        
        # Success!
        elapsed = time.time() - start_time
        print()
        print("=" * 80)
        print("🎉 AI TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print(f"Total time: {elapsed:.1f} seconds")
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("📂 Generated files:")
        print("   • logs/normalized_logs.csv (normalized training data)")
        print("   • dataset/features.csv (processed features)")
        print("   • dataset/labels.csv (target labels)")
        print("   • dataset/train.csv, valid.csv, test.csv (data splits)")
        print("   • models/baseline_model.joblib (trained model)")
        print("   • models/optimized_model.joblib (optimized model, if applicable)")
        print()
        print("✅ Your EDR system is now ready with updated ML models!")
        print()
        print("🔄 Console will remain open for 30 seconds...")
        print("Press Ctrl+C to close immediately, or wait for auto-close.")
        
        # Keep console open for a while so user can see results
        try:
            for i in range(30, 0, -1):
                print(f"⏱️  Auto-closing in {i} seconds...", end="\r")
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Process interrupted by user.")
        
        print("\n🚪 Console closing...")
        return True
        
    except KeyboardInterrupt:
        print_error("Pipeline interrupted by user")
        return False
    except Exception as e:
        print_error(f"Unexpected error in pipeline: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = main()
        if not success:
            print("\n" + "="*80)
            print("❌ PIPELINE FAILED!")
            print("="*80)
            print("🔄 Console will remain open for 60 seconds to review errors...")
            print("Press Ctrl+C to close immediately.")
            
            # Keep console open longer on failure
            try:
                for i in range(60, 0, -1):
                    print(f"⏱️  Auto-closing in {i} seconds...", end="\r")
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n👋 Process interrupted by user.")
            
            print("\n🚪 Console closing...")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        print("\n🔄 Console will remain open for 120 seconds to review errors...")
        print("Press Ctrl+C to close immediately.")
        
        # Keep console open even longer on critical error
        try:
            for i in range(120, 0, -1):
                print(f"⏱️  Auto-closing in {i} seconds...", end="\r")
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Process interrupted by user.")
        
        print("\n🚪 Console closing...")
        sys.exit(1)
