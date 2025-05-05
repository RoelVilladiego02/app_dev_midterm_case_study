import axios from 'axios';
import { fetchTasks } from './taskService';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Add centralized token check
const checkAuthToken = () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }
  return token;
};

// Update setupAuthHeader to use the new check
export const setupAuthHeader = () => {
  try {
    const token = checkAuthToken();
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } catch (error) {
    delete axios.defaults.headers.common['Authorization'];
    throw error;
  }
};

export const fetchProjects = async () => {
  setupAuthHeader();
  try {
    console.log('Fetching projects with auth token:', localStorage.getItem('auth_token'));
    
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
    const MAX_BUDGET = 999999999.99;
    const budget = projectData.total_budget ? parseFloat(projectData.total_budget) : 0;
    
    if (budget > MAX_BUDGET) {
      throw new Error(`Total budget cannot exceed ${MAX_BUDGET.toLocaleString()}`);
    }

    // Format data according to Laravel validation rules
    const validData = {
      title: projectData.title,
      description: projectData.description || null,
      start_date: projectData.start_date || null,
      end_date: projectData.end_date || null,
      status: projectData.status || 'pending',
      total_budget: budget,
      actual_expenditure: projectData.actual_expenditure ? parseFloat(projectData.actual_expenditure) : 0
    };

    console.log('Creating project with data:', validData);
    const response = await axios.post(`${API_URL}/api/projects`, validData);
    return response.data;
  } catch (error) {
    console.error('Error in createProject:', error.response || error);
    throw new Error(
      error.response?.data?.message || 
      (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : '') ||
      error.message ||
      'Failed to create project'
    );
  }
};

export const updateProject = async (projectId, projectData) => {
  setupAuthHeader();
  try {
    const validData = {
      ...projectData,
      status: projectData.status || 'pending',
      total_budget: parseFloat(projectData.total_budget) || 0,
      actual_expenditure: parseFloat(projectData.actual_expenditure) || 0
    };
    
    if (!['pending', 'in_progress', 'completed'].includes(validData.status)) {
      throw new Error('Invalid status value');
    }
    
    const response = await axios.put(`${API_URL}/api/projects/${projectId}`, validData);
    return response.data;
  } catch (error) {
    console.error('Error in updateProject:', error);
    throw error.response?.data?.message || 'Failed to update project';
  }
};

export const deleteProject = async (projectId) => {
  setupAuthHeader();
  try {
    const tasks = await fetchTasks(projectId);
    if (tasks.length > 0) {
      throw new Error('Cannot delete project with associated tasks.');
    }
    await axios.delete(`${API_URL}/api/projects/${projectId}`);
  } catch (error) {
    console.error('Error deleting project:', error.response || error);
    throw error.response?.data?.message || error.message || 'Failed to delete project.';
  }
};

export const fetchTeamMembers = async (projectId) => {
  setupAuthHeader();
  try {
    console.log('Fetching team members for project:', projectId);
    
    const project = await fetchSingleProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.teamMembers && Array.isArray(project.teamMembers)) {
      console.log('Using team members from project data:', project.teamMembers);
      return project.teamMembers;
    }

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

    const parsedProjectId = parseInt(projectId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedProjectId) || isNaN(parsedUserId)) {
      throw new Error(`Invalid IDs: Project ID ${projectId}, User ID ${userId}`);
    }

    try {
      const teamMembers = await fetchTeamMembers(projectId);
      if (teamMembers.some(member => member.id === parsedUserId)) {
        throw new Error('User is already a team member');
      }
    } catch (teamCheckError) {
      console.warn('Team check error:', teamCheckError);
    }

    console.log(`Sending invitation request to: ${API_URL}/api/projects/${parsedProjectId}/invitations`);
    console.log('With data:', { recipient_id: parsedUserId });

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

    throw new Error(
      `Invitation failed (${error.response?.status || 'network error'}): ${
        error.response?.data?.message || 
        error.message || 
        'Failed to send invitation'
      }`
    );
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
      `${API_URL}/api/projects/${projectId}/expenses`,
      { 
        amount: parseFloat(amount),
        description: description
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
    console.log('Raw project response:', response.data);
    
    if (!response.data) {
      throw new Error('Project not found');
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
      throw new Error('No user data found');
    }

    const projectData = response.data;
    const currentUserId = String(currentUser.id);
    const projectUserId = String(projectData.user_id);
    
    const isOwner = currentUserId === projectUserId;
    const teamMembers = Array.isArray(projectData.teamMembers) ? projectData.teamMembers : [];
    const isTeamMember = teamMembers.some(member => String(member?.id) === currentUserId);

    console.log('Access check:', {
      currentUserId,
      projectUserId,
      isOwner,
      isTeamMember,
      teamMembers: teamMembers.map(m => m?.id)
    });

    return {
      ...projectData,
      isOwner,
      role: isOwner ? 'owner' : (isTeamMember ? 'team_member' : 'viewer'),
      teamMembers,
      tasks: Array.isArray(projectData.tasks) ? projectData.tasks : [],
      owner: projectData.owner || null,
    };

  } catch (error) {
    console.error('Error fetching project:', {
      error,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      throw new Error('Your session has expired. Please login again.');
    }

    if (error.response?.status === 403) {
      throw new Error('You do not have access to this project');
    }

    if (error.response?.status === 404) {
      throw new Error('Project not found');
    }

    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to fetch project data'
    );
  }
};

export const fetchPendingInvitations = async (projectId) => {
  setupAuthHeader();
  try {
    console.log(`Fetching pending invitations for project ${projectId}`);
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/invitations`);
    
    if (!response || !response.data) {
      console.log('No pending invitations found');
      return [];
    }
    
    console.log('Pending invitations:', response.data);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching pending invitations:', {
      error,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    
    throw new Error(
      error.response?.data?.message || 
      'Failed to fetch pending invitations'
    );
  }
};

export const cancelTeamInvitation = async (invitationId) => {
  setupAuthHeader();
  try {
    console.log(`Cancelling invitation with ID: ${invitationId}`);
    
    const response = await axios.post(`${API_URL}/api/invitations/${invitationId}/cancel`);
    
    console.log('Cancellation response:', response.data);
    
    return { 
      success: true, 
      message: response.data?.message || 'Invitation cancelled successfully',
      notificationsDeleted: response.data?.notifications_deleted || 0
    };
  } catch (error) {
    console.error('Error canceling invitation:', {
      invitationId,
      error: error.response || error
    });
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to cancel this invitation');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Invitation not found or already cancelled');
    }
    
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to cancel invitation'
    );
  }
};

export const fetchProjectExpenses = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/expenses`);
    // Return the data array if paginated, or the direct response data
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch expenses');
  }
};

export const fetchBudgetHistory = async (projectId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/budget/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching budget history:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch budget history');
  }
};