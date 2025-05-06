import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const uploadTaskFile = async (taskId, file) => {
  setupAuthHeader();
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_URL}/api/tasks/${taskId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to upload file');
  }
};

export const fetchTaskFiles = async (taskId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/tasks/${taskId}/files`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch files');
  }
};

export const deleteTaskFile = async (taskId, fileId) => {
  setupAuthHeader();
  try {
    await axios.delete(`${API_URL}/api/tasks/${taskId}/files/${fileId}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete file');
  }
};

export const downloadTaskFile = async (taskId, fileId, fileName) => {
  setupAuthHeader();
  try {
    const response = await axios.get(
      `${API_URL}/api/tasks/${taskId}/files/${fileId}`,
      { responseType: 'blob' }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to download file');
  }
};
