import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const fetchProjects = async () => {
  setupAuthHeader();
  try {
    console.log('Fetching all projects...');
    const response = await axios.get(`${API_URL}/api/projects/all`);
    console.log('Projects response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data
    });
    throw error.response?.data?.message || 'Failed to fetch projects';
  }
};

export const createProject = async (projectData) => {
  setupAuthHeader();
  try {
    // Ensure status is one of the valid values
    const validData = {
      ...projectData,
      status: projectData.status || 'pending'
    };
    
    console.log('Creating project with data:', validData);
    const response = await axios.post(`${API_URL}/api/projects`, validData);
    return response.data;
  } catch (error) {
    console.error('Error in createProject:', error.response || error);
    throw error.response?.data?.message || 'Failed to create project';
  }
};

export const updateProject = async (projectId, projectData) => {
  setupAuthHeader();
  try {
    // Ensure required fields are present
    if (!projectData.status) {
      projectData.status = 'pending';
    }
    
    const response = await axios.put(`${API_URL}/api/projects/${projectId}`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error in updateProject:', error);
    throw error.response?.data?.message || 'Failed to update project';
  }
};

export const deleteProject = async (projectId) => {
  setupAuthHeader();
  try {
    // Check if the project has associated tasks
    const tasks = await fetchTasks(projectId);
    if (tasks.length > 0) {
      throw new Error('Cannot delete project with associated tasks.');
    }

    // Proceed with deletion if no tasks exist
    await axios.delete(`${API_URL}/api/projects/${projectId}`);
  } catch (error) {
    console.error('Error deleting project:', error.response || error);
    throw error.response?.data?.message || error.message || 'Failed to delete project.';
  }
};

// Task-related functions

export const fetchTasks = async (projectId) => {
  setupAuthHeader();
  try {
    console.log(`Fetching tasks for project ${projectId}`);
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks`);
    console.log('Tasks response:', response.data);
    
    // Map through tasks and ensure we get assigned users for each task
    const tasksWithUsers = await Promise.all(response.data.map(async (task) => {
      try {
        const assignedUsers = await fetchAssignedUsers(projectId, task.id);
        return {
          ...task,
          assigned_user: assignedUsers && assignedUsers.length > 0 ? assignedUsers[0] : null
        };
      } catch (error) {
        console.error(`Error fetching assigned user for task ${task.id}:`, error);
        return {
          ...task,
          assigned_user: task.user || null
        };
      }
    }));
    
    return tasksWithUsers;
  } catch (error) {
    console.error('Error fetching tasks:', {
      status: error.response?.status,
      message: error.response?.data?.message
    });
    throw error.response?.data?.message || 'Failed to fetch tasks';
  }
};

export const assignUserToTask = async (projectId, taskId, userId) => {
  setupAuthHeader();
  try {
    console.log(`Assigning user ${userId} to task ${taskId} in project ${projectId}`);
    
    // Ensure all parameters are numbers
    const parsedProjectId = parseInt(projectId, 10);
    const parsedTaskId = parseInt(taskId, 10);
    const parsedUserId = parseInt(userId, 10);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId) || isNaN(parsedUserId)) {
      throw new Error('Invalid ID provided');
    }

    // First verify the user is a team member
    const teamMembers = await fetchTeamMembers(parsedProjectId);
    const isTeamMember = teamMembers.some(member => member.id === parsedUserId);
    
    if (!isTeamMember) {
      throw new Error('Selected user is not a member of this project');
    }

    const response = await axios.post(
      `${API_URL}/api/projects/${parsedProjectId}/tasks/${parsedTaskId}/assign`,
      { user_id: parsedUserId }
    );
    
    console.log('User assignment response:', response.data);
    
    // Clear the cache to ensure fresh data on next fetch
    await invalidateTaskCache(parsedProjectId, parsedTaskId);
    
    return response.data;
  } catch (error) {
    console.error('User assignment error:', error.response || error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to assign user to task'
    );
  }
};

export const unassignUserFromTask = async (projectId, taskId, userId) => {
  setupAuthHeader();
  try {
    console.log(`Unassigning user ${userId} from task ${taskId} in project ${projectId}`);
    
    // Ensure all parameters are numbers
    const parsedProjectId = parseInt(projectId, 10);
    const parsedTaskId = parseInt(taskId, 10);
    const parsedUserId = parseInt(userId, 10);
    
    if (isNaN(parsedProjectId) || isNaN(parsedTaskId) || isNaN(parsedUserId)) {
      throw new Error('Invalid ID provided');
    }

    const response = await axios.delete(
      `${API_URL}/api/projects/${parsedProjectId}/tasks/${parsedTaskId}/unassign/${parsedUserId}`
    );
    
    console.log('User unassignment response:', response.data);
    
    // Clear the cache to ensure fresh data on next fetch
    await invalidateTaskCache(parsedProjectId, parsedTaskId);
    
    return response.data;
  } catch (error) {
    console.error('User unassignment error:', error.response || error);
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to unassign user from task'
    );
  }
};

// Helper function to invalidate task cache after reassignment
const invalidateTaskCache = async (projectId, taskId) => {
  // This is a workaround for cache issues - force a fresh fetch of the task
  try {
    await axios.get(`${API_URL}/api/projects/${projectId}/tasks/${taskId}?_=${Date.now()}`);
  } catch (error) {
    console.warn('Cache invalidation attempt failed:', error);
    // Continue even if this fails, it's just a cache-busting attempt
  }
};

export const createTask = async (projectId, taskData) => {
  setupAuthHeader();
  try {
    console.log('Creating task:', taskData);
    
    // Create the task first
    const response = await axios.post(
      `${API_URL}/api/projects/${projectId}/tasks`,
      {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: taskData.priority,
        due_date: taskData.due_date
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Task created:', response.data);
    const taskId = response.data.id;
    
    // If assigned_to is provided, assign the user to the task
    if (taskData.assigned_to) {
      try {
        await assignUserToTask(projectId, taskId, taskData.assigned_to);
      } catch (assignError) {
        console.error('Error assigning user during task creation:', assignError);
        // Continue without failing the whole operation
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Task creation error details:', error);
    throw new Error(error.response?.data?.message || 'Failed to create task');
  }
};

export const updateTask = async (projectId, taskId, taskData) => {
  setupAuthHeader();
  try {
    console.log('Updating task with data:', taskData);
    
    // First update the task details
    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}`,
      {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.due_date
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Handle assignee changes separately
    if (taskData.assignee) {
      console.log(`Updating task assignee to user ID: ${taskData.assignee}`);
      
      // Get current assigned users
      const currentAssignedUsers = await fetchAssignedUsers(projectId, taskId);
      
      // If already assigned to someone, unassign first
      if (currentAssignedUsers && currentAssignedUsers.length > 0) {
        await unassignUserFromTask(projectId, taskId, currentAssignedUsers[0].id);
      }
      
      // Then assign to new user
      await assignUserToTask(projectId, taskId, taskData.assignee);
    }
    
    // Force refresh of the task data after all updates
    await invalidateTaskCache(projectId, taskId);
    
    return response.data;
  } catch (error) {
    console.error('Task update error:', error);
    throw error.response?.data?.message || 'Failed to update task';
  }
};

export const deleteTask = async (projectId, taskId) => {
  setupAuthHeader();
  await axios.delete(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`);
};

// Team-related functions

export const fetchTeamMembers = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/team`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch team members';
  }
};

export const addTeamMember = async (projectId, userId) => {
  setupAuthHeader();
  try {
    const response = await axios.post(`${API_URL}/api/projects/${projectId}/team`, {
      user_id: userId
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to add team member';
  }
};

export const removeTeamMember = async (projectId, userId) => {
  setupAuthHeader();
  try {
    await axios.delete(`${API_URL}/api/projects/${projectId}/team/${userId}`);
  } catch (error) {
    throw error.response?.data?.message || 'Failed to remove team member';
  }
};

export const sendTeamInvitation = async (projectId, userId) => {
  setupAuthHeader();
  try {
    // First check if user is already a member
    const teamMembers = await fetchTeamMembers(projectId);
    if (teamMembers.some(member => member.id === parseInt(userId))) {
      throw new Error('User is already a team member');
    }

    console.log('Sending invitation:', { projectId, userId });
    const response = await axios.post(
      `${API_URL}/api/projects/${projectId}/invitations`,
      {
        recipient_id: userId,
        project_id: projectId
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    console.log('Invitation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Invitation error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.response?.data?.message
    });
    
    if (error.response?.status === 409 || 
        error.response?.data?.message?.includes('Duplicate entry')) {
      throw new Error('User already has a pending invitation');
    }
    
    throw new Error(error.response?.data?.message || 'Failed to send invitation');
  }
};

export const fetchAssignedUsers = async (projectId, taskId) => {
  setupAuthHeader();
  try {
    console.log(`Fetching assigned users for task ${taskId} in project ${projectId}`);
    
    // Add a cache-busting parameter to ensure we get fresh data
    const response = await axios.get(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}/users?_=${Date.now()}`
    );
    console.log('Assigned users response:', response.data);
    
    // If there's no assigned users from dedicated endpoint, try to get from task data
    if (!response.data || response.data.length === 0) {
      const taskResponse = await axios.get(
        `${API_URL}/api/projects/${projectId}/tasks/${taskId}?_=${Date.now()}`
      );
      if (taskResponse.data && taskResponse.data.user) {
        // Return the assigned user from task data if available
        return [taskResponse.data.user];
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching assigned users:', {
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Try to get from task data if the endpoint fails
    try {
      const taskResponse = await axios.get(
        `${API_URL}/api/projects/${projectId}/tasks/${taskId}?_=${Date.now()}`
      );
      if (taskResponse.data && taskResponse.data.user) {
        return [taskResponse.data.user];
      }
    } catch (secondError) {
      console.error('Secondary error fetching task data:', secondError);
    }
    
    throw new Error(error.response?.data?.message || 'Failed to fetch assigned users');
  }
};