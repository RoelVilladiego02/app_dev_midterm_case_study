import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const fetchTaskComments = async (taskId) => {
  setupAuthHeader();
  try {
    console.log(`Fetching comments for task ${taskId}`);
    const response = await axios.get(`${API_URL}/api/tasks/${taskId}/comments`);
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (error.response?.status === 403) {
      console.warn('Access restricted but allowing empty comments');
      return []; // Return empty array instead of throwing error
    }
    throw new Error(error.response?.data?.message || 'Failed to fetch comments');
  }
};

export const addTaskComment = async (taskId, commentText) => {
  setupAuthHeader();
  try {
    console.log(`Adding comment to task ${taskId}`);
    const response = await axios.post(`${API_URL}/api/tasks/${taskId}/comments`, {
      comment_text: commentText
    });
    console.log('Comment added:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to comment on this task');
    }
    throw new Error(error.response?.data?.message || 'Failed to add comment');
  }
};

export const deleteTaskComment = async (taskId, commentId) => {
  setupAuthHeader();
  try {
    const response = await axios.delete(`${API_URL}/api/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete comment');
  }
};
