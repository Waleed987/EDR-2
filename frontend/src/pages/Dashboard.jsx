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
      // Create distribution chart data based on the stats we already calculate
      const chartData = [
        {
          category: 'High Severity Events',
          count: stats.highSeverity,
          color: '#EF4444' // Red
        },
        {
          category: 'Suspicious Processes',
          count: stats.suspiciousProcesses,
          color: '#F59E0B' // Orange
        },
        {
          category: 'Network Connections',
          count: stats.networkConnections,
          color: '#8B5CF6' // Purple
        },
        {
          category: 'Autorun Entries',
          count: stats.autorunEntries,
          color: '#10B981' // Green
        }
      ];
      
      // Filter out categories with 0 count for cleaner display
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-40 w-60 h-60 bg-cyan-500 rounded-full opacity-10 blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Header */}
      <header className="relative bg-white/10 backdrop-blur-md border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  EDR Security Dashboard
                </h1>
                <p className="text-blue-200/80 text-sm font-medium">Real-time endpoint detection and response monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <div className={`w-3 h-3 rounded-full ${isRealTime ? 'bg-green-400 animate-pulse' : 'bg-gray-400'} shadow-lg`}></div>
                <span className="text-sm text-white font-medium">
                  {isRealTime ? 'Live' : 'Paused'}
                </span>
                {isRealTime && (
                  <span className="text-xs text-blue-200 bg-blue-500/20 px-2 py-1 rounded-md">
                    {countdown}s
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/alerts"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Alerts</span>
                </Link>
                <Link
                  to="/yara"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-200"
                >
                  <Shield className="h-4 w-4" />
                  <span>YARA</span>
                </Link>
                <Link
                  to="/virustotal"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-200"
                >
                  <Network className="h-4 w-4" />
                  <span>VirusTotal</span>
                </Link>
                <Link
                  to="/ai-models"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="h-4 w-4" />
                  <span>AI Models</span>
                </Link>
                <Link
                  to="/control"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span>Process Control</span>
                </Link>
              </div>
              <button
                onClick={handleRealTimeToggle}
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-200"
              >
                {isRealTime ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isRealTime ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={fetchLogs}
                className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-200">Total Events</p>
                <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-200">High Severity</p>
                <p className="text-2xl font-bold text-red-400">{stats.highSeverity}</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
            onClick={() => handleCardClick('suspicious')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl group-hover:from-yellow-400 group-hover:to-orange-500 transition-all duration-300">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-200">Suspicious Processes</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.suspiciousProcesses}</p>
                </div>
              </div>
              <div className="text-yellow-400 group-hover:translate-x-1 transition-transform duration-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
            onClick={() => handleCardClick('network')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl group-hover:from-purple-400 group-hover:to-purple-500 transition-all duration-300">
                    <Network className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-200">Network Connections</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.networkConnections}</p>
                </div>
              </div>
              <div className="text-purple-400 group-hover:translate-x-1 transition-transform duration-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
            onClick={() => handleCardClick('autorun')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl group-hover:from-green-400 group-hover:to-green-500 transition-all duration-300">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-200">Autorun Entries</p>
                  <p className="text-2xl font-bold text-green-400">{stats.autorunEntries}</p>
                </div>
              </div>
              <div className="text-green-400 group-hover:translate-x-1 transition-transform duration-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Hint text for clickable cards */}
        <div className="text-center mb-8">
          <p className="text-blue-200/80 text-sm bg-blue-500/10 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
            ✨ Click on the statistics cards above to view detailed information
          </p>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Severity Distribution */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-2 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full mr-3"></div>
              Threat Severity Distribution
            </h3>
            {(() => {
              const chartData = getSeverityChartData();
              const totalEvents = chartData.reduce((sum, entry) => sum + entry.count, 0);
              
              if (chartData.length === 0) {
                return (
                  <div className="flex items-center justify-center h-[300px] text-blue-200/60">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📊</div>
                      <div className="text-lg font-medium">No threat data available</div>
                      <div className="text-sm opacity-75">Check if monitoring is active</div>
                    </div>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="mb-6 text-sm text-blue-200/80 bg-blue-500/10 backdrop-blur-sm rounded-lg p-3">
                    Total threat events: <span className="font-bold text-white">{totalEvents}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, count }) => `${count}`}
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
                          const percentage = totalEvents > 0 ? ((value / totalEvents) * 100).toFixed(1) : '0.0';
                          return [`${value} (${percentage}%)`, props.payload.category];
                        }}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          color: 'white'
                        }}
                      />
                      <Legend 
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color }}>{entry.payload.category}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              );
            })()}
          </div>

          {/* Network Activity Over Time */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-2 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3"></div>
              Network Activity (24h)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getNetworkActivityData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.7)" />
                <YAxis stroke="rgba(255,255,255,0.7)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                />
                <Area type="monotone" dataKey="connections" stroke="#60A5FA" fill="url(#networkGradient)" fillOpacity={0.6} />
                <defs>
                  <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Type Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <div className="w-2 h-6 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full mr-3"></div>
            Event Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getEventTypeChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="event" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white'
                }}
              />
              <Bar dataKey="count" fill="url(#eventGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-300" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-300/60 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex-shrink-0">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white appearance-none cursor-pointer min-w-[200px] transition-all duration-200"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type} className="bg-slate-800 text-white">
                    {type === 'all' ? 'All Events' : type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-200/80 bg-blue-500/10 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
            <div>
              Last updated: <span className="font-semibold text-white">{lastUpdate.toLocaleTimeString()}</span>
              {isRealTime && <span> | Next update in <span className="font-semibold text-blue-300">{countdown}s</span></span>}
            </div>
            <div>
              Showing <span className="font-semibold text-white">{filteredLogs.length}</span> of <span className="font-semibold text-white">{stats.totalEvents}</span> events
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center">
                <div className="w-2 h-6 bg-gradient-to-b from-green-400 to-green-600 rounded-full mr-3"></div>
                Real-time Logs
              </h3>
              <div className="text-sm text-blue-200/80 bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-1">
                Sorted by time (most recent first)
              </div>
            </div>
          </div>
          <div className="overflow-x-auto h-[500px] custom-scrollbar">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-blue-200 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredLogs.slice(0, DASHBOARD_CONFIG.MAX_LOGS_DISPLAY).map((log, index) => (
                  <tr key={`${log.source}-${index}`} className={`hover:bg-white/5 transition-all duration-200 ${index < 5 ? 'bg-blue-500/10 border-l-4 border-l-blue-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <div className="flex items-center space-x-3">
                        {index < 5 && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                        )}
                        <span className="font-mono bg-white/10 px-2 py-1 rounded-md">
                          {log.time ? new Date(log.time).toLocaleTimeString() : 
                           log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full backdrop-blur-sm ${
                        log.event?.includes('Suspicious') || log.score >= 4
                          ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                          : log.event?.includes('Network')
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'bg-green-500/20 text-green-300 border border-green-400/30'
                      }`}>
                        {log.event || log.event_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-100">
                      <div className="max-w-xs">
                        {log.details ? (
                          <div className="space-y-1">
                            {log.details.pid && <div className="text-xs"><span className="text-blue-300">PID:</span> <span className="font-mono bg-white/10 px-1 rounded">{log.details.pid}</span></div>}
                            {log.details.name && <div className="text-xs"><span className="text-blue-300">Name:</span> <span className="font-mono bg-white/10 px-1 rounded truncate">{log.details.name}</span></div>}
                            {log.details.local_addr && <div className="text-xs"><span className="text-blue-300">Local:</span> <span className="font-mono bg-white/10 px-1 rounded">{log.details.local_addr}</span></div>}
                            {log.details.remote_addr && <div className="text-xs"><span className="text-blue-300">Remote:</span> <span className="font-mono bg-white/10 px-1 rounded">{log.details.remote_addr}</span></div>}
                          </div>
                        ) : log.filename ? (
                          <div className="text-xs"><span className="text-blue-300">File:</span> <span className="font-mono bg-white/10 px-1 rounded">{log.filename}</span></div>
                        ) : (
                          <span className="text-blue-300/60 text-xs italic">No details available</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md text-xs font-medium border border-purple-400/30">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogDetails(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-all duration-200 border border-blue-400/30 hover:border-blue-400/50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 w-full max-w-4xl shadow-2xl rounded-3xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <div className="w-3 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3"></div>
                  Log Details
                </h3>
                <button
                  onClick={() => setShowLogDetails(false)}
                  className="text-blue-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all duration-200 border border-white/20"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-black/30 backdrop-blur-sm p-6 rounded-2xl border border-white/10 max-h-96 overflow-y-auto custom-scrollbar">
                <pre className="text-sm text-blue-100 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Details Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 w-full max-w-4xl shadow-2xl rounded-3xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <div className="w-3 h-8 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full mr-3"></div>
                  {modalType}
                </h3>
                <button
                  onClick={closeProcessModal}
                  className="text-blue-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all duration-200 border border-white/20"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {modalData.length === 0 ? (
                <div className="text-center py-12 text-blue-200/60">
                  <div className="text-6xl mb-4">📋</div>
                  <div className="text-xl font-medium">No {modalType.toLowerCase()} found</div>
                  <div className="text-sm opacity-75 mt-2">Check your monitoring configuration</div>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  <div className="bg-black/20 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                    <div className="space-y-4">
                      {modalData.map((item, index) => (
                        <div key={index} className="border-b border-white/10 pb-4 last:border-b-0 bg-white/5 backdrop-blur-sm rounded-xl p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-white flex items-center text-lg mb-3">
                                <span className="mr-3 text-2xl">
                                  {item.event?.includes('Suspicious') ? '⚠️' : 
                                   item.event?.includes('Network') ? '🌐' : 
                                   item.event?.includes('Autorun') ? '🚀' : '📋'}
                                </span>
                                {item.event || item.event_type || 'Unknown Event'}
                              </div>
                              
                              {/* Process/Connection Details */}
                              {item.details && (
                                <div className="text-sm text-blue-200 space-y-2">
                                  {item.details.name && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Process:</span>
                                      <span className="font-mono bg-blue-500/20 px-3 py-1 rounded-lg text-white border border-blue-400/30">{item.details.name}</span>
                                    </div>
                                  )}
                                  {item.details.pid && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">PID:</span>
                                      <span className="font-mono bg-purple-500/20 px-3 py-1 rounded-lg text-white border border-purple-400/30">{item.details.pid}</span>
                                    </div>
                                  )}
                                  {item.details.local_addr && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Local:</span>
                                      <span className="font-mono bg-green-500/20 px-3 py-1 rounded-lg text-white border border-green-400/30">{item.details.local_addr}</span>
                                    </div>
                                  )}
                                  {item.details.remote_addr && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Remote:</span>
                                      <span className="font-mono bg-red-500/20 px-3 py-1 rounded-lg text-white border border-red-400/30">{item.details.remote_addr}</span>
                                    </div>
                                  )}
                                  {item.details.port && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Port:</span>
                                      <span className="font-mono bg-yellow-500/20 px-3 py-1 rounded-lg text-white border border-yellow-400/30">{item.details.port}</span>
                                    </div>
                                  )}
                                  {item.details.task && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Task:</span>
                                      <span className="font-mono bg-orange-500/20 px-3 py-1 rounded-lg text-white border border-orange-400/30 break-all">{item.details.task}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Alternative data structure */}
                              {item.data && (
                                <div className="text-sm text-blue-200 space-y-2">
                                  {item.data.name && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Name:</span>
                                      <span className="font-mono bg-blue-500/20 px-3 py-1 rounded-lg text-white border border-blue-400/30">{item.data.name}</span>
                                    </div>
                                  )}
                                  {item.data.pid && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">PID:</span>
                                      <span className="font-mono bg-purple-500/20 px-3 py-1 rounded-lg text-white border border-purple-400/30">{item.data.pid}</span>
                                    </div>
                                  )}
                                  {item.data.local_addr && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Local:</span>
                                      <span className="font-mono bg-green-500/20 px-3 py-1 rounded-lg text-white border border-green-400/30">{item.data.local_addr}</span>
                                    </div>
                                  )}
                                  {item.data.remote_addr && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Remote:</span>
                                      <span className="font-mono bg-red-500/20 px-3 py-1 rounded-lg text-white border border-red-400/30">{item.data.remote_addr}</span>
                                    </div>
                                  )}
                                  {item.data.port && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Port:</span>
                                      <span className="font-mono bg-yellow-500/20 px-3 py-1 rounded-lg text-white border border-yellow-400/30">{item.data.port}</span>
                                    </div>
                                  )}
                                  {item.data.task && (
                                    <div className="flex items-center">
                                      <span className="font-semibold text-blue-300 w-20">Task:</span>
                                      <span className="font-mono bg-orange-500/20 px-3 py-1 rounded-lg text-white border border-orange-400/30 break-all">{item.data.task}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Show raw data if no structured data available */}
                              {!item.details && !item.data && (
                                <div className="text-sm text-blue-300/60 italic bg-blue-500/10 p-3 rounded-lg border border-blue-400/20">
                                  No detailed information available
                                </div>
                              )}
                            </div>
                            
                            {/* Timestamp */}
                            <div className="text-xs text-blue-300 ml-6 flex-shrink-0">
                              <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 font-mono">
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

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(96, 165, 250, 0.5) rgba(255, 255, 255, 0.1);
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #60A5FA, #3B82F6);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #93C5FD, #60A5FA);
        }
      `}</style>
    </div>
  );
}

export default Dashboard;