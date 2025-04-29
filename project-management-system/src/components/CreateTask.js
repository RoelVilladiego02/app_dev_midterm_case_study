import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskForm from './TaskForm';
import { createTask, fetchTeamMembers, fetchSingleProject } from '../services/projectService';
import styles from '../componentsStyles/CreateProject.module.css';

const CreateTask = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // First fetch project to verify access and get team members
        const projectData = await fetchSingleProject(projectId);
        if (!projectData) {
          throw new Error('Project not found');
        }

        // Verify user has permission to add tasks
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (!currentUser) {
          throw new Error('User session not found');
        }

        // Check project access with null safety
        const isProjectOwner = projectData.isOwner || false;
        const isTeamMember = Array.isArray(projectData.teamMembers) && 
          projectData.teamMembers.some(m => m && m.id === currentUser.id);

        if (!isProjectOwner && !isTeamMember) {
          throw new Error('You do not have permission to add tasks to this project');
        }

        // Get team members directly from project data or fetch separately
        let teamMembersList = [];
        if (projectData.teamMembers && Array.isArray(projectData.teamMembers)) {
          teamMembersList = projectData.teamMembers;
        } else {
          teamMembersList = await fetchTeamMembers(projectId);
        }

        console.log('Team members loaded:', teamMembersList);

        // Add project owner to team members if not already included
        if (projectData.owner && !teamMembersList.some(m => m.id === projectData.owner.id)) {
          teamMembersList = [...teamMembersList, projectData.owner];
        }

        // Filter out invalid members and duplicates
        const validMembers = teamMembersList
          .filter(member => member && member.id)
          .filter((member, index, self) => 
            index === self.findIndex(m => m.id === member.id)
          );

        if (validMembers.length === 0) {
          throw new Error('No team members available. Please add team members first.');
        }

        setTeamMembers(validMembers);
      } catch (err) {
        console.error('Failed to load project data:', err);
        setError(err.message || 'Failed to load project data. Please try again.');
        
        if (err.message.includes('session') || err.message.includes('login')) {
          navigate('/login');
        } else if (err.message.includes('permission') || err.message.includes('access')) {
          navigate(`/projects/${projectId}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId, navigate]);

  const handleSubmit = async (taskData) => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Creating task with data:', taskData);
      await createTask(projectId, {
        title: taskData.title,
        description: taskData.description || '',
        status: 'todo',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        assignee: taskData.assignee
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Task creation error:', err);
      setError(err.message || 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Create Task</h1>
          <button onClick={() => navigate(`/projects/${projectId}`)} className={styles.backButton}>
            Back to Project
          </button>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create Task</h1>
        <button onClick={() => navigate(`/projects/${projectId}`)} className={styles.backButton}>
          Back to Project
        </button>
      </div>
      <TaskForm 
        users={teamMembers}
        onSubmit={handleSubmit} 
        isLoading={isLoading}
      />
    </div>
  );
};

export default CreateTask;