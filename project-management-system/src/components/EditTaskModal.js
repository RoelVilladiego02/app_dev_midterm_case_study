import React, { useState, useEffect } from 'react';
import TaskForm from './TaskForm';
import { updateTask, fetchAssignedUsers } from '../services/taskService';
import { fetchTeamMembers } from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const EditTaskModal = ({ projectId, taskId, task, onClose, onTaskUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialData, setInitialData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assignedUsers, members] = await Promise.all([
          fetchAssignedUsers(projectId, taskId),
          fetchTeamMembers(projectId)
        ]);
        
        // Set initial data with the correct assignee field
        setInitialData({
          ...task,
          assignee: assignedUsers && assignedUsers.length > 0 ? assignedUsers[0].id : ''
        });
        setTeamMembers(members);
      } catch (err) {
        console.error('Failed to load task data or team members:', err);
        setError('Failed to load task data');
      }
    };

    loadData();
  }, [projectId, taskId, task]);

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    
    try {
      const taskData = {
        title: formData.title,
        description: formData.description || '',
        status: formData.status || 'todo',
        priority: formData.priority || 'medium',
        due_date: formData.due_date && formData.due_date !== '' ? formData.due_date : null,
        assignee: formData.assignee || null
      };

      // Validate required fields
      if (!taskData.title) {
        throw new Error('Title is required');
      }

      const response = await updateTask(projectId, taskId, taskData);
      console.log('Task update response:', response);
      
      if (onTaskUpdated) {
        await onTaskUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
      if (err.response?.data) {
        console.error('Full error response data:', err.response.data);
        if (err.response.data.errors) {
          const messages = Object.values(err.response.data.errors).flat().join(', ');
          setError(messages);
        } else if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError(err.message || 'Failed to update task');
        }
      } else {
        setError(err.message || 'Failed to update task');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialData) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Edit Task</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <TaskForm
          initialData={initialData}
          teamMembers={teamMembers}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isEditMode={true}
        />
      </div>
    </div>
  );
};

export default EditTaskModal;
