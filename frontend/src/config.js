// API Configuration
export const API_BASE_URL = 'http://localhost:5000';

// API Endpoints
export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  LOGS: {
    ALL: `${API_BASE_URL}/api/logs/all`,
    ENDPOINT: `${API_BASE_URL}/api/logs/endpoint`,
    SEVERITY: `${API_BASE_URL}/api/logs/severity`,
    PROCESS_TREE: `${API_BASE_URL}/api/logs/process_tree`,
    DOWNLOADS: `${API_BASE_URL}/api/logs/downloads`
  },
  YARA: {
    LOGS: `${API_BASE_URL}/api/yara/logs`,
    RULES: `${API_BASE_URL}/api/yara/rules`
  },
  VIRUSTOTAL: {
    RESULTS: `${API_BASE_URL}/api/virustotal/results`,
    SCAN: `${API_BASE_URL}/api/virustotal/scan`
  },
  AI: {
    MODELS: `${API_BASE_URL}/api/ai/models`,
    TRAIN: `${API_BASE_URL}/api/ai/train`,
    PREDICTIONS: `${API_BASE_URL}/api/ai/predictions`
  },
  ALERTS: {
    HIGH_SEVERITY: `${API_BASE_URL}/api/alerts/high-severity`,
    MALWARE: `${API_BASE_URL}/api/alerts/malware`
  }
};

// Dashboard Configuration
export const DASHBOARD_CONFIG = {
  REFRESH_INTERVAL: 5000, // 5 seconds
  MAX_LOGS_DISPLAY: 100,
  SEVERITY_LEVELS: {
    LOW: 1,
    MEDIUM: 2,
    MEDIUM_HIGH: 3,
    HIGH: 4,
    CRITICAL: 5,
    EXTREME: 6
  }
};
