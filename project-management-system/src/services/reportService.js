import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

const fetchWithRetry = async (endpoint, retries = 0) => {
  try {
    const response = await axios.get(`${API_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retries < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retries);
      console.log(`Rate limited, retrying in ${delay}ms... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(endpoint, retries + 1);
    }
    throw error;
  }
};

export const fetchProjectProgress = async (projectId) => {
  setupAuthHeader();
  try {
    return await fetchWithRetry(`/api/reports/projects/${projectId}/progress`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch project progress');
  }
};

export const fetchBudgetAnalytics = async (projectId) => {
  setupAuthHeader();
  try {
    return await fetchWithRetry(`/api/reports/projects/${projectId}/budget`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch budget analytics');
  }
};

export const fetchTaskAnalytics = async (projectId) => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/analytics/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    // Log the response for debugging
    console.log('Task analytics response:', response.data);

    if (!response.data) {
      throw new Error('No data received from the server');
    }

    // Transform the data to match the expected format
    return {
      total_tasks: response.data.total_tasks || 0,
      tasks_by_status: response.data.tasks_by_status || [],
      tasks_by_priority: response.data.tasks_by_priority || [],
      summary: response.data.summary || {
        completed: 0,
        in_progress: 0,
        todo: 0
      }
    };
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch task analytics');
  }
};
