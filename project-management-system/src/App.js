import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import ProjectView from './components/ProjectView';
import NotificationsPage from './components/NotificationsPage';
import './App.css';

/**
 * PrivateRoute component that protects routes requiring authentication
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {React.ReactElement} Protected route or redirect to login
 */
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('auth_token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * Main App component that handles routing and layout
 * @returns {React.ReactElement} The main application component
 */
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          
          {/* Project routes */}
          <Route
            path="/projects/:projectId"
            element={
              <PrivateRoute>
                <ProjectView />
              </PrivateRoute>
            }
          />

          {/* Notifications route */}
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <NotificationsPage />
              </PrivateRoute>
            }
          />
          
          {/* Default redirect to login */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;