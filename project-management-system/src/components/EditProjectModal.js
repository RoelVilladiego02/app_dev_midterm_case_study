import React, { useState } from 'react';
import ProjectForm from './ProjectForm';
import { updateProject } from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const EditProjectModal = ({ project, onClose, onProjectUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (projectData) => {
    setIsLoading(true);
    setError('');
    try {
      await updateProject(project.id, projectData);
      if (onProjectUpdated) {
        await onProjectUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to update project:', err);
      setError(err.message || 'Failed to update project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Edit Project</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <ProjectForm 
          initialData={project}
          onSubmit={handleSubmit} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

export default EditProjectModal;
