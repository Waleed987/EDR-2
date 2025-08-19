import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Scan, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  RefreshCw,
  Home,
  FileText,
  TrendingUp,
  Globe,
  Bug,
  XCircle,
  Play
} from 'lucide-react';

function VirusTotal() {
  const [vtResults, setVtResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [scanOutput, setScanOutput] = useState('');
  const [stats, setStats] = useState({
    totalFiles: 0,
    maliciousFiles: 0,
    cleanFiles: 0,
    suspiciousFiles: 0,
    avgDetectionRatio: 0
  });

  // Fetch VirusTotal results
  const fetchVtResults = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.VIRUSTOTAL.RESULTS);
      setVtResults(response.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching VirusTotal results:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger VirusTotal scan
  const triggerVtScan = async () => {
    try {
      setScanning(true);
      setScanOutput('Starting VirusTotal scan...\n');
      
      const response = await axios.post(API_ENDPOINTS.VIRUSTOTAL.SCAN);
      
      if (response.data.status === 'completed') {
        setScanOutput(prev => prev + '\n=== SCAN COMPLETED ===\n');
        setScanOutput(prev => prev + response.data.stdout + '\n');
        if (response.data.stderr) {
          setScanOutput(prev => prev + '\nErrors:\n' + response.data.stderr);
        }
        // Refresh results after scan
        setTimeout(() => {
          fetchVtResults();
        }, 2000);
      }
    } catch (error) {
      console.error('Error triggering VirusTotal scan:', error);
      setScanOutput(prev => prev + '\nError: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (vtResults.length === 0) {
      setStats({
        totalFiles: 0,
        maliciousFiles: 0,
        cleanFiles: 0,
        suspiciousFiles: 0,
        avgDetectionRatio: 0
      });
      return;
    }

    const maliciousFiles = vtResults.filter(file => 
      file.vt_result && file.vt_result.malicious_count > 0
    ).length;
    
    const suspiciousFiles = vtResults.filter(file => 
      file.vt_result && file.vt_result.suspicious_count > 0
    ).length;
    
    const cleanFiles = vtResults.filter(file => 
      file.vt_result && file.vt_result.malicious_count === 0 && file.vt_result.suspicious_count === 0
    ).length;

    // Calculate average detection ratio
    const totalDetections = vtResults.reduce((sum, file) => {
      if (file.vt_result && file.vt_result.total_engines > 0) {
        return sum + (file.vt_result.malicious_count / file.vt_result.total_engines);
      }
      return sum;
    }, 0);
    
    const avgDetectionRatio = vtResults.length > 0 ? (totalDetections / vtResults.length) * 100 : 0;

    setStats({
      totalFiles: vtResults.length,
      maliciousFiles,
      cleanFiles,
      suspiciousFiles,
      avgDetectionRatio: Math.round(avgDetectionRatio * 100) / 100
    });
  };

  // Filter results based on search term
  const filteredResults = vtResults.filter(result => 
    JSON.stringify(result).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get threat level and color
  const getThreatLevel = (result) => {
    if (!result.vt_result) return { level: 'Unknown', color: 'text-gray-600 bg-gray-100' };
    
    const malicious = result.vt_result.malicious_count || 0;
    const suspicious = result.vt_result.suspicious_count || 0;
    const total = result.vt_result.total_engines || 1;
    
    if (malicious > total * 0.3) return { level: 'High Risk', color: 'text-red-600 bg-red-100' };
    if (malicious > total * 0.1 || suspicious > 0) return { level: 'Medium Risk', color: 'text-orange-600 bg-orange-100' };
    if (malicious > 0) return { level: 'Low Risk', color: 'text-yellow-600 bg-yellow-100' };
    return { level: 'Clean', color: 'text-green-600 bg-green-100' };
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Format VT timestamp (Unix timestamp)
  const formatVtTimestamp = (unixTimestamp) => {
    try {
      return new Date(unixTimestamp * 1000).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchVtResults();
    
    const interval = setInterval(() => {
      fetchVtResults();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Update stats when results change
  useEffect(() => {
    calculateStats();
  }, [vtResults]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">VirusTotal Integration</h1>
                <p className="text-sm text-gray-500">File reputation and threat intelligence analysis</p>
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
                onClick={triggerVtScan}
                disabled={scanning}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Play className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning...' : 'Start Scan'}</span>
              </button>
              <button
                onClick={fetchVtResults}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Files</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bug className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Malicious</p>
                <p className="text-2xl font-semibold text-red-600">{stats.maliciousFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clean</p>
                <p className="text-2xl font-semibold text-green-600">{stats.cleanFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Suspicious</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.suspiciousFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Detection</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.avgDetectionRatio}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Output */}
        {scanOutput && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-8 font-mono text-sm">
            <h3 className="text-white font-bold mb-2">Scan Output:</h3>
            <pre className="whitespace-pre-wrap max-h-64 overflow-y-auto">
              {scanOutput}
            </pre>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search VirusTotal results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredResults.length} of {vtResults.length} results
            </div>
          </div>
        </div>

        {/* VirusTotal Results */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">VirusTotal Scan Results</h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading VirusTotal results...</span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No VirusTotal results found</p>
              <p className="text-sm">Click "Start Scan" to check files against VirusTotal database</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detection Ratio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat Classification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Analysis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result, index) => {
                    const threatLevel = getThreatLevel(result);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            <div className="font-medium truncate" title={result.file_name}>
                              {result.file_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate" title={result.path}>
                              {result.path}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              SHA256: {result.sha256?.substring(0, 16)}...
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${threatLevel.color}`}>
                            {threatLevel.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.vt_result ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-red-600 font-semibold">
                                  {result.vt_result.malicious_count}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600">
                                  {result.vt_result.total_engines}
                                </span>
                              </div>
                              {result.vt_result.suspicious_count > 0 && (
                                <div className="text-xs text-orange-600">
                                  {result.vt_result.suspicious_count} suspicious
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {result.vt_result?.popular_threat_classification ? (
                            <div className="space-y-1">
                              <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                {result.vt_result.popular_threat_classification.suggested_threat_label}
                              </div>
                              {result.vt_result.popular_threat_classification.popular_threat_category?.slice(0, 2).map((cat, idx) => (
                                <div key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                  {cat.value} ({cat.count})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.vt_result?.last_analysis_date ? 
                            formatVtTimestamp(result.vt_result.last_analysis_date) : 
                            'Unknown'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedFile(result);
                              setShowFileDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Details
                          </button>
                          {result.vt_result?.permalink && (
                            <a
                              href={result.vt_result.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900 inline-flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              VT Report
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* File Details Modal */}
      {showFileDetails && selectedFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">VirusTotal File Analysis</h3>
                <button
                  onClick={() => setShowFileDetails(false)}
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
                    <h4 className="font-semibold text-gray-900">File Information</h4>
                    <div className="mt-2 space-y-2">
                      <div><strong>File Name:</strong> {selectedFile.file_name}</div>
                      <div><strong>Path:</strong> {selectedFile.path}</div>
                      <div><strong>SHA256:</strong> <span className="font-mono text-sm">{selectedFile.sha256}</span></div>
                      <div><strong>Scan Timestamp:</strong> {formatTimestamp(selectedFile.timestamp)}</div>
                    </div>
                  </div>
                  
                  {selectedFile.vt_result && (
                    <div>
                      <h4 className="font-semibold text-gray-900">VirusTotal Analysis</h4>
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-red-100 p-3 rounded">
                            <div className="text-sm text-red-800">Malicious Detections</div>
                            <div className="text-2xl font-bold text-red-600">
                              {selectedFile.vt_result.malicious_count}
                            </div>
                          </div>
                          <div className="bg-orange-100 p-3 rounded">
                            <div className="text-sm text-orange-800">Suspicious Detections</div>
                            <div className="text-2xl font-bold text-orange-600">
                              {selectedFile.vt_result.suspicious_count}
                            </div>
                          </div>
                          <div className="bg-green-100 p-3 rounded">
                            <div className="text-sm text-green-800">Clean</div>
                            <div className="text-2xl font-bold text-green-600">
                              {selectedFile.vt_result.harmless_count + selectedFile.vt_result.undetected_count}
                            </div>
                          </div>
                          <div className="bg-blue-100 p-3 rounded">
                            <div className="text-sm text-blue-800">Total Engines</div>
                            <div className="text-2xl font-bold text-blue-600">
                              {selectedFile.vt_result.total_engines}
                            </div>
                          </div>
                        </div>
                        
                        <div><strong>First Submitted:</strong> {formatVtTimestamp(selectedFile.vt_result.first_submitted)}</div>
                        <div><strong>Last Analysis:</strong> {formatVtTimestamp(selectedFile.vt_result.last_analysis_date)}</div>
                        
                        {selectedFile.vt_result.popular_threat_classification && (
                          <div>
                            <strong>Threat Classification:</strong>
                            <div className="mt-1">
                              <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm inline-block">
                                {selectedFile.vt_result.popular_threat_classification.suggested_threat_label}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Raw Data</h4>
                    <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                      {JSON.stringify(selectedFile, null, 2)}
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

export default VirusTotal;
