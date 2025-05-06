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
    console.log('Tasks response:', response.data);
    
    // Ensure we get assigned users for each task
    const tasksWithUsers = await Promise.all(response.data.map(async (task) => {
      try {
        const assignedUsers = await fetchAssignedUsers(projectId, task.id);
        return {
          ...task,
          assigned_user: assignedUsers.length > 0 ? assignedUsers[0] : null,
          assignedUsers: assignedUsers // Store full array of assigned users
        };
      } catch (error) {
        console.error(`Error fetching assigned users for task ${task.id}:`, error);
        return {
          ...task,
          assigned_user: null,
          assignedUsers: []
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
      status: 'todo'  // Always set initial status as todo
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
    const formattedTaskData = {
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date && taskData.due_date !== '' ? taskData.due_date : null
    };

    const response = await axios.put(
      `${API_URL}/api/projects/${projectId}/tasks/${taskId}`,
      formattedTaskData
    );

    if (taskData.assignee) {
      const currentAssignees = await fetchAssignedUsers(projectId, taskId);
      if (currentAssignees.length > 0) {
        await Promise.all(
          currentAssignees.map(user =>
            unassignUserFromTask(projectId, taskId, user.id)
          )
        );
      }
      await assignUserToTask(projectId, taskId, taskData.assignee);
    }

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
