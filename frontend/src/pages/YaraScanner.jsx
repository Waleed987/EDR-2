import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Scan, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  Eye,
  RefreshCw,
  Home,
  FileCheck,
  Bug,
  Activity
} from 'lucide-react';

function YaraScanner() {
  const [yaraLogs, setYaraLogs] = useState([]);
  const [yaraRules, setYaraRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRule, setSelectedRule] = useState(null);
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const [stats, setStats] = useState({
    totalScans: 0,
    malwareDetected: 0,
    rulesLoaded: 0,
    recentDetections: 0
  });

  // Fetch YARA scan logs
  const fetchYaraLogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.YARA.LOGS);
      setYaraLogs(response.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching YARA logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch YARA rules
  const fetchYaraRules = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.YARA.RULES);
      setYaraRules(response.data || []);
    } catch (error) {
      console.error('Error fetching YARA rules:', error);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentDetections = yaraLogs.filter(log => {
      const logTime = new Date(log.timestamp || log.time);
      return logTime > oneHourAgo;
    }).length;

    setStats({
      totalScans: yaraLogs.length,
      malwareDetected: yaraLogs.filter(log => 
        log.event === 'YARA Match Detected' || 
        (log.data && log.data.matches && log.data.matches.length > 0)
      ).length,
      rulesLoaded: yaraRules.length,
      recentDetections
    });
  };

  // Filter logs based on search term
  const filteredLogs = yaraLogs.filter(log => 
    JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get threat level color
  const getThreatLevelColor = (log) => {
    const matches = log.data?.matches || [];
    if (matches.length === 0) return 'text-gray-600 bg-gray-100';
    if (matches.length >= 3) return 'text-red-600 bg-red-100';
    if (matches.length >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchYaraLogs();
    fetchYaraRules();
    
    const interval = setInterval(() => {
      fetchYaraLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update stats when logs change
  useEffect(() => {
    calculateStats();
  }, [yaraLogs, yaraRules]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">YARA Malware Scanner</h1>
                <p className="text-sm text-gray-500">Real-time malware detection using YARA rules</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
                onClick={fetchYaraLogs}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Scan className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Scans</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalScans}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bug className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Malware Detected</p>
                <p className="text-2xl font-semibold text-red-600">{stats.malwareDetected}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rules Loaded</p>
                <p className="text-2xl font-semibold text-green-600">{stats.rulesLoaded}</p>
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
                <p className="text-2xl font-semibold text-orange-600">{stats.recentDetections}</p>
              </div>
            </div>
          </div>
        </div>

        {/* YARA Rules Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Loaded YARA Rules</h3>
          {yaraRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No YARA rules loaded</p>
              <p className="text-sm">Make sure YARA rules are available in the agent/yara_rules directory</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {yaraRules.map((rule, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rule.filename}</h4>
                    <button
                      onClick={() => {
                        setSelectedRule(rule);
                        setShowRuleDetails(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Size: {formatFileSize(rule.size)}</div>
                    <div>Modified: {new Date(rule.modified).toLocaleDateString()}</div>
                    {rule.error && (
                      <div className="text-red-600">Error: {rule.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search YARA scan results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredLogs.length} of {yaraLogs.length} results
            </div>
          </div>
        </div>

        {/* Scan Results */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">YARA Scan Results</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-2 text-gray-600">Loading scan results...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Scan className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No YARA scan results found</p>
              <p className="text-sm">Results will appear here when the YARA scanner detects threats</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matched Rules
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.slice(0, 50).map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp || log.time)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={log.data?.file}>
                          {log.data?.file ? log.data.file.split('\\').pop() : 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.data?.file}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getThreatLevelColor(log)}`}>
                          {log.data?.matches?.length > 0 ? 
                            `${log.data.matches.length} rule${log.data.matches.length > 1 ? 's' : ''}` : 
                            'Clean'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.data?.matches?.length > 0 ? (
                          <div className="space-y-1">
                            {log.data.matches.slice(0, 3).map((match, idx) => (
                              <div key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                {match}
                              </div>
                            ))}
                            {log.data.matches.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{log.data.matches.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedRule({ ...log, type: 'scan_result' });
                            setShowRuleDetails(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rule Details Modal */}
      {showRuleDetails && selectedRule && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedRule.type === 'scan_result' ? 'Scan Result Details' : 'YARA Rule Details'}
                </h3>
                <button
                  onClick={() => setShowRuleDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                {selectedRule.type === 'scan_result' ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Detection Information</h4>
                      <div className="mt-2 space-y-2">
                        <div><strong>File:</strong> {selectedRule.data?.file}</div>
                        <div><strong>Event:</strong> {selectedRule.event}</div>
                        <div><strong>Timestamp:</strong> {formatTimestamp(selectedRule.timestamp)}</div>
                        {selectedRule.data?.matches && (
                          <div>
                            <strong>Matched Rules:</strong>
                            <ul className="mt-1 space-y-1">
                              {selectedRule.data.matches.map((match, idx) => (
                                <li key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                                  {match}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Raw Data</h4>
                      <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                        {JSON.stringify(selectedRule, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Rule Information</h4>
                      <div className="mt-2 space-y-2">
                        <div><strong>Filename:</strong> {selectedRule.filename}</div>
                        <div><strong>Size:</strong> {formatFileSize(selectedRule.size)}</div>
                        <div><strong>Modified:</strong> {new Date(selectedRule.modified).toLocaleString()}</div>
                        <div><strong>Path:</strong> {selectedRule.path}</div>
                      </div>
                    </div>
                    {selectedRule.content_preview && (
                      <div>
                        <h4 className="font-semibold text-gray-900">Rule Content Preview</h4>
                        <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                          {selectedRule.content_preview}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YaraScanner;
