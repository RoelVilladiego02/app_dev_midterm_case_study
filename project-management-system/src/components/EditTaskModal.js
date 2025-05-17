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
        
        // Make sure we pass the completion_percentage from the task data
        setInitialData({
          ...task,
          assignee: assignedUsers && assignedUsers.length > 0 ? assignedUsers[0].id : '',
          completion_percentage: task.completion_percentage || 0
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
      // Preserve completion_percentage exactly as provided
      const taskData = {
        title: formData.title,
        description: formData.description || '',
        status: formData.status,
        priority: formData.priority || 'medium',
        due_date: formData.due_date && formData.due_date !== '' ? formData.due_date : null,
        assignee: formData.assignee || null,
        completion_percentage: formData.completion_percentage
      };

      console.log('Submitting task update:', {
        taskId,
        originalPercentage: task.completion_percentage,
        newPercentage: taskData.completion_percentage,
        status: taskData.status
      });

      const response = await updateTask(projectId, taskId, taskData);
      console.log('Task update response:', response);
      
      if (onTaskUpdated) {
        await onTaskUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.message || 'Failed to update task');
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
