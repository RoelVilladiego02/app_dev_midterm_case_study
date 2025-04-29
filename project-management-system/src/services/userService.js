import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const fetchAllUsers = async () => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error.response?.data?.message || 'Failed to fetch users';
  }
};
