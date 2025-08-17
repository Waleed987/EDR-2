import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Terminal, 
  Shield, 
  Monitor, 
  Brain, 
  Database,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Home,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

function ProcessControl() {
  const [processes, setProcesses] = useState({
    backend: { status: 'stopped', pid: null, uptime: null },
    monitor: { status: 'stopped', pid: null, uptime: null },
    ai_training: { status: 'stopped', pid: null, uptime: null }
  });
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'starting': return 'text-yellow-600 bg-yellow-100';
      case 'stopping': return 'text-orange-600 bg-orange-100';
      case 'error': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Status icon mapping
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-5 w-5" />;
      case 'stopped': return <XCircle className="h-5 w-5" />;
      case 'starting': return <Clock className="h-5 w-5 animate-spin" />;
      case 'stopping': return <Clock className="h-5 w-5 animate-spin" />;
      case 'error': return <AlertTriangle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  // Fetch process status
  const fetchProcessStatus = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.BASE}/api/processes/status`);
      setProcesses(response.data);
    } catch (error) {
      console.error('Error fetching process status:', error);
      // Keep current status if API call fails
    }
  };

  // Start a process
  const startProcess = async (processName) => {
    setLoading(true);
    addLog(`🚀 Starting ${processName} process...`, 'info');
    
    // Update status immediately to show starting
    setProcesses(prev => ({
      ...prev,
      [processName]: { ...prev[processName], status: 'starting' }
    }));
    
    try {
      const response = await axios.post(`${API_ENDPOINTS.BASE}/api/processes/start`, {
        process: processName
      });
      
      addLog(`✅ ${response.data.message} (PID: ${response.data.pid})`, 'success');
      
      // Fetch updated status after a delay
      setTimeout(fetchProcessStatus, 2000);
      
    } catch (error) {
      console.error(`Error starting ${processName}:`, error);
      addLog(`❌ Failed to start ${processName}: ${error.response?.data?.error || error.message}`, 'error');
      
      // Reset status on error
      setProcesses(prev => ({
        ...prev,
        [processName]: { ...prev[processName], status: 'stopped' }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Stop a process
  const stopProcess = async (processName) => {
    setLoading(true);
    addLog(`🛑 Stopping ${processName} process...`, 'info');
    
    // Update status immediately to show stopping
    setProcesses(prev => ({
      ...prev,
      [processName]: { ...prev[processName], status: 'stopping' }
    }));
    
    try {
      const response = await axios.post(`${API_ENDPOINTS.BASE}/api/processes/stop`, {
        process: processName
      });
      
      addLog(`✅ ${response.data.message}`, 'success');
      
      // Fetch updated status after a delay
      setTimeout(fetchProcessStatus, 2000);
      
    } catch (error) {
      console.error(`Error stopping ${processName}:`, error);
      addLog(`❌ Failed to stop ${processName}: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Restart a process
  const restartProcess = async (processName) => {
    setLoading(true);
    addLog(`🔄 Restarting ${processName} process...`, 'info');
    
    // Update status immediately to show restarting
    setProcesses(prev => ({
      ...prev,
      [processName]: { ...prev[processName], status: 'starting' }
    }));
    
    try {
      const response = await axios.post(`${API_ENDPOINTS.BASE}/api/processes/restart`, {
        process: processName
      });
      
      addLog(`✅ ${response.data.message} (PID: ${response.data.pid})`, 'success');
      
      // Fetch updated status after a delay
      setTimeout(fetchProcessStatus, 3000);
      
    } catch (error) {
      console.error(`Error restarting ${processName}:`, error);
      addLog(`❌ Failed to restart ${processName}: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add log entry
  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  // Fetch process logs
  const fetchProcessLogs = async (processName) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.BASE}/api/processes/logs/${processName}`);
      setSelectedProcess(processName);
      setShowLogs(true);
      // Handle process logs if needed
    } catch (error) {
      console.error(`Error fetching logs for ${processName}:`, error);
      addLog(`Failed to fetch logs for ${processName}`, 'error');
    }
  };

  // Auto-refresh status every 10 seconds
  useEffect(() => {
    fetchProcessStatus();
    const interval = setInterval(fetchProcessStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initial log
  useEffect(() => {
    addLog('Process Control Panel initialized', 'info');
  }, []);

  const processConfigs = {
    backend: {
      name: 'Backend Server',
      description: 'Flask API server that handles log collection and serves data to the dashboard',
      icon: <Database className="h-8 w-8" />,
      color: 'blue',
      details: 'Runs on port 5000, handles API endpoints for logs and process management',
      actions: ['Shows console output automatically', 'Cannot be stopped from here (safety)']
    },
    monitor: {
      name: 'EDR Monitor',
      description: 'Main monitoring agent that watches processes, network, files, and USB activity',
      icon: <Monitor className="h-8 w-8" />,
      color: 'green',
      details: 'Monitors system activities and generates security logs in real-time',
      actions: ['Opens in new console window', 'Shows real-time monitoring output', 'Generates log files in logs/ folder']
    },
    ai_training: {
      name: 'AI Training Pipeline',
      description: 'Complete ML pipeline: log normalization → feature extraction → training → optimization',
      icon: <Brain className="h-8 w-8" />,
      color: 'purple',
      details: 'Runs the full AI pipeline from raw logs to trained models with real-time progress',
      actions: [
        'Opens in new console window with detailed progress',
        'Step 1: Normalizes logs from JSON files',
        'Step 2: Extracts and processes features',
        'Step 3: Prepares train/validation/test splits',
        'Step 4: Trains RandomForest classifier',
        'Step 5: Optimizes model with hyperparameters',
        'Updates all model files when complete'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Process Control Panel</h1>
                <p className="text-sm text-gray-500">Manage EDR system processes and services</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={fetchProcessStatus}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* System Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Processes</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {Object.keys(processes).length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Running</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {Object.values(processes).filter(p => p.status === 'running').length}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Stopped</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {Object.values(processes).filter(p => p.status === 'stopped').length}
              </div>
            </div>
          </div>
        </div>

        {/* Process Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {Object.entries(processConfigs).map(([processKey, config]) => {
            const process = processes[processKey];
            return (
              <div key={processKey} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${config.color}-100 text-${config.color}-600`}>
                        {config.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                        <p className="text-sm text-gray-500">{config.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(process.status)}`}>
                      {getStatusIcon(process.status)}
                      <span className="capitalize">{process.status}</span>
                    </span>
                  </div>

                  {/* Process Details */}
                  {process.pid && (
                    <div className="mb-4 text-sm text-gray-600">
                      <div>PID: <span className="font-mono font-medium">{process.pid}</span></div>
                      {process.uptime && (
                        <div>Uptime: <span className="font-medium">{process.uptime}</span></div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    {config.details}
                  </div>

                  {/* What happens when you click buttons */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-xs font-medium text-gray-700 mb-2">What happens when you click:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {config.actions.map((action, idx) => (
                        <li key={idx} className="flex items-center space-x-1">
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {process.status === 'stopped' ? (
                      <button
                        onClick={() => startProcess(processKey)}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Play className="h-4 w-4" />
                        <span>Start</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => stopProcess(processKey)}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => restartProcess(processKey)}
                      disabled={loading}
                      className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Restart</span>
                    </button>
                    
                    <button
                      onClick={() => fetchProcessLogs(processKey)}
                      className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      <Terminal className="h-4 w-4" />
                      <span>Logs</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Logs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Action Logs</h3>
          </div>
          <div className="overflow-x-auto h-[300px]">
            <div className="p-4">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No action logs yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-500 font-mono">{log.timestamp}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.type === 'success' ? 'bg-green-100 text-green-800' :
                        log.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-gray-900">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Process Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Process Logs - {processConfigs[selectedProcess]?.name}
                </h3>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2" />
                  <p>Process logs will be displayed here</p>
                  <p className="text-xs mt-2">This feature will be implemented when process management is fully configured</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessControl;
