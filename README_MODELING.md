# EDR ML Pipeline

## Overview
This pipeline integrates machine learning with the EDR agent for real-time threat detection. The system computes severity scores for all events and uses ML models to make intelligent decisions about actions (log, alert, or block).

## Workflow

### Phase 1: Data Preparation & Splitting
1. **Normalize logs**: Pull MongoDB logs into structured format
   ```bash
   python ai/log_normalizer.py
   ```

2. **Clean existing dataset** (if you have corrupted data):
   ```bash
   python ai/clean_dataset.py
   ```

3. **Extract features**: Generate clean features and labels
   ```bash
   python ai/feature_extractor.py
   ```

4. **Prepare splits**: Create train/validation/test sets
   ```bash
   python ai/data_prep.py
   ```

### Phase 2: Baseline Model
Train a baseline RandomForest and report metrics:
```bash
python ai/train_baseline.py
```

### Phase 3: Optimization
Grid search across multiple algorithms and save the best model:
```bash
python ai/optimize_model.py
```

### Phase 4: Real-time Inference
- The agent loads `models/optimized_model.joblib` via `agent/realtime_decision.py`
- Events are enriched with `ml_action` and `ml_confidence`
- Configure thresholds in `agent/realtime_decision.py`

## Important Notes

### Severity Integration
- **Severity is computed** in `agent/severity_scoring.py` and attached to all module events
- **All agent modules** now send severity scores to MongoDB
- **Server collections** should include: `*_logs` for process, file, network, autorun, usb, yara_scan, process_tree, download, and severity_score

### Model Loading
- **The agent will work without ML** - it falls back to severity-based decisions
- **ML model is optional** - the agent continues monitoring even if `optimized_model.joblib` is missing
- **To get the model**: Complete Phases 1-3 first

### Error Handling
- **Agent won't crash** if ML model is missing
- **Graceful fallback** to severity-based decisions
- **Clear error messages** guide you through the setup process

## Troubleshooting

### "Input y contains NaN" Error
This happens when labels contain empty strings. Fix by:
1. Run `python ai/clean_dataset.py` to regenerate clean data
2. Ensure normalized logs have valid severity scores

### "No such file or directory: models\\optimized_model.joblib"
This is expected until you complete the ML pipeline:
1. The agent works fine without it
2. Complete Phases 1-3 to generate the model
3. The agent will automatically load it when available

### Data Quality Issues
- Check that MongoDB has logs with severity scores
- Verify the normalizer is working correctly
- Use `clean_dataset.py` to regenerate corrupted files

