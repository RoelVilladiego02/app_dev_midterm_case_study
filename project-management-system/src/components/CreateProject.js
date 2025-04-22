import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from './ProjectForm';
import { createProject } from '../services/projectService';
import styles from '../componentsStyles/CreateProject.module.css';

const CreateProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (projectData) => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Creating project with data:', { ...projectData, status: 'pending' }); // Log the payload being sent
      await createProject({ ...projectData, status: 'pending' }); // Ensure 'status' is set to 'pending'
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create New Project</h1>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <ProjectForm onSubmit={handleSubmit} isLoading={isLoading} title="Project Title" />
    </div>
  );
};

export default CreateProject;