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
    console.log('Fetching projects with auth token:', localStorage.getItem('auth_token'));
    
    // Use the getAllProjects endpoint which returns both owned and team projects
    const response = await axios.get(`${API_URL}/api/projects/getAllProjects`);
    
    if (!response || !response.data) {
      console.log('No projects found, returning empty array');
      return [];
    }

    const projectsData = Array.isArray(response.data) ? response.data : [];
    console.log('Projects received:', projectsData);
    
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
      throw new Error('No user data found');
    }

    const mappedProjects = projectsData.map(project => ({
      ...project,
      isOwner: project.user_id === currentUser.id,
      role: project.user_id === currentUser.id ? 'owner' : 'team_member'
    }));

    return mappedProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
  } catch (error) {
    console.error('Project fetch error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullError: error
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      throw new Error('Session expired. Please login again.');
    }

    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch projects. Please check your connection.'
    );
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
    
    // Check for either assignee (from CreateTask.js) or assigned_to (legacy support)
    const userId = taskData.assignee || taskData.assigned_to;
    
    // If a user is assigned, assign them to the task
    if (userId) {
      try {
        await assignUserToTask(projectId, taskId, userId);
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

export const updateTaskProgress = async (projectId, taskId, percentage) => {
  setupAuthHeader();
  try {
    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}/progress`,
      { completion_percentage: percentage }
    );
    return response.data;
  } catch (error) {
    console.error('Progress update error:', error);
    throw error.response?.data?.message || 'Failed to update task progress';
  }
};

export const updateTask = async (projectId, taskId, taskData) => {
  setupAuthHeader();
  try {
    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}`,
      {
        ...taskData,
        completion_percentage: taskData.completion_percentage
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
    console.log('Fetching team members for project:', projectId);
    
    // First verify the project exists and we have access
    const project = await fetchSingleProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Return team members from the project data if available
    if (project.teamMembers && Array.isArray(project.teamMembers)) {
      console.log('Using team members from project data:', project.teamMembers);
      return project.teamMembers;
    }

    // Fallback to separate team members endpoint
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/team`);
    console.log('Team members API response:', response.data);

    if (!response.data) {
      throw new Error('No team members data received');
    }

    const validMembers = Array.isArray(response.data) ? response.data : [];
    if (validMembers.length === 0) {
      console.warn('No team members found for project:', projectId);
    }

    return validMembers;
  } catch (error) {
    console.error('Error fetching team members:', {
      projectId,
      error: error.message,
      response: error.response?.data
    });
    
    // Check for specific error cases
    if (error.response?.status === 401) {
      throw new Error('Your session has expired. Please login again.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to view team members.');
    }
    
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch team members'
    );
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
    console.log('Sending invitation:', { projectId, userId });

    // Validate and parse IDs
    const parsedProjectId = parseInt(projectId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedProjectId) || isNaN(parsedUserId)) {
      throw new Error(`Invalid IDs: Project ID ${projectId}, User ID ${userId}`);
    }

    // First check if user is already a member
    try {
      const teamMembers = await fetchTeamMembers(projectId);
      if (teamMembers.some(member => member.id === parsedUserId)) {
        throw new Error('User is already a team member');
      }
    } catch (teamCheckError) {
      console.warn('Team check error:', teamCheckError);
      // Continue even if the team check fails
    }

    console.log(`Sending invitation request to: ${API_URL}/api/projects/${parsedProjectId}/invitations`);
    console.log('With data:', { recipient_id: parsedUserId });

    // Use the correct URL format matching the Laravel route
    // and send a proper JSON request
    const response = await axios.post(
      `${API_URL}/api/projects/${parsedProjectId}/invitations`,
      {
        recipient_id: parsedUserId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    );

    console.log('Invitation response:', response.data);
    
    if (response.data?.message) {
      // Show success message from server
      return { success: true, message: response.data.message };
    }

    return response.data;
  } catch (error) {
    console.error('Invitation error:', {
      error,
      request: {
        projectId,
        userId,
        url: `${API_URL}/api/projects/${projectId}/invitations`
      },
      response: error.response?.data,
      status: error.response?.status
    });

    // Provide detailed error messages based on the response
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    } else if (error.response?.status === 403) {
      throw new Error('You do not have permission to invite users to this project.');
    } else if (error.response?.status === 409) {
      throw new Error(error.response.data.message || 'User already has a pending invitation');
    } else if (error.response?.status === 422) {
      const validationErrors = error.response.data.errors || {};
      const firstError = Object.values(validationErrors)[0];
      throw new Error(firstError ? firstError[0] : 'Validation failed');
    } else if (error.response?.status === 500) {
      throw new Error(`Server error: ${error.response.data.message || 'Internal server error'}`);
    }

    // Default error message with more context
    throw new Error(
      `Invitation failed (${error.response?.status || 'network error'}): ${
        error.response?.data?.message || 
        error.message || 
        'Failed to send invitation'
      }`
    );
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

export const updateProjectBudget = async (projectId, budgetData) => {
  setupAuthHeader();
  try {
    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/budget`,
      {
        total_budget: parseFloat(budgetData.totalBudget),
        actual_expenditure: parseFloat(budgetData.actualExpenditure)
      }
    );
    return response.data;
  } catch (error) {
    console.error('Budget update error:', error);
    const errorMessage = error.response?.data?.errors?.total_budget?.[0] 
      || error.response?.data?.message 
      || 'Failed to update budget';
    throw new Error(errorMessage);
  }
};

export const addExpenditure = async (projectId, amount, description) => {
  setupAuthHeader();
  try {
    const response = await axios.post(
      `${API_URL}/api/projects/${projectId}/budget/expenditure`,
      { 
        amount: parseFloat(amount),
        description,
        project_id: projectId,
        date: new Date().toISOString()
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data) {
      throw new Error('No response from server');
    }

    console.log('Expenditure added:', response.data);
    return response.data;
  } catch (error) {
    console.error('Expenditure error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw new Error(
      error.response?.data?.message || 
      'Failed to add expenditure. Please check your budget limits.'
    );
  }
};

export const fetchSingleProject = async (projectId) => {
  setupAuthHeader();
  try {
    console.log('Fetching single project with ID:', projectId);
    
    const response = await axios.get(`${API_URL}/api/projects/${projectId}`);
    console.log('Raw project response:', response);
    
    if (!response.data) {
      throw new Error('Project not found');
    }

    // Get current user for role determination
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
      throw new Error('No user data found');
    }

    // Extract project data
    const projectData = response.data;
    const isOwner = projectData.user_id === currentUser.id;
    const isTeamMember = projectData.teamMembers?.some(
      member => member.id === currentUser.id
    );

    // Return formatted project data
    return {
      ...projectData,
      isOwner,
      role: isOwner ? 'owner' : (isTeamMember ? 'team_member' : 'viewer'),
      teamMembers: projectData.teamMembers || [],
      tasks: projectData.tasks || [],
      owner: projectData.owner || null
    };
  } catch (error) {
    console.error('Error fetching project:', {
      error,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response?.status === 403) {
      throw new Error('You do not have access to this project');
    }

    if (error.response?.status === 404) {
      throw new Error('Project not found');
    }

    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch project'
    );
  }
};