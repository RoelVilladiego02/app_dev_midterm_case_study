import React, { useState } from 'react';
import axios from 'axios';

/**
 * A utility component for debugging task-related issues in the application
 * This can be mounted temporarily in your app to see what's happening with requests
 */
const TaskDebugger = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('request');
  const [requestDetails, setRequestDetails] = useState({
    method: 'POST',
    endpoint: `/api/projects/${projectId}/tasks`,
    body: {
      title: 'Debug Test Task',
      description: 'Task created for debugging',
      status: 'todo',
      priority: 'medium',
      cost: 0,
      completion_percentage: 0
    }
  });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const sendTestRequest = async () => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('auth_token');
    
    try {
      addLog(`Sending ${requestDetails.method} request to ${requestDetails.endpoint}`, 'info');
      
      const config = {
        method: requestDetails.method,
        url: `${API_URL}${requestDetails.endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        withCredentials: true
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(requestDetails.method)) {
        config.data = requestDetails.body;
        addLog(`Request body: ${JSON.stringify(requestDetails.body)}`, 'info');
      }
      
      const response = await axios(config);
      
      addLog(`Response status: ${response.status}`, 'success');
      addLog(`Response data: ${JSON.stringify(response.data)}`, 'success');
    } catch (error) {
      addLog(`Error status: ${error.response?.status || 'Unknown'}`, 'error');
      addLog(`Error: ${error.message}`, 'error');
      
      if (error.response?.data) {
        addLog(`Error details: ${JSON.stringify(error.response.data)}`, 'error');
      }
    }
  };

  const handleJsonChange = (e) => {
    try {
      const parsedJson = JSON.parse(e.target.value);
      setRequestDetails(prev => ({
        ...prev,
        body: parsedJson
      }));
    } catch (err) {
      // Ignore parse errors while typing
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // ... rest of your component code ...
  return (
    <div style={{ 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '5px',
      margin: '20px 0',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>Task API Debugger</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          style={{ 
            padding: '5px 10px', 
            backgroundColor: activeTab === 'request' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'request' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '3px 0 0 3px',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button 
          style={{ 
            padding: '5px 10px', 
            backgroundColor: activeTab === 'logs' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'logs' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderLeft: 'none',
            borderRadius: '0 3px 3px 0',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('logs')}
        >
          Logs ({logs.length})
        </button>
      </div>
      
      {/* ... rest of your JSX ... */}
      {activeTab === 'request' && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="method" style={{ display: 'block', marginBottom: '5px' }}>Method:</label>
            <select 
              id="method"
              value={requestDetails.method}
              onChange={(e) => setRequestDetails(prev => ({ ...prev, method: e.target.value }))}
              style={{ padding: '5px', width: '100%' }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="endpoint" style={{ display: 'block', marginBottom: '5px' }}>Endpoint:</label>
            <input 
              id="endpoint"
              type="text"
              value={requestDetails.endpoint}
              onChange={(e) => setRequestDetails(prev => ({ ...prev, endpoint: e.target.value }))}
              style={{ padding: '5px', width: '100%' }}
            />
          </div>
          
          {['POST', 'PUT', 'PATCH'].includes(requestDetails.method) && (
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="requestBody" style={{ display: 'block', marginBottom: '5px' }}>Request Body (JSON):</label>
              <textarea 
                id="requestBody"
                value={JSON.stringify(requestDetails.body, null, 2)}
                onChange={handleJsonChange}
                style={{ padding: '5px', width: '100%', height: '150px', fontFamily: 'monospace' }}
              />
            </div>
          )}
          
          <button 
            onClick={sendTestRequest}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: '#28a745', 
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Send Request
          </button>
        </div>
      )}
      
      {activeTab === 'logs' && (
        <div>
          <div style={{ 
            height: '250px', 
            overflowY: 'auto', 
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '3px',
            backgroundColor: '#fff',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {logs.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center' }}>No logs yet. Send a request to see the results.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '5px',
                  color: log.type === 'error' ? '#dc3545' : log.type === 'success' ? '#28a745' : '#212529'
                }}>
                  <span style={{ color: '#6c757d' }}>[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
          
          <button 
            onClick={clearLogs}
            style={{ 
              marginTop: '10px',
              padding: '5px 10px', 
              backgroundColor: '#6c757d', 
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Clear Logs
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskDebugger;
