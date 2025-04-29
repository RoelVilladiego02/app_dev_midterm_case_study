import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchProjects, 
  fetchTasks, 
  deleteTask, 
  fetchTeamMembers, 
  removeTeamMember 
} from '../services/projectService';
import styles from '../componentsStyles/ProjectView.module.css';
import AssignUserModal from './AssignUserModal';
import TeamMemberModal from './TeamMemberModal';

const ProjectView = () => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  // Add a timestamp state to force refresh when needed
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading project data for ID:', projectId);
        
        // Load project data
        const projects = await fetchProjects();
        console.log('All projects:', projects);
        
        const projectData = projects.find(p => p.id.toString() === projectId);
        console.log('Found project:', projectData);
        
        if (!projectData) {
          throw new Error(`Project with ID ${projectId} not found`);
        }
        
        setProject(projectData);
        
        // Check if current user is the project owner
        const currentUser = JSON.parse(localStorage.getItem('user'));
        setIsOwner(projectData.user_id === currentUser.id);
        
        // Load project tasks
        console.log('Loading tasks...');
        const tasksData = await fetchTasks(projectId);
        console.log('Tasks loaded:', tasksData);
        setTasks(tasksData);

        // Load team members
        console.log('Loading team members...');
        const teamData = await fetchTeamMembers(projectId);
        console.log('Team members loaded:', teamData);
        setTeamMembers(teamData);
      } catch (err) {
        console.error('Error in loadData:', err);
        setError(err.message || 'Failed to load project data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // Adding refreshTimestamp to dependencies to trigger reload when it changes
  }, [projectId, refreshTimestamp]);
  
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

  const handleShowAssignModal = (taskId) => {
    setSelectedTaskId(taskId);
    setShowAssignModal(true);
  };

  const handleRemoveTeamMember = async (userId) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      try {
        await removeTeamMember(projectId, userId);
        setTeamMembers(teamMembers.filter(member => member.id !== userId));
      } catch (err) {
        setError('Failed to remove team member');
      }
    }
  };
  
  // Improved handleAssignmentUpdate function to ensure fresh data
  const handleAssignmentUpdate = async () => {
    try {
      // First close the modal
      setShowAssignModal(false);
      
      // Wait a moment to ensure backend processing is complete
      setTimeout(async () => {
        try {
          // Force a complete refresh of the component data
          setRefreshTimestamp(Date.now());
        } catch (refreshErr) {
          console.error('Error in delayed refresh:', refreshErr);
        }
      }, 500);
    } catch (err) {
      console.error('Error updating task assignments:', err);
      setError('Failed to update task assignments.');
      setShowAssignModal(false);
    }
  };

  if (loading) return <div className={styles.loadingState}>Loading project data...</div>;
  if (error) return <div className={styles.errorState}>{error}</div>;
  if (!project) return <div className={styles.notFound}>Project not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>{project.title}</h1>
          <p className={styles.description}>{project.description}</p>
          {project.deadline && (
            <p className={styles.deadline}>
              Deadline: {new Date(project.deadline).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className={styles.backButton}
          >
            Back to Dashboard
          </button>
          {isOwner && (
            <button 
              onClick={() => navigate(`/projects/${projectId}/edit`)} 
              className={styles.editButton}
            >
              Edit Project
            </button>
          )}
        </div>
      </div>
      
      {/* Team Members Section */}
      <div className={styles.teamSection}>
        <div className={styles.sectionHeader}>
          <h2>Team Members</h2>
          {isOwner && (
            <button 
              onClick={() => setShowTeamModal(true)} 
              className={styles.addButton}
            >
              Add Team Member
            </button>
          )}
        </div>
        
        <div className={styles.teamList}>
          {teamMembers.length > 0 ? (
            teamMembers.map(member => (
              <div key={member.id} className={styles.teamMember}>
                <span>{member.name}</span>
                {isOwner && (
                  <button 
                    onClick={() => handleRemoveTeamMember(member.id)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No team members yet.</p>
          )}
        </div>
      </div>

      {/* Tasks Section - read-only for team members */}
      <div className={styles.tasksSection}>
        <div className={styles.sectionHeader}>
          <h2>Tasks</h2>
          {isOwner && (
            <button onClick={handleAddTask} className={styles.addButton}>
              Add Task
            </button>
          )}
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
                    {/* Display assigned user directly within the task card */}
                    <span className={styles.assignedUser}>
                      Assigned to: {task.assigned_user ? task.assigned_user.name : 'Unassigned'}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className={styles.taskActions}>
                    <button 
                      onClick={() => handleShowAssignModal(task.id)}
                      className={styles.assignButton}
                    >
                      {task.assigned_user ? 'Reassign' : 'Assign User'}
                    </button>
                    <button 
                      onClick={() => handleEditTask(task.id)}
                      className={styles.editTaskButton}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No tasks yet.</p>
        )}
      </div>

      {/* Show modals only if user is owner */}
      {isOwner && showAssignModal && (
        <AssignUserModal
          projectId={projectId}
          taskId={selectedTaskId}
          onClose={handleAssignmentUpdate}
        />
      )}

      {isOwner && showTeamModal && (
        <TeamMemberModal
          projectId={projectId}
          currentTeamMembers={teamMembers}
          onClose={() => {
            setShowTeamModal(false);
            // Also refresh team members when modal closes
            setRefreshTimestamp(Date.now());
          }}
          onTeamUpdate={async () => {
            const updatedTeam = await fetchTeamMembers(projectId);
            setTeamMembers(updatedTeam);
          }}
        />
      )}
    </div>
  );
};

export default ProjectView;