import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from './TaskForm';
import { 
  fetchTasks, 
  updateTask, 
  fetchTeamMembers, 
  fetchAssignedUsers 
} from '../services/projectService';
import styles from '../componentsStyles/EditProject.module.css';

const UpdateTask = () => {
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId, taskId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch task data
        const tasksResponse = await fetchTasks(projectId);
        const currentTask = tasksResponse.find(task => task.id.toString() === taskId);

        if (!currentTask) {
          throw new Error('Task not found');
        }

        // Fetch team members
        const teamMembers = await fetchTeamMembers(projectId);
        
        // Fetch current assigned user
        const assignedUsers = await fetchAssignedUsers(projectId, taskId);
        
        // Create a complete task object with assignee information
        const taskWithAssignee = {
          ...currentTask,
          assignee: assignedUsers && assignedUsers.length > 0 ? assignedUsers[0].id : ''
        };
        
        setTask(taskWithAssignee);
        setUsers(teamMembers);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, taskId]);

  const handleSubmit = async (taskData) => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Submitting task update with data:', taskData);
      
      await updateTask(projectId, taskId, {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date,
        assignee: taskData.assignee // Use the assignee field directly
      });
      
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError('Failed to update task. Please try again.');
      console.error('Update task error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <p className={styles.loading}>Loading task data...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!task) return <p className={styles.notFound}>Task not found</p>;

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
        initialData={task}
        users={users}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isEditMode={true}
      />
    </div>
  );
};

export default UpdateTask;