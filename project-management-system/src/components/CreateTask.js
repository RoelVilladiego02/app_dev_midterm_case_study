import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from './TaskForm';
import { createTask } from '../services/projectService';

const CreateTask = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users. Please try again.');
      }
    };
    
    fetchUsers();
  }, [API_URL]);

  const handleSubmit = async (taskData) => {
    setIsLoading(true);
    setError('');
    try {
      await createTask(projectId, {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date,
        user_id: taskData.assignee, // Map the assignee field to user_id
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError('Failed to create task. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Create Task</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <TaskForm 
        users={users} 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
      />
    </div>
  );
};

export default CreateTask;