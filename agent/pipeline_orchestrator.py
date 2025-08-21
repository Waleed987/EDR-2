#!/usr/bin/env python3
"""
Pipeline Orchestrator for EDR AI Training Pipeline
This script runs the complete AI training pipeline in sequence:
1. Log Normalizer
2. Feature Extractor  
3. Data Preparation
4. Baseline Training
5. Model Optimization
6. Monitor
"""

import subprocess
import sys
import time
import os
from pathlib import Path

# Set console encoding for Windows compatibility
if sys.platform == "win32":
    import os
    os.environ['PYTHONIOENCODING'] = 'utf-8'

def run_command(command, description, background=False):
    """
    Run a command and wait for it to complete (or start in background)
    
    Args:
        command (str): The command to run
        description (str): Description of what's being executed
        background (bool): If True, start in background and don't wait
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"[EXECUTING] {description}")
    print(f"[COMMAND] {command}")
    if background:
        print(f"[BACKGROUND] Starting in background (will not wait for completion)")
    print(f"{'='*60}")
    
    try:
        if background:
            # Start command in background with real-time output display
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=None,  # Use parent's stdout for real-time display
                stderr=None,  # Use parent's stderr for real-time display
                cwd=Path(__file__).parent.parent  # Set working directory to project root
            )
            print(f"[SUCCESS] {description} started in background with PID: {process.pid}")
            print(f"[INFO] Monitor is now running and will show output continuously...")
            print(f"[INFO] To stop the monitor, use: taskkill /PID {process.pid}")
            return True
        else:
            # Run command and wait for completion
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent  # Set working directory to project root
            )
            
            if result.returncode == 0:
                print(f"[SUCCESS] {description} completed successfully!")
                if result.stdout:
                    print("[OUTPUT]")
                    print(result.stdout)
            else:
                print(f"[ERROR] {description} failed with return code {result.returncode}")
                if result.stderr:
                    print("[ERROR OUTPUT]")
                    print(result.stderr)
                return False
                
    except Exception as e:
        print(f"[EXCEPTION] Failed to run {description}: {str(e)}")
        return False
    
    return True

def main():
    """Main orchestration function"""
    print("[PIPELINE] EDR AI Training Pipeline Orchestrator")
    print("[START] Starting complete pipeline execution...")
    
    # Define the pipeline steps
    pipeline_steps = [
        {
            "command": "python ai/log_normalizer.py",
            "description": "Log Normalization",
            "background": False
        },
        {
            "command": "python ai/feature_extractor.py", 
            "description": "Feature Extraction",
            "background": False
        },
        {
            "command": "python ai/data_prep.py",
            "description": "Data Preparation",
            "background": False
        },
        {
            "command": "python ai/train_baseline.py",
            "description": "Baseline Model Training",
            "background": False
        },
        {
            "command": "python ai/optimize_model.py",
            "description": "Model Optimization",
            "background": False
        },
        {
            "command": "python agent/monitor.py",
            "description": "EDR Monitor",
            "background": True
        }
    ]
    
    # Execute each step in sequence
    for i, step in enumerate(pipeline_steps, 1):
        print(f"\n[STEP] {i}/{len(pipeline_steps)}: {step['description']}")
        
        success = run_command(step['command'], step['description'], step['background'])
        
        if not success:
            print(f"\n[FAILED] Pipeline failed at step {i}: {step['description']}")
            print("[STOP] Stopping pipeline execution.")
            sys.exit(1)
        
        # Add a small delay between steps for better visibility
        if i < len(pipeline_steps):
            print(f"\n[WAIT] Waiting 2 seconds before next step...")
            time.sleep(2)
    
    print(f"\n[SUCCESS] PIPELINE COMPLETED SUCCESSFULLY!")
    print("[READY] All AI training and monitoring components are now running.")
    print("[STATUS] The EDR system is ready for operation.")

if __name__ == "__main__":
    main()
