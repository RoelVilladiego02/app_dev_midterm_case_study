import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchTasks, 
  deleteTask, 
  fetchTeamMembers, 
  removeTeamMember,
  fetchSingleProject
} from '../services/projectService';
import styles from '../componentsStyles/ProjectView.module.css';
import Header from './Header';
import AssignUserModal from './AssignUserModal';
import TeamMemberModal from './TeamMemberModal';
import BudgetDashboard from './BudgetDashboard';
import TaskProgress from './TaskProgress';

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
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [budget, setBudget] = useState(null);
  const [user, setUser] = useState(null);
  const [errorPopup, setErrorPopup] = useState({ show: false, message: '' });

  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load user data first
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('No user data found');
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Use the fetchSingleProject service
        const projectData = await fetchSingleProject(projectId);
        console.log('Received project data:', projectData);

        if (!projectData.isOwner && !projectData.teamMembers?.some(m => m.id === parsedUser.id)) {
          throw new Error('You do not have access to this project');
        }
        
        // Set project data and roles
        setProject(projectData);
        setIsOwner(projectData.isOwner);
        setTeamMembers(projectData.teamMembers || []);
        
        // Load tasks if available
        if (projectData.tasks) {
          setTasks(projectData.tasks);
        } else {
          const tasksData = await fetchTasks(projectId);
          setTasks(tasksData);
        }

        // Set budget data
        setBudget({
          total_budget: projectData.total_budget || 0,
          actual_expenditure: projectData.actual_expenditure || 0
        });

      } catch (err) {
        console.error('Error in loadData:', err);
        setError(err.message || 'Failed to load project data. Please try again.');
        
        if (err.response?.status === 401) {
          navigate('/login');
        } else if (err.response?.status === 403) {
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndData();
  }, [projectId, navigate, refreshTimestamp]);
  
  // Rest of the component remains the same...
  
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
    try {
      const hasAssignedTasks = tasks.some(task => 
        task.assigned_user && task.assigned_user.id === userId
      );

      if (hasAssignedTasks) {
        setErrorPopup({
          show: true,
          message: 'Cannot remove team member with assigned tasks. Please reassign or complete their tasks first.'
        });
        // Auto-hide after 3 seconds
        setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
        return;
      }

      if (window.confirm('Are you sure you want to remove this team member?')) {
        await removeTeamMember(projectId, userId);
        setTeamMembers(teamMembers.filter(member => member.id !== userId));
      }
    } catch (err) {
      setErrorPopup({
        show: true,
        message: 'Failed to remove team member'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    }
  };
  
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

  const handleBudgetUpdate = (newBudget) => {
    setBudget(newBudget);
    // Force refresh project data to get updated calculations
    setRefreshTimestamp(Date.now());
  };

  if (loading) return <div className={styles.loadingState}>Loading project data...</div>;
  if (error) return <div className={styles.errorState}>{error}</div>;
  if (!project) return <div className={styles.notFound}>Project not found</div>;

  return (
    <div className={styles.dashboardContainer}>
      <Header user={user} />
      {errorPopup.show && (
        <div className={styles.errorPopup}>
          <span>{errorPopup.message}</span>
          <button 
            onClick={() => setErrorPopup({ show: false, message: '' })}
            className={styles.closeButton}
          >
            ×
          </button>
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>{project.title}</h1>
            <p className={styles.description}>{project.description}</p>
            {project.deadline && (
              <p className={styles.deadline}>
                Deadline: {new Date(project.deadline).toLocaleDateString()
                }
              </p>
            )}
            <p className={styles.projectRole}>
              Your role: {isOwner ? 'Project Owner' : 'Team Member'}
            </p>
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

        <TaskProgress tasks={tasks} />

        {/* Only show budget to owner */}
        {isOwner && (
          <BudgetDashboard 
            projectId={projectId}
            budget={budget}
            onUpdate={handleBudgetUpdate}
          />
        )}

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
                  {isOwner && member.id !== user.id && (
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

        {/* Tasks Section - team members can view but not modify */}
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

        {/* Modals - only visible to owner */}
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
    </div>
  );
};

export default ProjectView;