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
    
    // Log raw API response
    console.log('Raw tasks from API:', response.data);
    
    const tasksWithUsers = await Promise.all(response.data.map(async (task) => {
      try {
        const assignedUsers = await fetchAssignedUsers(projectId, task.id);
        
        // Log task data processing
        console.log('Processing task:', {
          id: task.id,
          title: task.title,
          status: task.status,
          completion_percentage: task.completion_percentage
        });

        // Keep completion_percentage exactly as received from API
        const processedTask = {
          ...task,
          assigned_user: assignedUsers.length > 0 ? assignedUsers[0] : null,
          assignedUsers: assignedUsers,
          completion_percentage: task.completion_percentage !== null 
            ? task.completion_percentage 
            : task.status === 'completed' 
              ? 100 
              : task.status === 'in_progress' 
                ? 50 
                : 0
        };

        console.log('Processed task:', processedTask);
        return processedTask;

      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        return task;
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
    console.log('Updating task with data:', {
      taskId,
      originalData: taskData,
      completion: taskData.completion_percentage
    });

    // Ensure completion_percentage is explicitly sent as a number
    const formattedTaskData = {
      ...taskData,
      completion_percentage: parseInt(taskData.completion_percentage || 0, 10)
    };

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