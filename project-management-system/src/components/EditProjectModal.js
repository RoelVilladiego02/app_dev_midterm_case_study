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

  const handleCompleteProject = async () => {
    if (!window.confirm('Are you sure you want to mark this project as completed? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await updateProject(project.id, { ...project, status: 'completed' });
      if (onProjectUpdated) {
        await onProjectUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to complete project:', err);
      setError(err.message || 'Failed to complete project. Please try again.');
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
        {project.status !== 'completed' && (
          <div className={styles.completeProjectSection}>
            <button 
              onClick={handleCompleteProject}
              className={styles.completeButton}
              disabled={isLoading}
            >
              Mark Project as Completed
            </button>
          </div>
        )}
        <ProjectForm 
          initialData={{
            title: project.title,
            description: project.description,
            start_date: project.start_date,
            end_date: project.end_date,
            status: project.status,
            total_budget: project.total_budget,
          }} 
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          isCompleted={project.status === 'completed'} 
        />
      </div>
    </div>
  );
};

export default EditProjectModal;
