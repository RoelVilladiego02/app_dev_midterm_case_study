import React, { useState } from 'react';
import { createTask } from '../services/taskService';
import TaskForm from './TaskForm';
import styles from '../componentsStyles/Modal.module.css';

const CreateTaskModal = ({ projectId, teamMembers, onClose, onTaskCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        status: 'todo',  // Always set to 'todo' for new tasks
        priority: formData.priority || 'medium',
        due_date: formData.due_date || null,
        completion_percentage: 0
      };
  
      console.log('Creating task with data:', taskData);
      const response = await createTask(projectId, taskData);
  
      console.log('Create task response:', response); // Add this line
  
      if (response.success) {
        if (onTaskCreated) {
          await onTaskCreated();
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to create task');
      }
    } catch (err) {
      console.error('Task creation error:', {
        error: err,
        response: err.response,
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Create New Task</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        
        <TaskForm
          teamMembers={teamMembers}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        initialData={{
            title: '',
            description: '',
            status: 'todo',
            priority: 'medium',
            due_date: '',
            assignee: ''
          }}
        />
      </div>
    </div>
  );
};

export default CreateTaskModal;