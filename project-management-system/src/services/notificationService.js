import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

const setupAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const respondToInvitation = async (invitationId, accept) => {
  setupAuthHeader();
  try {
    console.log('Responding to invitation:', { invitationId, accept });

    if (!invitationId) {
      throw new Error('Invalid invitation ID');
    }

    // Get the invitation data first
    const response = await axios.get(`${API_URL}/api/invitations/${invitationId}`);
    if (!response.data) {
      throw new Error('Invitation not found');
    }

    // Valid invitation statuses:
    // - pending: initial state
    // - accepted: when recipient accepts
    // - declined: when recipient declines
    // - cancelled: when owner cancels the invitation

    // Check if invitation is still pending
    if (response.data.status !== 'pending') {
      throw new Error(`Cannot respond to invitation - status is ${response.data.status}`);
    }

    // Send the response
    const actionResponse = await axios.post(
      `${API_URL}/api/invitations/${invitationId}/respond`,
      { 
        status: accept ? 'accepted' : 'declined'
      }
    );

    // Update notification status to match invitation status
    if (actionResponse.data?.notification_id) {
      await axios.patch(`${API_URL}/api/notifications/${actionResponse.data.notification_id}`, {
        status: accept ? 'accepted' : 'declined',
        invitation_status: accept ? 'accepted' : 'declined',
        read_at: new Date().toISOString()
      });
    }

    return actionResponse.data;
  } catch (error) {
    console.error('Error responding to invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to respond to invitation');
  }
};

export const fetchNotifications = async (page = 1) => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/notifications?page=${page}`);
    
    if (!response.data) {
      return { data: [], meta: { current_page: 1, last_page: 1 } };
    }

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
    console.error('Notification fetch error:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw error;
  }
};

export const fetchUnreadNotifications = async () => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/notifications/unread`);
    return {
      data: response.data.data || [],
      meta: {
        current_page: response.data.current_page,
        last_page: response.data.last_page,
        total: response.data.total
      }
    };
  } catch (error) {
    console.error('Unread notification fetch error:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  setupAuthHeader();
  try {
    await axios.post(`${API_URL}/api/notifications/${notificationId}/read`);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Add a new function to handle notifications
export const markNotificationAsHandled = async (notificationId, status = 'handled') => {
  setupAuthHeader();
  try {
    await axios.patch(`${API_URL}/api/notifications/${notificationId}`, {
      status: status
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as handled:', error);
    return false;
  }
};

// Update the polling function to use unread notifications
export const startNotificationPolling = (callback, interval = 10000) => {
  const pollTimer = setInterval(async () => {
    try {
      const response = await fetchUnreadNotifications();
      callback(response);
    } catch (error) {
      console.error('Notification polling error:', error);
    }
  }, interval);

  return () => clearInterval(pollTimer);
};

// Add function to delete notification
export const deleteNotification = async (notificationId) => {
  setupAuthHeader();
  try {
    await axios.delete(`${API_URL}/api/notifications/${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};