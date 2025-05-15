import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const fetchActivities = async (params = {}) => {
  setupAuthHeader();
  try {
    let url = `${API_URL}/api/activity-feed`;
    
    const queryParams = new URLSearchParams();
    if (params.projectId) queryParams.append('project_id', params.projectId);
    if (params.taskId) queryParams.append('task_id', params.taskId);
    if (params.page) queryParams.append('page', params.page);
    
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    console.log('Fetching activities from:', url); // Debug log
    const response = await axios.get(url);
    
    return {
      data: response.data.data || [],
      meta: {
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total,
        per_page: response.data.per_page
      }
    };
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch activities');
  }
};

export const getActivityIcon = (action) => {
  switch (action) {
    case 'task_created':
      return '➕';
    case 'task_updated':
      return '✏️';
    case 'status_changed':
      return '🔄';
    case 'user_assigned':
    case 'task_assigned':
      return '👤';
    case 'user_unassigned':
    case 'task_unassigned':
      return '👥';
    case 'comment_added':
      return '💬';
    case 'file_uploaded':
      return '📎';
    default:
      return '📝';
  }
};
