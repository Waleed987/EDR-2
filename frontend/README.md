# EDR Security Dashboard Frontend

A comprehensive React-based dashboard for monitoring and analyzing Endpoint Detection and Response (EDR) system logs in real-time.

## Features

### 🚨 Real-time Monitoring
- Live log streaming from multiple sources
- Auto-refresh every 5 seconds
- Real-time threat detection and alerting

### 📊 Interactive Visualizations
- **Threat Severity Distribution**: Pie chart showing threat levels
- **Network Activity Timeline**: 24-hour network connection monitoring
- **Event Type Distribution**: Bar chart of different event categories
- **Process Tree Visualization**: Parent-child process relationships

### 🔍 Advanced Log Management
- **Multi-source Logs**: 
  - Endpoint logs (process creation, network connections)
  - Severity scores (threat assessment)
  - Process tree logs (hierarchical relationships)
  - Download logs (file activity monitoring)
- **Smart Filtering**: Search by event type, severity, or text content
- **Real-time Search**: Instant filtering as you type

### 🎯 Security Analytics
- **Threat Scoring**: 6-level severity classification system
- **Suspicious Activity Detection**: Automatic flagging of suspicious processes
- **Network Monitoring**: IP address tracking and connection analysis
- **Autorun Detection**: Startup program monitoring

### 📱 Responsive Design
- Mobile-first responsive layout
- Professional security analyst interface
- Dark/light theme support
- Optimized for all screen sizes

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Backend EDR server running on port 5000

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:5173`

### Backend Requirements

Ensure your EDR backend server is running and provides the following API endpoints:

- `GET /api/logs/all` - All logs combined
- `GET /api/logs/endpoint` - Endpoint activity logs
- `GET /api/logs/severity` - Threat severity scores
- `GET /api/logs/process_tree` - Process hierarchy logs
- `GET /api/logs/downloads` - File download logs

## Dashboard Components

### 1. Header Section
- **System Status**: Live/pause toggle for real-time monitoring
- **Refresh Controls**: Manual refresh and auto-update settings
- **Connection Status**: Backend connectivity indicator

### 2. Statistics Cards
- **Total Events**: Count of all monitored events
- **High Severity**: Number of critical threats (score 4+)
- **Suspicious Processes**: Detected suspicious activities
- **Network Connections**: Active network connections
- **Autorun Entries**: Startup program count

### 3. Visualization Charts
- **Threat Severity Pie Chart**: Color-coded threat levels
- **Network Activity Area Chart**: 24-hour connection timeline
- **Event Distribution Bar Chart**: Event type breakdown

### 4. Log Management
- **Search & Filter**: Text search and event type filtering
- **Real-time Table**: Live log display with pagination
- **Detail View**: Expandable log entry details

## Configuration

### API Settings
Edit `src/config.js` to customize:
- Backend server URL
- Refresh intervals
- Display limits
- Severity thresholds

### Styling
The dashboard uses Tailwind CSS for styling. Customize colors and themes in:
- `src/index.css`
- `tailwind.config.js`

## Security Features

### Threat Detection
- **Process Monitoring**: Suspicious process creation detection
- **Network Analysis**: Untrusted IP and port monitoring
- **File Activity**: Suspicious download and execution tracking
- **Autorun Scanning**: Malicious startup program detection

### Severity Classification
- **Level 1-2**: Low risk (Green)
- **Level 3**: Medium risk (Yellow)
- **Level 4**: High risk (Orange)
- **Level 5**: Critical risk (Red)
- **Level 6**: Extreme risk (Brown)

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
│   └── Dashboard.jsx   # Main dashboard
├── config.js           # Configuration and constants
├── App.jsx             # Main app component
└── main.jsx            # Entry point
```

### Adding New Features
1. **New Log Sources**: Add API endpoints in `config.js`
2. **New Charts**: Import additional Recharts components
3. **Custom Filters**: Extend the filtering logic in Dashboard.jsx
4. **Real-time Updates**: Modify the refresh interval in config

### Testing
```bash
# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check if backend server is running on port 5000
   - Verify CORS settings in backend
   - Check network connectivity

2. **Charts Not Rendering**
   - Ensure Recharts is properly installed
   - Check data format from API
   - Verify responsive container setup

3. **Real-time Updates Not Working**
   - Check browser console for errors
   - Verify interval configuration
   - Ensure backend endpoints are responding

### Performance Optimization
- Limit displayed logs to prevent memory issues
- Use pagination for large datasets
- Implement virtual scrolling for very long lists
- Optimize chart rendering with proper data structures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the EDR Security System. See the main project license for details.

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
