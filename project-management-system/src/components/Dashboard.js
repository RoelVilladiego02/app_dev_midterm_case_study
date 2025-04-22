import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../componentsStyles/Dashboard.module.css';
import LogoutButton from './LogoutButton';
import { fetchProjects, deleteProject } from '../services/projectService';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  
    const loadProjects = async () => {
      setLoading(true);
      try {
        console.log('Fetching projects...');
        const token = localStorage.getItem('auth_token');
        console.log('Auth token:', token ? 'Present' : 'Missing');
        
        const projectsData = await fetchProjects();
        console.log('Projects loaded:', projectsData);
        setProjects(projectsData);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(`Failed to load projects. ${err.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
    };
  
    loadProjects();
  }, []);

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

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          {user && <p className={styles.welcome}>Welcome, {user.name}</p>}
        </div>
        <LogoutButton />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>My Projects</h2>
            <button className={styles.addButton} onClick={handleAddProject}>
              Add Project
            </button>
          </div>
          
          {projects.length > 0 ? (
            <div className={styles.projectsList}>
              {projects.map(project => (
                <div key={project.id} className={styles.projectItem}>
                  <div className={styles.projectInfo} onClick={() => handleViewProject(project.id)}>
                    <h3>{project.title}</h3>
                    {project.description && <p>{project.description}</p>}
                    {project.deadline && (
                      <p className={styles.deadline}>
                        Due: {new Date(project.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
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
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.placeholder}>
              <p>No projects yet. Create your first project!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;