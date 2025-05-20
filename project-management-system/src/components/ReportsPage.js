import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchProjects } from '../services/projectService';
import Header from './Header';
import ProjectProgress from './reports/ProjectProgress';
import BudgetAnalytics from './reports/BudgetAnalytics';
import TaskAnalytics from './reports/TaskAnalytics';
import RiskMatrix from './reports/RiskMatrix';
import styles from '../componentsStyles/ReportsPage.module.css';

const ReportsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromQuery = queryParams.get('projectId');

  const loadProjectsWithRetry = useCallback(async (retryCount = 0, maxRetries = 3) => {
    try {
      setLoading(true);
      const projectsData = await fetchProjects();
      
      if (projectIdFromQuery) {
        const selectedProject = projectsData.find(p => p.id.toString() === projectIdFromQuery);
        
        if (!selectedProject?.isOwner) {
          setError('You do not have permission to view analytics for this project');
          return;
        }

        if (selectedProject) {
          setProjects([selectedProject]);
          setSelectedProject(selectedProject.id);
        }
      } else {
        const ownedProjects = projectsData.filter(project => project.isOwner);
        
        if (ownedProjects.length === 0) {
          setError('No owned projects found. Only project owners can access analytics.');
          return;
        }

        setProjects(ownedProjects);
        if (ownedProjects.length > 0) {
          setSelectedProject(ownedProjects[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      
      if (err.message.includes('Too Many Attempts') && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`);
        setError(`Rate limit reached. Retrying in ${delay/1000} seconds...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadProjectsWithRetry(retryCount + 1, maxRetries);
      }
      
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [projectIdFromQuery]); // Add projectIdFromQuery as dependency

  useEffect(() => {
    const loadUserAndProjects = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }

        loadProjectsWithRetry();
      } catch (err) {
        setError('Failed to load projects');
      }
    };

    loadUserAndProjects();
  }, [loadProjectsWithRetry]); // Add loadProjectsWithRetry as dependency

  const handleBack = () => {
    if (projectIdFromQuery) {
      navigate(`/projects/${projectIdFromQuery}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return <div className={styles.loadingState}>Loading reports...</div>;
  }

  if (error) {
    return (
      <div>
        <Header user={user} />
        <div className={styles.reportsContainer}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
                ← Back to Dashboard
              </button>
            </div>
          </div>
          <div className={styles.errorState}>
            <div className={styles.errorMessage}>
              <h2>Access Restricted</h2>
              <p>{error}</p>
              <p>Analytics and reports are only available to project owners.</p>
              {error.includes('No owned projects') && (
                <div className={styles.createProjectSection}>
                  <p>Would you like to create your own project?</p>
                  <button 
                    onClick={() => navigate('/dashboard', { 
                      state: { openCreateModal: true },
                      replace: true 
                    })}
                    className={styles.createProjectButton}
                  >
                    Create a Project
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header user={user} />
      <div className={styles.reportsContainer}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={handleBack} className={styles.backButton}>
              ← Back to {projectIdFromQuery ? 'Project' : 'Dashboard'}
            </button>
            <h1>Project Reports & Analytics</h1>
          </div>
          
          {/* Only show project selector if not accessed from a specific project */}
          {!projectIdFromQuery && (
            <select
              className={styles.projectSelect}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedProject && (
          <div className={styles.reportsContent}>
            <div className={styles.reportSection}>
              <h2 className={styles.reportTitle}>Project Progress</h2>
              <ProjectProgress projectId={selectedProject} />
            </div>

            <div className={styles.reportSection}>
              <h2 className={styles.reportTitle}>Budget Analytics</h2>
              <BudgetAnalytics projectId={selectedProject} />
            </div>

            <div className={styles.reportSection}>
              <h2 className={styles.reportTitle}>Task Analytics</h2>
              <TaskAnalytics projectId={selectedProject} />
            </div>

            <div className={styles.reportSection}>
              <h2 className={styles.reportTitle}>Risk Analysis</h2>
              <RiskMatrix projectId={selectedProject} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
