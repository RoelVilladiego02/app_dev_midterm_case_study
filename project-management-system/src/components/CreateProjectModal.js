import React, { useState } from 'react';
import ProjectForm from './ProjectForm';
import { createProject } from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const CreateProjectModal = ({ onClose, onProjectCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (projectData) => {
    setIsLoading(true);
    setError('');
    try {
      await createProject(projectData);
      if (onProjectCreated) {
        await onProjectCreated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Create New Project</h2>
          <button 
            onClick={onClose}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <ProjectForm 
          onSubmit={handleSubmit} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export default CreateProjectModal;
