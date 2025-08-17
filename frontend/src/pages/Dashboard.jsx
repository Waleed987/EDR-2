import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, DASHBOARD_CONFIG } from '../config';
import { 
  Activity, 
  Shield, 
  Network, 
  FileText, 
  Download, 
  AlertTriangle, 
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Server,
  Monitor,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

function Dashboard() {
  const [logs, setLogs] = useState({
    endpoint: [],
    severity: [],
    processTree: [],
    downloads: []
  });
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [isRealTime, setIsRealTime] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({
    totalEvents: 0,
    highSeverity: 0,
    suspiciousProcesses: 0,
    networkConnections: 0,
    autorunEntries: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const intervalRef = useRef(null);

  // Event types for filtering
  const eventTypes = [
    'all',
    'Process Created',
    'Network Connection',
    'Suspicious Network',
    'Autorun Entry Detected',
    'Suspicious Process Modules',
    'Suspicious Scheduled Task',
    'Consistent Execution Time',
    'Time-Based Execution Window'
  ];

  // Color scheme for severity levels
  const severityColors = {
    1: '#10B981', // Green - Low
    2: '#F59E0B', // Yellow - Medium
    3: '#F97316', // Orange - Medium-High
    4: '#EF4444', // Red - High
    5: '#DC2626', // Dark Red - Critical
    6: '#7C2D12'  // Brown - Extreme
  };

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.LOGS.ALL);
      setLogs(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Fallback to mock data if API fails
      const mockLogs = {
        endpoint: generateMockEndpointLogs(),
        severity: generateMockSeverityLogs(),
        processTree: generateMockProcessTreeLogs(),
        downloads: generateMockDownloadLogs()
      };
      setLogs(mockLogs);
    }
  };

  // Generate mock data for demonstration
  const generateMockEndpointLogs = () => {
    const events = [
      'Process Created',
      'Network Connection',
      'Suspicious Network',
      'Autorun Entry Detected',
      'Suspicious Process Modules'
    ];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      event: events[Math.floor(Math.random() * events.length)],
      details: {
        pid: Math.floor(Math.random() * 10000),
        name: `process_${i}.exe`,
        parent: `parent_${i}.exe`,
        local_addr: `192.168.1.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 65535)}`,
        remote_addr: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:443`,
        status: 'ESTABLISHED',
        trusted: Math.random() > 0.7
      },
      time: new Date(Date.now() - Math.random() * 86400000).toLocaleString()
    }));
  };

  const generateMockSeverityLogs = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      event_id: `event_${i}`,
      timestamp: Date.now() - Math.random() * 86400000,
      event_type: ['Suspicious Scheduled Task', 'Consistent Execution Time', 'Time-Based Execution Window'][Math.floor(Math.random() * 3)],
      source: 'logic_bomb_detector',
      score: Math.floor(Math.random() * 6) + 1
    }));
  };

  const generateMockProcessTreeLogs = () => {
    return Array.from({ length: 20 }, (_, i) => ({
      pid: Math.floor(Math.random() * 10000),
      name: `process_${i}.exe`,
      parent_pid: Math.floor(Math.random() * 10000),
      parent_name: `parent_${i}.exe`,
      children: Math.floor(Math.random() * 5),
      suspicious: Math.random() > 0.8
    }));
  };

  const generateMockDownloadLogs = () => {
    return Array.from({ length: 25 }, (_, i) => ({
      filename: `file_${i}.exe`,
      url: `https://example.com/file_${i}.exe`,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      size: Math.floor(Math.random() * 10000000),
      suspicious: Math.random() > 0.7,
      hash: `sha256_${Math.random().toString(36).substring(2, 15)}`
    }));
  };

  // Calculate statistics
  const calculateStats = () => {
    const allLogs = [
      ...logs.endpoint,
      ...logs.severity,
      ...logs.processTree,
      ...logs.downloads
    ];

    setStats({
      totalEvents: allLogs.length,
      highSeverity: logs.severity.filter(log => log.score >= 4).length,
      suspiciousProcesses: logs.endpoint.filter(log => log.event.includes('Suspicious')).length,
      networkConnections: logs.endpoint.filter(log => log.event.includes('Network')).length,
      autorunEntries: logs.endpoint.filter(log => log.event.includes('Autorun')).length
    });
  };

  // Filter logs based on search and event type
  const filterLogs = () => {
    let filtered = [];
    
    // Combine all logs
    const allLogs = [
      ...logs.endpoint.map(log => ({ ...log, source: 'endpoint' })),
      ...logs.severity.map(log => ({ ...log, source: 'severity' })),
      ...logs.processTree.map(log => ({ ...log, source: 'processTree' })),
      ...logs.downloads.map(log => ({ ...log, source: 'downloads' }))
    ];

    // Filter by event type
    if (selectedEventType !== 'all') {
      filtered = allLogs.filter(log => log.event === selectedEventType || log.event_type === selectedEventType);
    } else {
      filtered = allLogs;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  // Real-time updates
  useEffect(() => {
    if (isRealTime) {
      fetchLogs();
      intervalRef.current = setInterval(fetchLogs, DASHBOARD_CONFIG.REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRealTime]);

  // Update stats when logs change
  useEffect(() => {
    calculateStats();
  }, [logs]);

  // Filter logs when search or event type changes
  useEffect(() => {
    filterLogs();
  }, [searchTerm, selectedEventType, logs]);

  // Chart data preparation
  const getSeverityChartData = () => {
    const severityCounts = {};
    logs.severity.forEach(log => {
      const score = log.score;
      severityCounts[score] = (severityCounts[score] || 0) + 1;
    });
    
    return Object.entries(severityCounts).map(([score, count]) => ({
      score: `Level ${score}`,
      count,
      color: severityColors[parseInt(score)] || '#6B7280'
    }));
  };

  const getEventTypeChartData = () => {
    const eventCounts = {};
    logs.endpoint.forEach(log => {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    });
    
    return Object.entries(eventCounts).map(([event, count]) => ({
      event,
      count
    }));
  };

  const getNetworkActivityData = () => {
    const networkLogs = logs.endpoint.filter(log => log.event.includes('Network'));
    const timeData = {};
    
    networkLogs.forEach(log => {
      const hour = new Date(log.time).getHours();
      timeData[hour] = (timeData[hour] || 0) + 1;
    });
    
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      connections: timeData[i] || 0
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EDR Security Dashboard</h1>
                <p className="text-sm text-gray-500">Real-time endpoint detection and response monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isRealTime ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {isRealTime ? 'Live' : 'Paused'}
                </span>
              </div>
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isRealTime ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isRealTime ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={fetchLogs}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Severity</p>
                <p className="text-2xl font-semibold text-red-600">{stats.highSeverity}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Monitor className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspicious Processes</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.suspiciousProcesses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Network className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Network Connections</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.networkConnections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Autorun Entries</p>
                <p className="text-2xl font-semibold text-green-600">{stats.autorunEntries}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Severity Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getSeverityChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ score, count }) => `${score}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {getSeverityChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Network Activity Over Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Network Activity (24h)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getNetworkActivityData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="connections" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Type Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Event Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getEventTypeChartData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Events' : type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()} | Showing {filteredLogs.length} of {stats.totalEvents} events
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Real-time Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.slice(0, DASHBOARD_CONFIG.MAX_LOGS_DISPLAY).map((log, index) => (
                  <tr key={`${log.source}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.time ? new Date(log.time).toLocaleTimeString() : 
                       log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.event?.includes('Suspicious') || log.score >= 4
                          ? 'bg-red-100 text-red-800'
                          : log.event?.includes('Network')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {log.event || log.event_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {log.details ? (
                          <div>
                            {log.details.pid && <div>PID: {log.details.pid}</div>}
                            {log.details.name && <div>Name: {log.details.name}</div>}
                            {log.details.local_addr && <div>Local: {log.details.local_addr}</div>}
                            {log.details.remote_addr && <div>Remote: {log.details.remote_addr}</div>}
                          </div>
                        ) : log.filename ? (
                          <div>File: {log.filename}</div>
                        ) : (
                          'No details available'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Log Details</h3>
                <button
                  onClick={() => setShowLogDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;