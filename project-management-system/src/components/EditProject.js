import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectForm from './ProjectForm';
import { fetchProjects, updateProject } from '../services/projectService';
import styles from '../componentsStyles/EditProject.module.css';

const EditProject = () => {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projects = await fetchProjects();
        const projectData = projects.find(p => p.id.toString() === projectId);
        
        if (!projectData) {
          throw new Error('Project not found');
        }
        
        setProject(projectData);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project data. Please try again.');
      }
    };
    
    loadProject();
  }, [projectId]);

  const handleSubmit = async (projectData) => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Updating project with data:', projectData); // Log the payload being sent
      await updateProject(projectId, projectData); // Ensure 'title' is sent
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to update project:', err); // Log the error details
      setError(err.message || 'Failed to update project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Edit Project</h1>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <ProjectForm 
        initialData={{
          title: project.title,
          description: project.description,
          start_date: project.start_date,
          end_date: project.end_date,
          status: project.status,
        }} 
        onSubmit={handleSubmit} 
        isLoading={isLoading} 
      />
    </div>
  );
};

export default EditProject;