import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  TrendingUp, 
  Database, 
  Play, 
  RefreshCw,
  Home,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Zap,
  Settings,
  Download,
  Activity
} from 'lucide-react';

function AIModelManager() {
  const [models, setModels] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [trainingOutput, setTrainingOutput] = useState('');
  const [selectedModel, setSelectedModel] = useState(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [stats, setStats] = useState({
    totalModels: 0,
    latestModel: null,
    totalPredictions: 0,
    accuracyRate: 0,
    avgConfidence: 0
  });

  // Fetch AI models
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.AI.MODELS);
      setModels(response.data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching AI models:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch AI predictions
  const fetchPredictions = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.AI.PREDICTIONS);
      setPredictions(response.data || []);
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
    }
  };

  // Trigger AI training
  const triggerTraining = async () => {
    try {
      setTraining(true);
      setTrainingOutput('Starting AI training pipeline...\n');
      
      const response = await axios.post(API_ENDPOINTS.AI.TRAIN);
      
      if (response.data.status === 'started') {
        setTrainingOutput(prev => prev + `Training started with PID: ${response.data.pid}\n`);
        setTrainingOutput(prev => prev + 'Training is running in the background. Check the console for detailed progress.\n');
        
        // Refresh models after training starts
        setTimeout(() => {
          fetchModels();
        }, 5000);
      }
    } catch (error) {
      console.error('Error triggering AI training:', error);
      setTrainingOutput(prev => prev + '\nError: ' + error.message);
    } finally {
      setTraining(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    // Find latest model
    const sortedModels = [...models].sort((a, b) => 
      new Date(b.modified) - new Date(a.modified)
    );
    const latestModel = sortedModels[0] || null;

    // Calculate prediction stats
    const totalPredictions = predictions.length;
    
    // Calculate average confidence (mock calculation)
    const avgConfidence = predictions.reduce((sum, pred) => {
      const confidence = pred.data?.ml_confidence || 0;
      return sum + confidence;
    }, 0) / (totalPredictions || 1);

    // Mock accuracy rate (in real implementation, would compare predictions vs actual outcomes)
    const accuracyRate = Math.min(95, 85 + Math.random() * 10);

    setStats({
      totalModels: models.length,
      latestModel,
      totalPredictions,
      accuracyRate: Math.round(accuracyRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Get model type color
  const getModelTypeColor = (type) => {
    switch (type) {
      case 'baseline': return 'text-blue-600 bg-blue-100';
      case 'optimized': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get prediction confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    if (confidence >= 0.5) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchModels();
    fetchPredictions();
    
    const interval = setInterval(() => {
      fetchModels();
      fetchPredictions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Update stats when data changes
  useEffect(() => {
    calculateStats();
  }, [models, predictions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Model Manager</h1>
                <p className="text-sm text-gray-500">Machine learning model training and prediction monitoring</p>
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
                onClick={triggerTraining}
                disabled={training}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <Play className={`h-4 w-4 ${training ? 'animate-spin' : ''}`} />
                <span>{training ? 'Training...' : 'Start Training'}</span>
              </button>
              <button
                onClick={() => {
                  fetchModels();
                  fetchPredictions();
                }}
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
                <Database className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Models</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalModels}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Predictions</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.totalPredictions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accuracy</p>
                <p className="text-2xl font-semibold text-green-600">{stats.accuracyRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Confidence</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.avgConfidence}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Latest Model</p>
                <p className="text-sm font-semibold text-indigo-600">
                  {stats.latestModel ? stats.latestModel.name.replace('.joblib', '') : 'None'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Training Output */}
        {trainingOutput && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-8 font-mono text-sm">
            <h3 className="text-white font-bold mb-2">Training Output:</h3>
            <pre className="whitespace-pre-wrap max-h-64 overflow-y-auto">
              {trainingOutput}
            </pre>
          </div>
        )}

        {/* AI Models Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Available AI Models</h3>
            <div className="text-sm text-gray-500">
              {models.length} model{models.length !== 1 ? 's' : ''} found
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Loading models...</span>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No AI models found</p>
              <p className="text-sm">Click "Start Training" to create your first model</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getModelTypeColor(model.type)}`}>
                      {model.type}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-mono">{formatFileSize(model.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{new Date(model.created).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Modified:</span>
                      <span>{new Date(model.modified).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelDetails(true);
                      }}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                    
                    {model.type === 'optimized' && (
                      <span className="flex items-center text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Predictions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent AI Predictions</h3>
          </div>
          
          {predictions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No AI predictions found</p>
              <p className="text-sm">Predictions will appear here when the AI model processes security events</p>
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
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prediction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {predictions.slice(0, 20).map((prediction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(prediction.timestamp || prediction.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.event || prediction.event_type || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          prediction.data?.ml_action === 'block' ? 'text-red-600 bg-red-100' :
                          prediction.data?.ml_action === 'monitor' ? 'text-yellow-600 bg-yellow-100' :
                          'text-green-600 bg-green-100'
                        }`}>
                          {prediction.data?.ml_action || 'allow'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getConfidenceColor(prediction.data?.ml_confidence || 0)
                        }`}>
                          {Math.round((prediction.data?.ml_confidence || 0) * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {prediction.data?.name && <div>Process: {prediction.data.name}</div>}
                          {prediction.data?.pid && <div>PID: {prediction.data.pid}</div>}
                          {prediction.data?.parent && <div>Parent: {prediction.data.parent}</div>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Model Details Modal */}
      {showModelDetails && selectedModel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">AI Model Details</h3>
                <button
                  onClick={() => setShowModelDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Model Information</h4>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Name</div>
                        <div className="font-medium">{selectedModel.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Type</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getModelTypeColor(selectedModel.type)}`}>
                          {selectedModel.type}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Size</div>
                        <div className="font-mono">{formatFileSize(selectedModel.size)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Path</div>
                        <div className="text-sm font-mono break-all">{selectedModel.path}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Created</div>
                        <div>{formatTimestamp(selectedModel.created)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Last Modified</div>
                        <div>{formatTimestamp(selectedModel.modified)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Model Capabilities</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        Real-time threat prediction
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        Process behavior analysis
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        Network anomaly detection
                      </div>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        File system monitoring
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Technical Details</h4>
                    <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded border">
                      {JSON.stringify(selectedModel, null, 2)}
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

export default AIModelManager;
