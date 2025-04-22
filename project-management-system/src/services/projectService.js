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
    const response = await axios.get(`${API_URL}/api/projects`);
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error.response || error);
    throw error.response?.data || error;
  }
};

export const createProject = async (projectData) => {
  setupAuthHeader();
  try {
    const response = await axios.post(`${API_URL}/api/projects`, projectData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in createProject:', error.response || error);
    throw error.response?.data || error;
  }
};

export const updateProject = async (projectId, projectData) => {
  setupAuthHeader();
  const response = await axios.put(`${API_URL}/api/projects/${projectId}`, projectData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
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

export const fetchTasks = async (projectId) => {
  setupAuthHeader();
  const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks`);
  return response.data.map(task => ({
    ...task,
    assigned_user: task.user || null // Include assigned user data
  }));
};

export const createTask = async (projectId, taskData) => {
  setupAuthHeader();
  const response = await axios.post(`${API_URL}/api/projects/${projectId}/tasks`, taskData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const updateTask = async (projectId, taskId, taskData) => {
  setupAuthHeader();
  const response = await axios.put(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`, taskData, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const deleteTask = async (projectId, taskId) => {
  setupAuthHeader();
  await axios.delete(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`);
};
