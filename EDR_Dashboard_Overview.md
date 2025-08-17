# EDR Security Dashboard System Overview

## 🚀 Project Summary

The EDR Security Dashboard is a comprehensive, real-time monitoring system designed for security analysts to monitor endpoint activities, detect threats, and analyze security events across an organization's infrastructure.

## 🏗️ System Architecture

### Frontend (React + Vite)
- **Technology Stack**: React 19, Vite, Tailwind CSS, Recharts
- **Key Features**: Real-time dashboard, interactive charts, responsive design
- **Port**: 5173 (development)

### Backend (Flask + MongoDB)
- **Technology Stack**: Python Flask, MongoDB, CORS support
- **Key Features**: Log ingestion, API endpoints, data processing
- **Port**: 5000

### Data Sources
- **Log Files**: JSON-based log files in the `logs/` directory
- **Real-time Processing**: Continuous monitoring and analysis
- **Data Types**: Endpoint logs, severity scores, process trees, downloads

## 📊 Dashboard Features

### 1. Real-time Monitoring
- **Live Updates**: 5-second refresh intervals
- **Multi-source Integration**: Combines data from multiple log sources
- **Status Indicators**: Visual feedback for system health

### 2. Security Analytics
- **Threat Scoring**: 6-level severity classification system
- **Process Monitoring**: Suspicious activity detection
- **Network Analysis**: Connection monitoring and IP tracking
- **File Activity**: Download and execution monitoring

### 3. Interactive Visualizations
- **Threat Severity Distribution**: Pie chart with color coding
- **Network Activity Timeline**: 24-hour connection patterns
- **Event Type Distribution**: Bar chart of security events
- **Process Tree Visualization**: Hierarchical process relationships

### 4. Advanced Log Management
- **Smart Filtering**: Search by event type, severity, or content
- **Real-time Search**: Instant filtering capabilities
- **Detail Views**: Expandable log entry information
- **Pagination**: Efficient handling of large datasets

## 🔧 Technical Implementation

### Frontend Components
```jsx
// Main Dashboard Structure
- Header: System status and controls
- Statistics Cards: Key metrics display
- Charts: Interactive visualizations
- Log Table: Real-time log display
- Search & Filter: Advanced filtering system
```

### Backend API Endpoints
```python
GET /api/logs/all          # Combined log data
GET /api/logs/endpoint     # Endpoint activity logs
GET /api/logs/severity     # Threat severity scores
GET /api/logs/process_tree # Process hierarchy data
GET /api/logs/downloads    # File download logs
```

### Data Flow
1. **Log Generation**: EDR agents generate security logs
2. **Data Collection**: Backend reads and processes log files
3. **API Serving**: Flask serves data via REST endpoints
4. **Frontend Display**: React dashboard renders real-time data
5. **User Interaction**: Analysts filter, search, and analyze data

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (optional, for advanced features)
- EDR agent logs in the `logs/` directory

### Quick Start
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EDR-2
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../edr_server
   pip install -r requirements.txt
   ```

3. **Start the system**
   ```bash
   # Windows
   start_dashboard.bat
   
   # PowerShell
   .\start_dashboard.ps1
   
   # Manual start
   # Terminal 1: Backend
   cd edr_server && python app.py
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

4. **Access the dashboard**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
EDR-2/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   └── Dashboard.jsx # Main dashboard component
│   │   ├── config.js         # Configuration and constants
│   │   └── App.jsx           # Main app component
│   ├── package.json          # Frontend dependencies
│   └── README.md             # Frontend documentation
├── edr_server/               # Flask backend server
│   ├── app.py                # Main Flask application
│   ├── modules/
│   │   └── mongo_writer.py   # Database operations
│   └── config.py             # Backend configuration
├── logs/                     # EDR log files
│   ├── endpoint_logs.json    # Endpoint activity logs
│   ├── severity_scores.json  # Threat severity data
│   ├── process_tree_logs.json # Process hierarchy logs
│   └── downloads_log.json    # File download logs
├── start_dashboard.bat       # Windows startup script
├── start_dashboard.ps1       # PowerShell startup script
└── EDR_Dashboard_Overview.md # This document
```

## 🔒 Security Features

### Threat Detection
- **Process Monitoring**: Suspicious process creation detection
- **Network Analysis**: Untrusted IP and port monitoring
- **File Activity**: Suspicious download and execution tracking
- **Autorun Scanning**: Malicious startup program detection

### Severity Classification
- **Level 1-2**: Low risk (Green) - Normal system activity
- **Level 3**: Medium risk (Yellow) - Unusual but not critical
- **Level 4**: High risk (Orange) - Suspicious activity detected
- **Level 5**: Critical risk (Red) - High probability of threat
- **Level 6**: Extreme risk (Brown) - Immediate action required

## 📈 Performance & Scalability

### Optimization Features
- **Efficient Rendering**: React optimization for large datasets
- **Smart Pagination**: Limit displayed logs to prevent memory issues
- **Chart Optimization**: Responsive charts with proper data structures
- **Real-time Updates**: Efficient polling with configurable intervals

### Scalability Considerations
- **Data Volume**: Handles thousands of log entries efficiently
- **User Load**: Supports multiple concurrent analysts
- **Storage**: Efficient log file processing and management
- **Network**: Optimized API responses and data transfer

## 🛠️ Customization & Extension

### Adding New Data Sources
1. **Create new log file** in the `logs/` directory
2. **Add API endpoint** in `edr_server/app.py`
3. **Update frontend** to handle new data type
4. **Add visualization** if needed

### Customizing Charts
- **Chart Types**: Extend with additional Recharts components
- **Data Processing**: Modify chart data preparation functions
- **Styling**: Customize colors, themes, and layouts
- **Interactivity**: Add tooltips, zoom, and drill-down features

### Adding New Features
- **Alerting**: Implement real-time notifications
- **Reporting**: Generate PDF/Excel reports
- **User Management**: Add authentication and role-based access
- **Integration**: Connect with external security tools

## 🔍 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check if backend server is running on port 5000
   - Verify CORS settings in backend
   - Check network connectivity and firewall settings

2. **Charts Not Rendering**
   - Ensure Recharts is properly installed
   - Check data format from API endpoints
   - Verify responsive container setup and CSS

3. **Real-time Updates Not Working**
   - Check browser console for JavaScript errors
   - Verify interval configuration in config.js
   - Ensure backend endpoints are responding correctly

4. **Performance Issues**
   - Reduce refresh interval for large datasets
   - Implement pagination for log tables
   - Optimize chart rendering with data limits

### Debug Mode
- **Frontend**: Check browser developer tools console
- **Backend**: Monitor Flask server logs for errors
- **Data**: Verify log file formats and API responses
- **Network**: Use browser network tab to debug API calls

## 🚀 Future Enhancements

### Planned Features
- **Machine Learning Integration**: AI-powered threat detection
- **Advanced Analytics**: Predictive security analytics
- **Mobile App**: Native mobile dashboard application
- **Cloud Integration**: Multi-cloud EDR monitoring
- **API Gateway**: RESTful API for external integrations

### Technology Upgrades
- **Real-time WebSockets**: Replace polling with WebSocket connections
- **GraphQL**: Implement GraphQL for flexible data queries
- **Microservices**: Break down into microservice architecture
- **Containerization**: Docker and Kubernetes deployment
- **CI/CD Pipeline**: Automated testing and deployment

## 📚 Additional Resources

### Documentation
- **Frontend README**: `frontend/README.md`
- **API Documentation**: Backend endpoint documentation
- **Configuration Guide**: System configuration options
- **Troubleshooting Guide**: Common issues and solutions

### Support
- **Development Team**: Contact for technical support
- **Issue Tracking**: GitHub issues for bug reports
- **Feature Requests**: Submit enhancement proposals
- **Community**: Join security analyst community discussions

---

## 🎯 Conclusion

The EDR Security Dashboard provides security analysts with a powerful, real-time monitoring platform for endpoint security. With its comprehensive feature set, interactive visualizations, and scalable architecture, it serves as a critical tool for modern security operations.

The system successfully combines real-time data processing, advanced visualization, and user-friendly interfaces to deliver actionable security intelligence. Its modular design allows for easy customization and extension to meet specific organizational needs.

For questions, support, or contributions, please refer to the project documentation or contact the development team.
