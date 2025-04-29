import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../componentsStyles/Dashboard.module.css';
import Header from './Header';
import { fetchProjects, deleteProject } from '../services/projectService';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserAndProjects = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Check for auth token first
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Load user data
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }

        // Load projects with better error handling
        console.log('Initiating project fetch...');
        const projectsData = await fetchProjects();
        
        // Handle empty projects array gracefully
        if (!projectsData || projectsData.length === 0) {
          console.log('No projects found');
          setProjects([]);
        } else {
          console.log(`Successfully loaded ${projectsData.length} projects`);
          setProjects(projectsData);
        }
        
      } catch (err) {
        console.error('Dashboard load error:', err);
        const errorMessage = err.message === 'Session expired. Please login again.' ?
          'Your session has expired. Please login again.' :
          `Failed to load projects: ${err.message}`;
        
        setError(errorMessage);
        
        if (err.message.includes('Session expired')) {
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserAndProjects();
  }, [navigate]);

  const handleAddProject = () => {
    navigate('/projects/create');
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (projectId) => {
    navigate(`/projects/${projectId}/edit`);
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(projectId);
        setProjects(projects.filter(project => project.id !== projectId));
      } catch (err) {
        console.error('Error deleting project:', err);
        setError(err || 'Failed to delete project. Please try again.');
      }
    }
  };

  const isProjectOwner = (project) => {
    return project.isOwner;
  };

  return (
    <div className={styles.dashboardContainer}>
      <Header user={user} />
      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      ) : (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Projects</h2>
            <button className={styles.addButton} onClick={handleAddProject}>
              Add Project
            </button>
          </div>
          
          {projects.length > 0 ? (
            <div className={styles.projectsList}>
              {projects.map(project => (
                <div key={project.id} className={styles.projectItem}>
                  <div className={styles.projectInfo} onClick={() => handleViewProject(project.id)}>
                    <div className={styles.projectHeader}>
                      <h3>{project.title}</h3>
                      <span className={`${styles.projectRole} ${styles[project.role]}`}>
                        {project.role === 'owner' ? '(Owner)' : '(Team Member)'}
                      </span>
                    </div>
                    {project.description && <p>{project.description}</p>}
                    {project.start_date && (
                      <p className={styles.projectMeta}>
                        Start Date: {new Date(project.start_date).toLocaleDateString()}
                      </p>
                    )}
                    {project.end_date && (
                      <p className={styles.projectMeta}>
                        End Date: {new Date(project.end_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className={`${styles.status} ${styles[project.status]}`}>
                      Status: {project.status.replace('_', ' ')}
                    </p>
                  </div>
                  {isProjectOwner(project) && (
                    <div className={styles.projectActions}>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project.id);
                      }}>Edit</button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.placeholder}>
              <p>No projects yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;