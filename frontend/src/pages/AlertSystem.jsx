import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Home,
  Search,
  Filter,
  Bug,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  Zap,
  Globe
} from 'lucide-react';

function AlertSystem() {
  const [highSeverityAlerts, setHighSeverityAlerts] = useState([]);
  const [malwareAlerts, setMalwareAlerts] = useState([]);
  const [blockedActions, setBlockedActions] = useState([]);
  const [quarantineInfo, setQuarantineInfo] = useState({ files: [], total_files: 0 });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [isRealTime, setIsRealTime] = useState(true);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    malwareDetections: 0,
    blockedActions: 0,
    quarantinedFiles: 0,
    recentAlerts: 0,
    resolvedAlerts: 0
  });

  // Fetch high severity alerts
  const fetchHighSeverityAlerts = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ALERTS.HIGH_SEVERITY);
      setHighSeverityAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching high severity alerts:', error);
    }
  };

  // Fetch malware alerts
  const fetchMalwareAlerts = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ALERTS.MALWARE);
      setMalwareAlerts(response.data || []);
    } catch (error) {
      console.error('Error fetching malware alerts:', error);
    }
  };

  // Fetch blocked actions
  const fetchBlockedActions = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ACTIONS.BLOCKED);
      setBlockedActions(response.data || []);
    } catch (error) {
      console.error('Error fetching blocked actions:', error);
    }
  };

  // Fetch quarantine information
  const fetchQuarantineInfo = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ACTIONS.QUARANTINE);
      setQuarantineInfo(response.data || { files: [], total_files: 0 });
    } catch (error) {
      console.error('Error fetching quarantine info:', error);
    }
  };

  // Fetch all alerts
  const fetchAllAlerts = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchHighSeverityAlerts(),
        fetchMalwareAlerts(),
        fetchBlockedActions(),
        fetchQuarantineInfo()
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const allAlerts = [...highSeverityAlerts, ...malwareAlerts];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentAlerts = allAlerts.filter(alert => {
      const alertTime = new Date(alert.timestamp || alert.time);
      return alertTime > oneHourAgo;
    }).length;

    const criticalAlerts = allAlerts.filter(alert => 
      alert.severity_level === 'critical' || 
      (alert.data && alert.data.score >= 8)
    ).length;

    const malwareDetections = malwareAlerts.length;

    setStats({
      totalAlerts: allAlerts.length,
      criticalAlerts,
      malwareDetections,
      blockedActions: blockedActions.length,
      quarantinedFiles: quarantineInfo.total_files || 0,
      recentAlerts,
      resolvedAlerts: 0 // Would be tracked in a real system
    });
  };

  // Get all alerts combined and sorted
  const getAllAlerts = () => {
    const combined = [
      ...highSeverityAlerts.map(alert => ({ ...alert, category: 'high_severity' })),
      ...malwareAlerts.map(alert => ({ ...alert, category: 'malware' })),
      ...blockedActions.map(action => ({ ...action, category: 'auto_response' }))
    ];
    
    // Sort by timestamp (most recent first)
    return combined.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.time || 0);
      const timeB = new Date(b.timestamp || b.time || 0);
      return timeB - timeA;
    });
  };

  // Filter alerts based on search and filter criteria
  const getFilteredAlerts = () => {
    let alerts = getAllAlerts();
    
    // Apply category filter
    if (selectedFilter !== 'all') {
      alerts = alerts.filter(alert => alert.category === selectedFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      alerts = alerts.filter(alert => 
        JSON.stringify(alert).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return alerts;
  };

  // Get alert severity color
  const getAlertSeverityColor = (alert) => {
    if (alert.severity_level === 'critical' || (alert.data && alert.data.score >= 8)) {
      return 'text-red-600 bg-red-100 border-red-200';
    }
    if (alert.severity_level === 'high' || (alert.data && alert.data.score >= 6)) {
      return 'text-orange-600 bg-orange-100 border-orange-200';
    }
    if (alert.category === 'malware') {
      return 'text-purple-600 bg-purple-100 border-purple-200';
    }
    return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  };

  // Get alert icon
  const getAlertIcon = (alert) => {
    if (alert.category === 'malware') {
      return <Bug className="h-5 w-5" />;
    }
    if (alert.severity_level === 'critical' || (alert.data && alert.data.score >= 8)) {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <Shield className="h-5 w-5" />;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Get relative time
  const getRelativeTime = (timestamp) => {
    try {
      const now = new Date();
      const alertTime = new Date(timestamp);
      const diffMs = now - alertTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Auto-refresh every 30 seconds when real-time is enabled
  useEffect(() => {
    fetchAllAlerts();
    
    if (isRealTime) {
      const interval = setInterval(fetchAllAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [isRealTime]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Update stats when alerts change
  useEffect(() => {
    calculateStats();
  }, [highSeverityAlerts, malwareAlerts, blockedActions, quarantineInfo]);

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Real-time Alert System</h1>
                <p className="text-sm text-gray-500">Security incident monitoring and threat alerts</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRealTime ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {isRealTime ? 'Live' : 'Paused'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              <Link
                to="/"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {isRealTime ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isRealTime ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={fetchAllAlerts}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalAlerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Critical</p>
                <p className="text-2xl font-semibold text-red-600">{stats.criticalAlerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bug className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Malware</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.malwareDetections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-800" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Auto-Blocked</p>
                <p className="text-2xl font-semibold text-red-800">{stats.blockedActions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quarantined</p>
                <p className="text-2xl font-semibold text-indigo-600">{stats.quarantinedFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent (1h)</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.recentAlerts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-green-600">{stats.resolvedAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Alerts</option>
                <option value="high_severity">High Severity</option>
                <option value="malware">Malware Detection</option>
                <option value="auto_response">Auto-Response Actions</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredAlerts.length} of {stats.totalAlerts} alerts
          </div>
        </div>

        {/* Auto-Response Actions Summary */}
        {(blockedActions.length > 0 || quarantineInfo.total_files > 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🛡️ Recent Auto-Response Actions</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blocked Actions */}
              {blockedActions.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-red-800 mb-3 flex items-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    Auto-Blocked Threats ({blockedActions.length})
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {blockedActions.slice(0, 5).map((action, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-red-900 text-sm">
                              {action.event || action.event_type || 'Auto-Blocked Threat'}
                            </div>
                            <div className="text-xs text-red-700 mt-1">
                              <span className="bg-red-200 px-2 py-1 rounded">
                                {action.blocked_reason}
                              </span>
                              <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded ml-2">
                                {Math.round((action.confidence || 0) * 100)}% confidence
                              </span>
                            </div>
                            {action.target_type === 'process' && action.data?.name && (
                              <div className="text-xs text-gray-600 mt-1">
                                Process: {action.data.name} {action.data?.pid && `(PID: ${action.data.pid})`}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 ml-2">
                            {getRelativeTime(action.timestamp || action.time)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {blockedActions.length > 5 && (
                      <div className="text-center text-sm text-gray-500">
                        +{blockedActions.length - 5} more blocked actions
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Quarantined Files */}
              {quarantineInfo.total_files > 0 && (
                <div>
                  <h4 className="text-md font-medium text-indigo-800 mb-3 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Quarantined Files ({quarantineInfo.total_files})
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {quarantineInfo.files.slice(0, 5).map((file, index) => (
                      <div key={index} className="border border-indigo-200 rounded-lg p-3 bg-indigo-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-indigo-900 text-sm truncate" title={file.original_filename}>
                              {file.original_filename}
                            </div>
                            <div className="text-xs text-indigo-700 mt-1">
                              <span className="bg-indigo-200 px-2 py-1 rounded">
                                Size: {formatFileSize(file.size)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Quarantine: {file.quarantine_filename}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 ml-2">
                            {new Date(parseInt(file.quarantined_at) * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {quarantineInfo.files.length > 5 && (
                      <div className="text-center text-sm text-gray-500">
                        +{quarantineInfo.files.length - 5} more quarantined files
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Security Alerts</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-2 text-gray-600">Loading alerts...</span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No alerts found</p>
              <p className="text-sm">Security alerts will appear here when threats are detected</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAlerts.slice(0, 50).map((alert, index) => (
                <div key={index} className={`p-6 hover:bg-gray-50 border-l-4 ${getAlertSeverityColor(alert)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 ${getAlertSeverityColor(alert).split(' ')[0]}`}>
                        {getAlertIcon(alert)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-medium text-gray-900">
                          {alert.event || alert.event_type || 'Security Alert'}
                        </h4>
                        
                        <div className="mt-2 space-y-2">
                          {/* Alert Details */}
                          {alert.category === 'malware' && alert.source === 'yara' && (
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Bug className="h-4 w-4 text-purple-600" />
                                <span>YARA Rule Match: {alert.data?.matches?.join(', ')}</span>
                              </div>
                              <div className="mt-1">File: {alert.data?.file}</div>
                            </div>
                          )}
                          
                          {alert.category === 'malware' && alert.source === 'virustotal' && (
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Globe className="h-4 w-4 text-blue-600" />
                                <span>VirusTotal Detection</span>
                              </div>
                              <div className="mt-1">
                                File: {alert.data?.file_name} 
                                ({alert.data?.vt_result?.malicious_count}/{alert.data?.vt_result?.total_engines} engines)
                              </div>
                            </div>
                          )}
                          
                          {alert.category === 'high_severity' && (
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Zap className="h-4 w-4 text-red-600" />
                                <span>Severity Score: {alert.data?.score}/10</span>
                              </div>
                              {alert.data?.name && (
                                <div className="mt-1">Process: {alert.data.name}</div>
                              )}
                              {alert.data?.pid && (
                                <div>PID: {alert.data.pid}</div>
                              )}
                            </div>
                          )}

                          {alert.category === 'auto_response' && (
                            <div className="text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <XCircle className="h-4 w-4 text-red-800" />
                                <span className="font-semibold text-red-800">AUTO-BLOCKED BY ML</span>
                              </div>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                                    {alert.blocked_reason}
                                  </span>
                                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Confidence: {Math.round((alert.confidence || 0) * 100)}%
                                  </span>
                                </div>
                                {alert.target_type === 'process' && alert.data?.name && (
                                  <div>
                                    <span className="font-medium">Killed Process:</span> {alert.data.name}
                                    {alert.data?.pid && <span> (PID: {alert.data.pid})</span>}
                                  </div>
                                )}
                                {alert.target_type === 'file' && (alert.data?.file || alert.data?.path) && (
                                  <div>
                                    <span className="font-medium">Quarantined File:</span> {alert.data.file || alert.data.path}
                                  </div>
                                )}
                                {alert.data?.parent && (
                                  <div>
                                    <span className="font-medium">Parent Process:</span> {alert.data.parent}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{getRelativeTime(alert.timestamp || alert.time)}</span>
                            </div>
                            <div>
                              {formatTimestamp(alert.timestamp || alert.time)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowAlertDetails(true);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alert Details Modal */}
      {showAlertDetails && selectedAlert && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
                <button
                  onClick={() => setShowAlertDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Alert Information</h4>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Event Type</div>
                        <div className="font-medium">{selectedAlert.event || selectedAlert.event_type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Category</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAlertSeverityColor(selectedAlert)}`}>
                          {selectedAlert.category}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Timestamp</div>
                        <div>{formatTimestamp(selectedAlert.timestamp || selectedAlert.time)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Source</div>
                        <div>{selectedAlert.source || selectedAlert.module || 'Unknown'}</div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedAlert.severity_level && (
                    <div>
                      <h4 className="font-semibold text-gray-900">Severity Assessment</h4>
                      <div className="mt-2">
                        <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${getAlertSeverityColor(selectedAlert)}`}>
                          {selectedAlert.severity_level.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Raw Alert Data</h4>
                    <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                      {JSON.stringify(selectedAlert, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertSystem;
