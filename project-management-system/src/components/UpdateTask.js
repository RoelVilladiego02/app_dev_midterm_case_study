import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from './TaskForm';
import { fetchTasks, updateTask } from '../services/projectService';
import styles from '../componentsStyles/EditProject.module.css';

const UpdateTask = () => {
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId, taskId } = useParams();

  const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch task data
        const tasksResponse = await fetchTasks(projectId);
        const currentTask = tasksResponse.find(task => task.id.toString() === taskId);

        if (!currentTask) {
          throw new Error('Task not found');
        }

        setTask(currentTask);

        // Fetch users
        const usersResponse = await fetch(`${API_URL}/api/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          }
        });

        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }

        const usersData = await usersResponse.json();
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      }
    };

    fetchData();
  }, [projectId, taskId, API_URL]);

  const handleSubmit = async (taskData) => {
    setIsLoading(true);
    setError('');
    try {
      await updateTask(projectId, taskId, {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date,
        user_id: taskData.assignee, // Map the assignee field to user_id
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Update Task</h1>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className={styles.backButton}
        >
          Cancel Edit
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <TaskForm
        initialData={{
          ...task,
          assignee: task.user_id // Ensure the assignee is preselected with the user_id
        }}
        users={users}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isEditMode={true}
      />
    </div>
  );
};

export default UpdateTask;