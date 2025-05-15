import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  fetchTeamMembers, 
  removeTeamMember,
  fetchSingleProject,
  fetchPendingInvitations,
  cancelTeamInvitation
} from '../services/projectService';

import {
  fetchTasks,
  deleteTask
} from '../services/taskService';

import styles from '../componentsStyles/ProjectView.module.css';
import Header from './Header';
import AssignUserModal from './AssignUserModal';
import TeamMemberModal from './TeamMemberModal';
import BudgetDashboard from './BudgetDashboard';
import TaskProgress from './TaskProgress';
import EditProjectModal from './EditProjectModal';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import AssignedUsersList from './AssignedUsersList';
import TaskComments from './TaskComments';
import TaskFiles from './TaskFiles';
import ActivityFeed from './ActivityFeed';

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
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

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
    setShowCreateTaskModal(true);
  };

  const handleTaskCreated = async () => {
    try {
      setShowCreateTaskModal(false);
      const updatedTasks = await fetchTasks(projectId);
      console.log('Updated tasks after creation:', updatedTasks);
      setTasks(updatedTasks);
      
      // Show success message
      setErrorPopup({
        show: true,
        message: 'Task created successfully'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    } catch (err) {
      console.error('Error refreshing tasks:', err);
      setErrorPopup({
        show: true,
        message: 'Failed to refresh tasks after creation'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowEditTaskModal(true);
  };

  const handleTaskUpdated = async () => {
    try {
      setShowEditTaskModal(false);
      const updatedTasks = await fetchTasks(projectId);
      setTasks(updatedTasks);
      setSelectedTask(null);
      
      // Show success message
      setErrorPopup({
        show: true,
        message: 'Task updated successfully'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    } catch (err) {
      console.error('Error refreshing tasks:', err);
      setErrorPopup({
        show: true,
        message: 'Failed to refresh tasks after update'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    }
  };
  
  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(projectId, taskId);
        setTasks(tasks.filter(task => task.id !== taskId));
        
        // Show success message
        setErrorPopup({
          show: true,
          message: 'Task deleted successfully'
        });
        setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
      } catch (err) {
        console.error('Error deleting task:', err);
        setErrorPopup({
          show: true,
          message: err.message || 'Failed to delete task'
        });
        setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
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

  const canAccessTask = (task) => {
    if (!user) return false;
    
    // Convert IDs to strings for consistent comparison
    const currentUserId = String(user.id);
    
    // Project owners can always access
    if (isOwner) return true;
  
    // Check both assignment methods
    const isAssigned = 
      (task.assigned_user && String(task.assigned_user.id) === currentUserId) ||
      (task.assignedUsers && 
       task.assignedUsers.some(u => String(u.id) === currentUserId));
  
    return isAssigned;
  };

  const handleTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
  
    console.log('Task access check:', {
      task,
      currentUser: user,
      isOwner,
      isAssigned: canAccessTask(task)
    });
  
    if (canAccessTask(task)) {
      setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    } else {
      setErrorPopup({
        show: true,
        message: 'Only project owners and assigned users can view task details'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
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
      
      <div className={styles.mainLayout}>
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <div>
              <h1>{project.title}</h1>
              <p className={styles.description}>{project.description}</p>
              <div className={styles.projectMeta}>
                <p className={`${styles.status} ${styles[project.status]}`}>
                  Status: {project.status.replace('_', ' ')}
                </p>
                {project.deadline && (
                  <p className={styles.deadline}>
                    Deadline: {new Date(project.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>
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
              isOwner={isOwner}
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
                  <div 
                    key={task.id} 
                    className={`${styles.taskItem} ${canAccessTask(task) ? styles.accessible : styles.restricted}`}
                  >
                    <div 
                      className={`${styles.taskContent} ${!canAccessTask(task) ? styles.disabled : ''}`} 
                      onClick={() => handleTaskClick(task.id)}
                    >
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
                          <AssignedUsersList 
                            projectId={projectId} 
                            taskId={task.id} 
                            assignedUser={task.assigned_user} 
                          />
                        </span>
                      </div>
                    </div>
                    
                    {expandedTaskId === task.id && canAccessTask(task) && (
                      <div className={styles.expandedContent}>
                        <TaskComments 
                          taskId={task.id} 
                          assignedUser={task.assigned_user}
                          currentUser={user}
                          isProjectOwner={isOwner}
                        />
                        <TaskFiles taskId={task.id} />
                      </div>
                    )}
                    
                    {isOwner && (
                      <div className={styles.taskActions}>
                        <button 
                          onClick={() => handleShowAssignModal(task.id)}
                          className={styles.assignButton}
                        >
                          {task.assigned_user ? 'Reassign' : 'Assign User'}
                        </button>
                        <button 
                          onClick={() => handleEditTask(task)}
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

            {/* Add CreateTaskModal */}
            {showCreateTaskModal && (
              <CreateTaskModal
                projectId={projectId}
                teamMembers={teamMembers}
                onClose={() => setShowCreateTaskModal(false)}
                onTaskCreated={handleTaskCreated}
                initialData={{
                  title: '',
                  description: '',
                  status: 'todo',
                  priority: 'medium',
                  due_date: '',
                  assignee: ''
                }}
              />
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

          {/* Add the EditTaskModal */}
          {showEditTaskModal && selectedTask && (
            <EditTaskModal
              projectId={projectId}
              taskId={selectedTask.id}
              task={selectedTask}
              teamMembers={teamMembers}
              onClose={() => {
                setShowEditTaskModal(false);
                setSelectedTask(null);
              }}
              onTaskUpdated={handleTaskUpdated}
            />
          )}
        </div>

        <div className={styles.sidePanel}>
          <ActivityFeed taskId={selectedTaskId} projectId={projectId} />
        </div>
      </div>
    </div>
  );
};

export default ProjectView;