import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Dashboard from './components/Dashboard';
import CreateProject from './components/CreateProject';
import EditProject from './components/EditProject';
import ProjectView from './components/ProjectView';
import CreateTask from './components/CreateTask';
import UpdateTask from './components/UpdateTask';
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
            path="/projects/create"
            element={
              <PrivateRoute>
                <CreateProject />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <PrivateRoute>
                <ProjectView />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/edit"
            element={
              <PrivateRoute>
                <EditProject />
              </PrivateRoute>
            }
          />
          
          {/* Task routes */}
          <Route
            path="/projects/:projectId/tasks/create"
            element={
              <PrivateRoute>
                <CreateTask />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:projectId/tasks/:taskId/edit"
            element={
              <PrivateRoute>
                <UpdateTask />
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