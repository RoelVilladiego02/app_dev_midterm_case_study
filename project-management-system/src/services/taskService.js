import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
    console.warn('No auth token found in localStorage');
  }
};

export const fetchTasks = async (projectId) => {
  setupAuthHeader();
  try {
    console.log(`Fetching tasks for project ${projectId}`);
    const response = await axios.get(`${API_URL}/api/projects/${projectId}/tasks`);
    
    // Debug log raw response
    console.log('Raw tasks from server:', response.data);
    
    const tasksWithUsers = await Promise.all(response.data.map(async (task) => {
      try {
        const assignedUsers = await fetchAssignedUsers(projectId, task.id);
        
        // Keep the exact completion_percentage from server
        const taskData = {
          ...task,
          assigned_user: assignedUsers.length > 0 ? assignedUsers[0] : null,
          assignedUsers: assignedUsers,
          // Preserve the exact completion_percentage
          completion_percentage: task.completion_percentage
        };

        // Debug log for each task
        console.log('Task completion details:', {
          taskId: task.id,
          title: task.title,
          status: task.status,
          originalPercentage: task.completion_percentage,
          preservedPercentage: taskData.completion_percentage
        });

        return taskData;
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        return {
          ...task,
          assigned_user: null,
          assignedUsers: [],
          completion_percentage: task.completion_percentage
        };
      }
    }));

    return tasksWithUsers;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error.response?.data?.message || 'Failed to fetch tasks';
  }
};

export const createTask = async (projectId, taskData) => {
  setupAuthHeader();
  try {
    console.log('Creating task with data:', taskData);
    
    const formattedTaskData = {
      title: taskData.title?.trim(),
      description: taskData.description?.trim() || '',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || null,
      status: taskData.status || 'todo',  // Allow custom status from UI
      completion_percentage: taskData.completion_percentage !== undefined ? 
        taskData.completion_percentage : 0  // Allow explicit setting of completion percentage
    };

    const response = await axios.post(
      `${API_URL}/api/projects/${projectId}/tasks`,
      formattedTaskData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return {
      success: true,
      task: response.data.task
    };
  } catch (error) {
    console.error('Task creation error:', {
      status: error.response?.status,
      data: error.response?.data
    });
    throw new Error(error.response?.data?.message || 'Failed to create task');
  }
};

export const updateTask = async (projectId, taskId, taskData) => {
  setupAuthHeader();
  try {
    // Always preserve the exact completion_percentage
    const formattedTaskData = {
      ...taskData,
      status: taskData.status,
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date && taskData.due_date !== '' ? taskData.due_date : null,
      // Ensure completion_percentage is sent exactly as provided
      completion_percentage: taskData.completion_percentage
    };

    console.log('Updating task with data:', formattedTaskData);
    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}`,
      formattedTaskData
    );

    console.log('Task update response:', response.data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update task');
  }
};

export const deleteTask = async (projectId, taskId) => {
  setupAuthHeader();
  await axios.delete(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`);
};

export const assignUserToTask = async (projectId, taskId, userId) => {
  setupAuthHeader();
  try {
    const response = await axios.post(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}/assign`,
      { user_id: userId }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to assign user');
  }
};

export const unassignUserFromTask = async (projectId, taskId, userId) => {
  setupAuthHeader();
  try {
    const response = await axios.delete(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}/unassign/${userId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to unassign user');
  }
};

export const fetchAssignedUsers = async (projectId, taskId) => {
  setupAuthHeader();
  try {
    const response = await axios.get(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}/users`
    );
    console.log(`Assigned users for task ${taskId}:`, response.data);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching assigned users:', error);
    return [];
  }
};