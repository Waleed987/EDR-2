import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, DASHBOARD_CONFIG } from '../config';
import { Link } from 'react-router-dom';
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
  Zap,
  Settings
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
  const [nextUpdate, setNextUpdate] = useState(new Date(Date.now() + 5000));
  const [stats, setStats] = useState({
    totalEvents: 0,
    highSeverity: 0,
    suspiciousProcesses: 0,
    networkConnections: 0,
    autorunEntries: 0
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalData, setModalData] = useState([]);
  const intervalRef = useRef(null);

  // Countdown timer for next update
  const [countdown, setCountdown] = useState(5);

  // Update countdown every second
  useEffect(() => {
    if (isRealTime) {
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 5;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isRealTime]);

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

  // Severity level descriptions
  const severityDescriptions = {
    1: 'Low',
    2: 'Medium',
    3: 'Medium-High',
    4: 'High',
    5: 'Critical',
    6: 'Extreme'
  };

  // Handle real-time toggle
  const handleRealTimeToggle = () => {
    setIsRealTime(!isRealTime);
    if (!isRealTime) {
      // Resuming real-time - reset countdown and fetch logs immediately
      setCountdown(5);
      fetchLogs();
    }
  };

  // Handle modal display for different data types
  const handleCardClick = (type) => {
    let data = [];
    let title = '';
    
    switch (type) {
      case 'suspicious':
        data = logs.endpoint.filter(log => log.event.includes('Suspicious'));
        title = 'Suspicious Processes';
        break;
      case 'network':
        data = logs.endpoint.filter(log => log.event.includes('Network'));
        title = 'Network Connections';
        break;
      case 'autorun':
        data = logs.endpoint.filter(log => log.event.includes('Autorun'));
        title = 'Autorun Entries';
        break;
      default:
        return;
    }
    
    setModalType(title);
    setModalData(data);
    setShowProcessModal(true);
  };

  const closeProcessModal = () => {
    setShowProcessModal(false);
    setModalType('');
    setModalData([]);
  };

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.LOGS.ALL);
      setLogs(response.data);
      setLastUpdate(new Date());
      setNextUpdate(new Date(Date.now() + 5000));
    } catch (error) {
      console.error('Error fetching logs:', error);
      // Don't fall back to mock data - just keep existing logs
    }
  };

  // Sort logs by timestamp (most recent first)
  const sortLogsByTimestamp = (logsArray, timeKey = 'timestamp') => {
    return logsArray.sort((a, b) => {
      const getTimestamp = (log) => {
        try {
          if (timeKey in log) {
            if (typeof log[timeKey] === 'number') {
              return log[timeKey];
            } else if (typeof log[timeKey] === 'string') {
              // Try to parse ISO format or other string formats
              const date = new Date(log[timeKey]);
              return isNaN(date.getTime()) ? 0 : date.getTime();
            }
          } else if ('time' in log) {
            // Handle 'time' field as fallback
            const date = new Date(log.time);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          }
          return 0;
        } catch {
          return 0;
        }
      };

      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      return timeB - timeA; // Most recent first
    });
  };

  // Generate mock data for demonstration - REMOVED, will use real API data only
  // const generateMockEndpointLogs = () => { ... } - REMOVED
  // const generateMockSeverityLogs = () => { ... } - REMOVED
  // const generateMockProcessTreeLogs = () => { ... } - REMOVED
  // const generateMockDownloadLogs = () => { ... } - REMOVED

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
      highSeverity: logs.severity.filter(log => (log.score || log.severity) >= 4).length,
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

    // Sort all logs by timestamp (most recent first)
    const sortedLogs = sortLogsByTimestamp(allLogs);

    // Filter by event type
    if (selectedEventType !== 'all') {
      filtered = sortedLogs.filter(log => log.event === selectedEventType || log.event_type === selectedEventType);
    } else {
      filtered = sortedLogs;
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
      // Fetch logs immediately
      fetchLogs();
      // Set up interval for every 5 seconds
      intervalRef.current = setInterval(fetchLogs, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    try {
      const severityCounts = {};
      const sortedSeverityLogs = sortLogsByTimestamp([...logs.severity]);
      
      // Count severity scores from logs
      sortedSeverityLogs.forEach(log => {
        // Handle both 'score' and 'severity' fields for compatibility
        const score = log.score || log.severity;
        if (score !== undefined && score !== null && !isNaN(score)) {
          const numericScore = parseInt(score);
          if (numericScore >= 1 && numericScore <= 6) {
            severityCounts[numericScore] = (severityCounts[numericScore] || 0) + 1;
          }
        }
      });
      
      // Ensure all severity levels are represented, even if count is 0
      const allSeverityLevels = [1, 2, 3, 4, 5, 6];
      const chartData = allSeverityLevels.map(level => ({
        score: `Level ${level} (${severityDescriptions[level]})`,
        count: severityCounts[level] || 0,
        color: severityColors[level] || '#6B7280'
      }));
      
      // Filter out levels with 0 count for cleaner display
      const finalData = chartData.filter(entry => entry.count > 0);
      
      return finalData;
    } catch (error) {
      console.error('Error preparing severity chart data:', error);
      return [];
    }
  };

  const getEventTypeChartData = () => {
    const eventCounts = {};
    const sortedEndpointLogs = sortLogsByTimestamp([...logs.endpoint]);
    sortedEndpointLogs.forEach(log => {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    });
    
    return Object.entries(eventCounts).map(([event, count]) => ({
      event,
      count
    }));
  };

  const getNetworkActivityData = () => {
    const networkLogs = logs.endpoint.filter(log => log.event.includes('Network'));
    const sortedNetworkLogs = sortLogsByTimestamp(networkLogs);
    const timeData = {};
    
    sortedNetworkLogs.forEach(log => {
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
                {isRealTime && (
                  <span className="text-xs text-gray-500">
                    Next update in {countdown}s
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/alerts"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Alerts</span>
                </Link>
                <Link
                  to="/yara"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Shield className="h-4 w-4" />
                  <span>YARA</span>
                </Link>
                <Link
                  to="/virustotal"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Network className="h-4 w-4" />
                  <span>VirusTotal</span>
                </Link>
                <Link
                  to="/ai-models"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Zap className="h-4 w-4" />
                  <span>AI Models</span>
                </Link>
                <Link
                  to="/control"
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <Settings className="h-4 w-4" />
                  <span>Process Control</span>
                </Link>
              </div>
              <button
                onClick={handleRealTimeToggle}
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

                     <div 
             className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
             onClick={() => handleCardClick('suspicious')}
           >
             <div className="flex items-center justify-between">
               <div className="flex items-center">
                 <div className="flex-shrink-0">
                   <Monitor className="h-8 w-8 text-yellow-600" />
                 </div>
                 <div className="ml-4">
                   <p className="text-sm font-medium text-gray-500">Suspicious Processes</p>
                   <p className="text-2xl font-semibold text-yellow-600">{stats.suspiciousProcesses}</p>
                 </div>
               </div>
               <div className="text-yellow-400">
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                 </svg>
               </div>
             </div>
           </div>

                     <div 
             className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
             onClick={() => handleCardClick('network')}
           >
             <div className="flex items-center justify-between">
               <div className="flex items-center">
                 <div className="flex-shrink-0">
                   <Network className="h-8 w-8 text-purple-600" />
                 </div>
                 <div className="ml-4">
                   <p className="text-sm font-medium text-gray-500">Network Connections</p>
                   <p className="text-2xl font-semibold text-purple-600">{stats.networkConnections}</p>
                 </div>
               </div>
               <div className="text-purple-400">
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                 </svg>
               </div>
             </div>
           </div>

                     <div 
             className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
             onClick={() => handleCardClick('autorun')}
           >
             <div className="flex items-center justify-between">
               <div className="flex items-center">
                 <div className="flex-shrink-0">
                   <Zap className="h-8 w-8 text-green-600" />
                 </div>
                 <div className="ml-4">
                   <p className="text-sm font-medium text-gray-500">Autorun Entries</p>
                   <p className="text-2xl font-semibold text-green-600">{stats.autorunEntries}</p>
                 </div>
               </div>
               <div className="text-green-400">
                 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                 </svg>
               </div>
             </div>
           </div>
                 </div>

         {/* Hint text for clickable cards */}
         <div className="text-center mb-4">
           <p className="text-sm text-gray-500">
             💡 Click on the statistics cards above to view detailed information
           </p>
         </div>

         {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Severity Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Threat Severity Distribution</h3>
            {(() => {
              const chartData = getSeverityChartData();
              const totalSeverityEvents = chartData.reduce((sum, entry) => sum + entry.count, 0);
              
              if (chartData.length === 0) {
                return (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <div className="text-2xl mb-2">📊</div>
                      <div>No severity data available</div>
                      <div className="text-sm">Check if severity logs are being generated</div>
                    </div>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="mb-4 text-sm text-gray-600">
                    Total severity events: <span className="font-semibold">{totalSeverityEvents}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ score, count }) => `${score}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        animationDuration={1000}
                        animationBegin={0}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => {
                          const percentage = ((value / totalSeverityEvents) * 100).toFixed(1);
                          return [`${value} (${percentage}%)`, props.payload.score];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              );
            })()}
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
            Last updated: {lastUpdate.toLocaleTimeString()} | 
            {isRealTime && ` Next update in ${countdown}s |`} 
            Showing {filteredLogs.length} of {stats.totalEvents} events
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Real-time Logs</h3>
              <div className="text-sm text-gray-500">
                Sorted by time (most recent first)
              </div>
            </div>
          </div>
          <div className="overflow-x-auto h-[500px]">
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
                  <tr key={`${log.source}-${index}`} className={`hover:bg-gray-50 ${index < 5 ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {index < 5 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <span>
                          {log.time ? new Date(log.time).toLocaleTimeString() : 
                           log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
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

       {/* Process Details Modal */}
       {showProcessModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-medium text-gray-900">{modalType}</h3>
                 <button
                   onClick={closeProcessModal}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <span className="sr-only">Close</span>
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               
               {modalData.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                   <div className="text-2xl mb-2">📋</div>
                   <div>No {modalType.toLowerCase()} found</div>
                 </div>
               ) : (
                 <div className="max-h-96 overflow-y-auto">
                   <div className="bg-gray-50 p-4 rounded-md">
                     <div className="space-y-3">
                       {modalData.map((item, index) => (
                         <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                           <div className="flex justify-between items-start">
                             <div className="flex-1">
                               <div className="font-medium text-gray-900 flex items-center">
                                 <span className="mr-2">
                                   {item.event?.includes('Suspicious') ? '⚠️' : 
                                    item.event?.includes('Network') ? '🌐' : 
                                    item.event?.includes('Autorun') ? '🚀' : '📋'}
                                 </span>
                                 {item.event || item.event_type || 'Unknown Event'}
                               </div>
                               
                               {/* Process/Connection Details */}
                               {item.details && (
                                 <div className="text-sm text-gray-600 mt-2 space-y-1">
                                   {item.details.name && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Process:</span>
                                       <span className="font-mono bg-gray-200 px-2 py-1 rounded text-xs">{item.details.name}</span>
                                     </div>
                                   )}
                                   {item.details.pid && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">PID:</span>
                                       <span className="font-mono bg-blue-100 px-2 py-1 rounded text-xs">{item.details.pid}</span>
                                     </div>
                                   )}
                                   {item.details.local_addr && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Local:</span>
                                       <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">{item.details.local_addr}</span>
                                     </div>
                                   )}
                                   {item.details.remote_addr && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Remote:</span>
                                       <span className="font-mono bg-red-100 px-2 py-1 rounded text-xs">{item.details.remote_addr}</span>
                                     </div>
                                   )}
                                   {item.details.port && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Port:</span>
                                       <span className="font-mono bg-purple-100 px-2 py-1 rounded text-xs">{item.details.port}</span>
                                     </div>
                                   )}
                                   {item.details.task && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Task:</span>
                                       <span className="font-mono bg-yellow-100 px-2 py-1 rounded text-xs break-all">{item.details.task}</span>
                                     </div>
                                   )}
                                 </div>
                               )}
                               
                               {/* Alternative data structure */}
                               {item.data && (
                                 <div className="text-sm text-gray-600 mt-2 space-y-1">
                                   {item.data.name && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Name:</span>
                                       <span className="font-mono bg-gray-200 px-2 py-1 rounded text-xs">{item.data.name}</span>
                                     </div>
                                   )}
                                   {item.data.pid && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">PID:</span>
                                       <span className="font-mono bg-blue-100 px-2 py-1 rounded text-xs">{item.data.pid}</span>
                                     </div>
                                   )}
                                   {item.data.local_addr && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Local:</span>
                                       <span className="font-mono bg-green-100 px-2 py-1 rounded text-xs">{item.data.local_addr}</span>
                                     </div>
                                   )}
                                   {item.data.remote_addr && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Remote:</span>
                                       <span className="font-mono bg-red-100 px-2 py-1 rounded text-xs">{item.data.remote_addr}</span>
                                     </div>
                                   )}
                                   {item.data.port && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Port:</span>
                                       <span className="font-mono bg-purple-100 px-2 py-1 rounded text-xs">{item.data.port}</span>
                                     </div>
                                   )}
                                   {item.data.task && (
                                     <div className="flex items-center">
                                       <span className="font-medium text-gray-700 w-20">Task:</span>
                                       <span className="font-mono bg-yellow-100 px-2 py-1 rounded text-xs break-all">{item.data.task}</span>
                                     </div>
                                   )}
                                 </div>
                               )}
                               
                               {/* Show raw data if no structured data available */}
                               {!item.details && !item.data && (
                                 <div className="text-sm text-gray-500 mt-2 italic">
                                   No detailed information available
                                 </div>
                               )}
                             </div>
                             
                             {/* Timestamp */}
                             <div className="text-xs text-gray-500 ml-4 flex-shrink-0">
                               <div className="bg-white px-2 py-1 rounded border">
                                 {item.time ? new Date(item.time).toLocaleTimeString() : 
                                  item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

export default Dashboard;