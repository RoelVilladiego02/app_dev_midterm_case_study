import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProjects, fetchTasks, deleteTask } from '../services/projectService';
import styles from '../componentsStyles/ProjectView.module.css';

const ProjectView = () => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load project data
        const projects = await fetchProjects();
        const projectData = projects.find(p => p.id.toString() === projectId);
        
        if (!projectData) {
          throw new Error('Project not found');
        }
        
        setProject(projectData);
        
        // Load project tasks
        const tasksData = await fetchTasks(projectId);
        setTasks(tasksData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load project data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [projectId]);
  
  const handleAddTask = () => {
    navigate(`/projects/${projectId}/tasks/create`);
  };
  
  const handleEditTask = (taskId) => {
    navigate(`/projects/${projectId}/tasks/${taskId}/edit`);
  };
  
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(projectId, taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
      } catch (err) {
        console.error('Error deleting task:', err);
        setError('Failed to delete task. Please try again.');
      }
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!project) return <p>Project not found</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{project.title}</h1>
          <p className={styles.description}>{project.description}</p>
          {project.deadline && (
            <p className={styles.deadline}>Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
          )}
        </div>
        <div className={styles.actions}>
          <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
            Back to Dashboard
          </button>
          <button onClick={() => navigate(`/projects/${projectId}/edit`)} className={styles.editButton}>
            Edit Project
          </button>
        </div>
      </div>
      
      <div className={styles.tasksSection}>
        <div className={styles.sectionHeader}>
          <h2>Tasks</h2>
          <button onClick={handleAddTask} className={styles.addButton}>
            Add Task
          </button>
        </div>
        
        {tasks.length > 0 ? (
          <div className={styles.tasksList}>
            {tasks.map(task => (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskContent}>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className={styles.taskMeta}>
                    <span className={`${styles.status} ${styles[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <span className={styles.priority}>Priority: {task.priority}</span>
                    {task.due_date && (
                      <span className={styles.dueDate}>
                        Due Date: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assigned_user && (
                      <span className={styles.assignee}>
                        Assigned to: {task.assigned_user.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.taskActions}>
                  <button onClick={() => handleEditTask(task.id)}>Edit</button>
                  <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No tasks yet. Add your first task!</p>
        )}
      </div>
    </div>
  );
};

export default ProjectView;