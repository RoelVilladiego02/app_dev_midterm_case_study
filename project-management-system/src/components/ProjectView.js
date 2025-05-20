import { useState, useEffect } from 'react';
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

  const processTaskData = (tasksData) => {
    if (!Array.isArray(tasksData)) return [];
    
    return tasksData.map(task => {
      // Debug logging
      console.log('Raw task data from API:', {
        id: task.id,
        title: task.title,
        status: task.status,
        completion_percentage: task.completion_percentage
      });
      
      // Keep completion_percentage exactly as received
      return {
        ...task,
        completion_percentage: task.completion_percentage !== null 
          ? task.completion_percentage 
          : task.status === 'completed' 
            ? 100 
            : task.status === 'in_progress' 
              ? 50 
              : 0
      };
    });
  };

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
        
        // Process tasks data
        let tasksData;
        if (projectData.tasks && Array.isArray(projectData.tasks)) {
          tasksData = projectData.tasks;
        } else {
          tasksData = await fetchTasks(projectId);
        }
        
        // Log the raw tasks data received from API
        console.log('Raw tasks data before processing:', tasksData);
        
        // Process and set tasks
        const processedTasks = processTaskData(tasksData);
        console.log('Processed tasks data:', processedTasks);
        setTasks(processedTasks);
  
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
      
      // Fetch updated tasks from API
      const updatedTasks = await fetchTasks(projectId);
      
      // Log the raw tasks data received from API after creation
      console.log('Tasks data after creation:', updatedTasks);
      
      // Process and set tasks with proper completion percentages preserved
      setTasks(processTaskData(updatedTasks));
      
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
      
      // Fetch updated tasks from API
      const updatedTasks = await fetchTasks(projectId);
      
      // Log the raw tasks data received from API after update
      console.log('Tasks data after update:', updatedTasks);
      
      // Process and set tasks with proper completion percentages preserved
      setTasks(processTaskData(updatedTasks));
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
      const updatedTasks = await fetchTasks(projectId);
      setTasks(processTaskData(updatedTasks));
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
      (task.assignedUsers && task.assignedUsers.some(u => String(u.id) === currentUserId));
    
    // Team members can access tasks assigned to them
    return isAssigned || project.teamMembers?.some(member => String(member.id) === currentUserId);
  };

  const handleTaskClick = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
  
    if (canAccessTask(task)) {
      setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    } else {
      setErrorPopup({
        show: true,
        message: 'You do not have permission to view this task'
      });
      setTimeout(() => setErrorPopup({ show: false, message: '' }), 3000);
    }
  };

  const getProgressStyle = (task) => {
    if (!task) return '';
    
    // Style based on task status and completion
    if (task.status === 'completed') return styles.completed;
    if (task.status === 'in_progress') return styles.inProgress;
    return '';
  };

  const getProgressDescription = (task) => {
    // Log task data for debugging
    console.log('Task data for progress:', {
      id: task.id,
      status: task.status,
      completion: task.completion_percentage
    });

    if (task.status === 'completed') {
      return 'Task Completed';
    }

    if (task.status === 'todo') {
      return 'Not Started';
    }

    if (task.status === 'in_progress') {
      return 'On Going';
    }

    return 'Status Unknown';
  };

  const renderTeamMemberView = () => {
    // Filter tasks to only show those assigned to the current user
    const assignedTasks = tasks.filter(task => {
      const currentUserId = user?.id;
      // Enhanced debug logging for each task
      console.log('Team member view - Checking task:', {
        taskId: task.id,
        title: task.title,
        status: task.status,
        completion: task.completion_percentage,
        assignedUser: task.assigned_user,
        currentUser: currentUserId
      });
      
      return task.assigned_user && String(task.assigned_user.id) === String(currentUserId);
    });

    // Log the filtered tasks for debugging
    console.log('Filtered assigned tasks:', assignedTasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      completion: task.completion_percentage
    })));

    return (
      <div className={styles.teamMemberView}>
        <div className={styles.projectHeader}>
          <h1 className={styles.projectTitle}>{project.title}</h1>
          <p className={styles.projectDescription}>{project.description}</p>
          
          <div className={styles.projectMetrics}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Status</div>
              <div className={`${styles.metricValue} ${styles[project.status]}`}>
                {project.status.replace('_', ' ')}
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Your Tasks</div>
              <div className={styles.metricValue}>{assignedTasks.length}</div>
            </div>
          </div>
        </div>

        <TaskProgress tasks={assignedTasks} />

        <div className={styles.taskListTeamMember}>
          <h2>My Tasks</h2>
          {assignedTasks.length > 0 ? (
            assignedTasks.map(task => (
              <div key={task.id} className={styles.taskCardTeamMember}>
                <div 
                  className={styles.taskHeader}
                  onClick={() => handleTaskClick(task.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.taskTitleArea}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    {task.description && (
                      <p className={styles.taskDescription}>
                        {task.description}
                      </p>
                    )}
                  </div>
                  <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className={styles.taskDetails}>
                  <div className={styles.taskDetail}>
                    <span className={styles.detailLabel}>Priority</span>
                    <span className={`${styles.detailValue} ${styles[`priority_${task.priority}`]}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.due_date && (
                    <div className={styles.taskDetail}>
                      <span className={styles.detailLabel}>Due Date</span>
                      <span className={styles.detailValue}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className={styles.taskDetail} style={{ justifyContent: 'center', width: '100%' }}>
                    <span className={`${styles.detailValue} ${getProgressStyle(task)}`}>
                      {getProgressDescription(task)}
                    </span>
                  </div>
                  {/* Removed the progressSection div that contained the progress bar */}
                </div>

                {expandedTaskId === task.id && (
                  <div className={styles.expandedContent}>
                    <TaskComments 
                      taskId={task.id} 
                      assignedUser={task.assigned_user}
                      currentUser={user}
                      isProjectOwner={false}
                    />
                    <TaskFiles 
                      taskId={task.id} 
                      isProjectOwner={false}
                    />
                  </div>
                )}

                <div className={styles.expandButton} style={{ 
                  marginTop: '15px',
                  padding: '10px 0',
                  borderTop: '1px solid #eee'
                }}>
                  <button 
                    onClick={() => handleTaskClick(task.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      backgroundColor: '#fff',
                      color: '#444',
                      cursor: 'pointer',
                      fontWeight: '500',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {expandedTaskId === task.id ? 'Show Less' : 'Show More'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyTasksMessage}>
              No tasks are currently assigned to you.
            </div>
          )}
        </div>
      </div>
    );
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
          <button onClick={() => setErrorPopup({ show: false, message: '' })}>×</button>
        </div>
      )}
      
      {isOwner ? (
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
                  <>
                    <button 
                      onClick={() => setShowEditModal(true)} 
                      className={styles.editButton}
                    >
                      Edit Project
                    </button>
                    <button 
                      onClick={() => navigate(`/projects/${projectId}/risks`)}
                      className={styles.riskButton}
                    >
                      🚨 Risk Management
                    </button>
                    <button 
                      onClick={() => navigate(`/reports?projectId=${projectId}`)}
                      className={styles.reportsButton}
                    >
                      📊 View Reports
                    </button>
                  </>
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
              <div className={styles.teamHeader}>
                <h2>Team Members</h2>
                {isOwner && (
                  <button 
                    onClick={() => setShowTeamModal(true)} 
                    className={styles.addMemberButton}
                  >
                    <span>+</span> Add Member
                  </button>
                )}
              </div>
              
              <div className={styles.teamGrid}>
                {teamMembers.length > 0 ? (
                  teamMembers.map(member => (
                    <div key={member.id} className={styles.memberCard}>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberAvatar}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.memberDetails}>
                          <span className={styles.memberName}>{member.name}</span>
                          <span className={styles.memberRole}>
                            {member.id === user.id ? 'You' : 'Team Member'}
                          </span>
                        </div>
                      </div>
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
                  <div className={styles.emptyState}>
                    No team members yet
                  </div>
                )}
              </div>

              {pendingInvites.length > 0 && (
                <div className={styles.pendingSection}>
                  <h3>Pending Invites</h3>
                  {pendingInvites.map(invite => (
                    <div key={invite.id} className={styles.pendingCard}>
                      <div className={styles.pendingInfo}>
                        <span className={styles.pendingName}>
                          {invite.recipient?.name || 'Unknown User'}
                        </span>
                        <span className={styles.pendingStatus}>Pending</span>
                      </div>
                      {isOwner && (
                        <button 
                          onClick={() => handleCancelInvitation(invite.id)}
                          className={styles.removeButton}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
      ) : (
        // Team member view
        renderTeamMemberView()
      )}
    </div>
  );
};

export default ProjectView;