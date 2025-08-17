# EDR Process Control Panel

## Overview

The Process Control Panel is a web-based interface that allows you to manage EDR system processes remotely without manually navigating to the backend and running commands manually.

## Features

### Process Management
- **Start/Stop/Restart** processes with a single click
- **Real-time status monitoring** of all EDR processes
- **Process information** including PID, uptime, and status
- **Action logging** to track all control operations

### Supported Processes

1. **Backend Server** (`edr_server/app.py`)
   - Flask API server that handles log collection
   - Runs on port 5000
   - Cannot be stopped from the control panel (for safety)

2. **EDR Monitor** (`agent/monitor.py`)
   - Main monitoring agent
   - Watches processes, network, files, and USB activity
   - Generates security logs in real-time

3. **AI Training** (`ai/train_baseline.py`)
   - Machine learning model training
   - Processes logs to improve threat detection
   - Can be run on-demand for model updates

## How to Access

1. **Start the dashboard** (if not already running):
   ```bash
   # Windows
   .\start_dashboard.ps1
   # or
   start_dashboard.bat
   ```

2. **Navigate to the frontend**: http://localhost:5173

3. **Access Process Control**: Click "Process Control" in the top-right corner of the Dashboard

## How to Use

### Starting a Process
1. Find the process card you want to start
2. Click the green "Start" button
3. The status will change to "Starting" then "Running"
4. Process information (PID, uptime) will be displayed

### Stopping a Process
1. Find the running process you want to stop
2. Click the red "Stop" button
3. The process will be gracefully terminated
4. Status will change to "Stopped"

### Restarting a Process
1. Click the blue "Restart" button on any process
2. The system will stop the process and start it again
3. Useful for applying configuration changes

### Viewing Logs
1. Click the "Logs" button on any process card
2. A modal will open showing process-specific logs
3. *Note: This feature is prepared for future implementation*

## System Requirements

### Backend Dependencies
Make sure these are installed in your Python environment:
```bash
pip install psutil>=5.9.0
```

### Process Control Features
- **Auto-refresh**: Status updates every 10 seconds
- **Real-time feedback**: Immediate status changes on actions
- **Error handling**: Clear error messages for failed operations
- **Safety measures**: Backend server cannot be stopped via API

## Troubleshooting

### Process Won't Start
1. Check if the process is already running
2. Verify that all dependencies are installed
3. Check the action logs for error messages
4. Ensure proper file permissions

### Process Won't Stop
1. The system will attempt graceful termination first
2. If graceful termination fails, force kill will be used
3. Check action logs for any error messages

### Backend Connection Issues
1. Ensure the backend server is running on port 5000
2. Check network connectivity
3. Verify CORS settings if accessing from different domain

## API Endpoints

The Process Control Panel uses these API endpoints:

- `GET /api/processes/status` - Get status of all processes
- `POST /api/processes/start` - Start a specific process
- `POST /api/processes/stop` - Stop a specific process  
- `POST /api/processes/restart` - Restart a specific process
- `GET /api/processes/logs/<process_name>` - Get process logs

## Security Considerations

- The backend server cannot be stopped via the API for safety
- Process operations require proper authentication (if implemented)
- All actions are logged for audit purposes
- Process termination uses graceful shutdown when possible

## Future Enhancements

- **Process log streaming**: Real-time log viewing
- **Process metrics**: CPU, memory usage monitoring
- **Scheduled operations**: Automatic restart schedules
- **Authentication**: User-based access control
- **Configuration management**: Process parameter editing
