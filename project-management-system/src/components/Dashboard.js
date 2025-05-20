import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import styles from '../componentsStyles/Dashboard.module.css';
import Header from './Header';
import { fetchProjects, deleteProject, updateProject } from '../services/projectService';
import { fetchTasks } from '../services/taskService';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadUserAndProjects = async (retryCount = 0) => {
      setLoading(true);
      setError('');
      
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        }

        try {
          const projectsData = await fetchProjects();
          const updatedProjects = await Promise.all(projectsData.map(async (project) => {
            try {
              const projectTasks = await fetchTasks(project.id);
              if (projectTasks && projectTasks.length > 0 && project.status === 'pending') {
                await updateProject(project.id, { ...project, status: 'in_progress' });
                return { ...project, status: 'in_progress' };
              }
              return project;
            } catch (err) {
              console.error(`Error checking tasks for project ${project.id}:`, err);
              return project;
            }
          }));

          setProjects(updatedProjects);
        } catch (err) {
          if (err.message.includes('Too Many Attempts') && retryCount < MAX_RETRIES) {
            console.log(`Retrying after ${RETRY_DELAY}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
              loadUserAndProjects(retryCount + 1);
            }, RETRY_DELAY);
            return;
          }
          throw err;
        }
        
      } catch (err) {
        console.error('Dashboard load error:', err);
        const errorMessage = err.message === 'Session expired. Please login again.' ?
          'Your session has expired. Please login again.' :
          err.message.includes('Too Many Attempts') ?
          'Server is busy. Please wait a moment and try again.' :
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

  useEffect(() => {
    // Open create modal if redirected from reports page with state
    if (location.state?.openCreateModal) {
      setShowCreateModal(true);
      // Clear the state after handling
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAddProject = () => {
    setShowCreateModal(true);
  };

  const handleProjectCreated = async () => {
    try {
      const projectsData = await fetchProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Error refreshing projects:', err);
      setError('Failed to refresh projects');
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const handleProjectUpdated = async () => {
    try {
      const projectsData = await fetchProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Error refreshing projects:', err);
      setError('Failed to refresh projects');
    }
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
      
      <div className={styles.header}>
        <div className={styles.headerActions}>
          <button 
            className={styles.addButton} 
            onClick={handleAddProject}
          >
            + New Project
          </button>
          <Link 
            to="/reports" 
            className={styles.reportsButton}
          >
            📊 Analytics
          </Link>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <div className={styles.loadingContainer}>
          <p>Loading projects...</p>
        </div>
      ) : (
        <div className={styles.projectsList}>
          {projects.length > 0 ? (
            projects.map(project => (
              <div 
                key={project.id} 
                className={styles.projectItem}
                onClick={() => handleViewProject(project.id)}
              >
                <div className={styles.projectHeader}>
                  <h3>{project.title}</h3>
                  <span className={`${styles.projectRole} ${styles[project.role]}`}>
                    {project.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>
                
                {project.description && (
                  <p className={styles.description}>{project.description}</p>
                )}
                
                <div className={styles.projectDetails}>
                  {project.start_date && (
                    <p className={styles.projectMeta}>
                      Started: {new Date(project.start_date).toLocaleDateString()}
                    </p>
                  )}
                  <span className={`${styles.status} ${styles[project.status]}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                {isProjectOwner(project) && (
                  <div className={styles.projectActions}>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleEditProject(project);
                    }}>
                      Edit
                    </button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateContent}>
                <h2>Welcome to Project Management System!</h2>
                <p>You don't have any projects yet.</p>
                <button 
                  onClick={handleAddProject}
                  className={styles.createFirstProjectButton}
                >
                  Create Your First Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {showEditModal && selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProject(null);
          }}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
};

export default Dashboard;