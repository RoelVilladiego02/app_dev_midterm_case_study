import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from './TaskForm';
import { createTask, fetchTeamMembers } from '../services/projectService';
import styles from '../componentsStyles/CreateProject.module.css';

const CreateTask = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const fetchProjectTeam = async () => {
      try {
        const members = await fetchTeamMembers(projectId);
        setTeamMembers(members);
      } catch (err) {
        console.error('Failed to fetch team members:', err);
        setError('Failed to load team members. Please try again.');
      }
    };
    
    fetchProjectTeam();
  }, [projectId]);

  const handleSubmit = async (taskData) => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Creating task with data:', taskData);
      await createTask(projectId, {
        title: taskData.title,
        description: taskData.description || '',
        status: 'todo',
        priority: taskData.priority,
        due_date: taskData.due_date || null,
        assigned_to: parseInt(taskData.assignee), // Ensure assignee is sent as assigned_to
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Task creation error:', err);
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create Task</h1>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className={styles.backButton}
        >
          Back to Project
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <TaskForm 
        users={teamMembers} 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
      />
    </div>
  );
};

export default CreateTask;