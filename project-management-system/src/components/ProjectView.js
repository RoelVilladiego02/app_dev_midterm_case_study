import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchTasks, 
  deleteTask, 
  fetchTeamMembers, 
  removeTeamMember,
  fetchSingleProject,
  fetchPendingInvitations,
  cancelTeamInvitation  // Add this import from projectService
} from '../services/projectService';
import styles from '../componentsStyles/ProjectView.module.css';
import Header from './Header';
import AssignUserModal from './AssignUserModal';
import TeamMemberModal from './TeamMemberModal';
import BudgetDashboard from './BudgetDashboard';
import TaskProgress from './TaskProgress';
import EditProjectModal from './EditProjectModal';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  const navigate = useNavigate();
  const { projectId } = useParams();

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const userData = localStorage.getItem('user');
        if (!userData) {
          throw new Error('No user data found');
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
  
        const projectData = await fetchSingleProject(projectId);
        console.log('Received project data:', projectData);
  
        if (!projectData.isOwner && !projectData.teamMembers?.some(m => m.id === parsedUser.id)) {
          throw new Error('You do not have access to this project');
        }
        
        setProject(projectData);
        setIsOwner(projectData.isOwner);
        setTeamMembers(projectData.teamMembers || []);
        
        if (projectData.tasks) {
          setTasks(projectData.tasks);
        } else {
          const tasksData = await fetchTasks(projectId);
          setTasks(tasksData);
        }
  
        setBudget({
          total_budget: projectData.total_budget || 0,
          actual_expenditure: projectData.actual_expenditure || 0
        });
  
        // Always try to fetch pending invites if user is owner
        if (projectData.isOwner) {
          const pendingInvitations = await fetchPendingInvitations(projectId);
          console.log('Pending invitations:', pendingInvitations);
          setPendingInvites(pendingInvitations.filter(invite => invite?.recipient));
        } else {
          setPendingInvites([]);
        }
  
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

  const handleCancelInvitation = async (invitationId) => {
    if (window.confirm('Are you sure you want to cancel this invitation?')) {
      try {
        await cancelTeamInvitation(invitationId);
        setPendingInvites(pendingInvites.filter(invite => invite.id !== invitationId));
        // Show success message
        setErrorPopup({
          show: true,
          message: 'Invitation canceled successfully'
        });
        setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
      } catch (err) {
        console.error('Error canceling invitation:', err);
        setErrorPopup({
          show: true,
          message: 'Failed to cancel invitation. Please try again.'
        });
        setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
      }
    }
  };
  
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
      setShowAssignModal(false);
      // Fetch fresh task data immediately after assignment
      const updatedTasks = await fetchTasks(projectId);
      setTasks(updatedTasks);
    } catch (err) {
      console.error('Error updating task assignments:', err);
      setError('Failed to update task assignments.');
    }
  };

  const handleBudgetUpdate = (newBudget) => {
    setBudget(newBudget);
    // Force refresh project data to get updated calculations
    setRefreshTimestamp(Date.now());
  };

  const handleProjectUpdate = async () => {
    try {
      const updatedProject = await fetchSingleProject(projectId);
      setProject(updatedProject);
    } catch (err) {
      console.error('Error refreshing project:', err);
      setError('Failed to refresh project data');
    }
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
            {isOwner && (
              <button 
                onClick={() => setShowEditModal(true)} 
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
              {/* Active Members Section */}
              <div className={styles.activeMembers}>
                <h3>Active Members</h3>
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
                  <p className={styles.emptyState}>No active team members</p>
                )}
              </div>

              {/* Pending Invites Section */}
              {pendingInvites.length > 0 && (
                <div className={styles.pendingInvites}>
                  <h3>Pending Invites</h3>
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className={styles.pendingMember}>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>
                          {invite.recipient?.name || 'Unknown User'}
                        </span>
                        <span className={styles.pendingStatus}>Pending</span>
                      </div>
                      {isOwner && (
                        <button 
                          onClick={() => handleCancelInvitation(invite.id)}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                      <span className={styles.taskCost}>
                        Cost: ${task.cost ? parseFloat(task.cost).toFixed(2) : '0.00'}
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

        {/* Add the EditProjectModal */}
        {showEditModal && (
          <EditProjectModal
            project={project}
            onClose={() => setShowEditModal(false)}
            onProjectUpdated={handleProjectUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectView;