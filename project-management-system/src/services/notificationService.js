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
    const response = await axios.post(
      `${API_URL}/api/invitations/${invitationId}/respond`,
      { status: accept ? 'accepted' : 'declined' }
    );

    // Now the backend should be returning notification_id in the response
    if (response.data.notification_id) {
      await axios.patch(`${API_URL}/api/notifications/${response.data.notification_id}`, {
        status: accept ? 'accepted' : 'declined'
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error responding to invitation:', error);
    throw new Error(error.response?.data?.message || 'Failed to respond to invitation');
  }
};

export const fetchNotifications = async () => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/notifications`);
    const notifications = response.data.data || response.data || [];
    
    // Improved filtering logic to exclude handled invitations
    return notifications.filter(notification => {
      // First check if the notification exists and is not deleted
      if (!notification || notification.deleted_at) {
        return false;
      }
      
      if (notification.type && notification.type.includes('TeamInvitationNotification')) {
        // Ensure notification.data exists before accessing properties
        const data = notification.data || {};
        
        // Check for invitation_status in the data object
        const invitationStatus = data.invitation_status;
        const notificationStatus = data.status;
        
        // Only show invitations that haven't been handled
        return (!invitationStatus || invitationStatus === 'pending') && 
               (!notificationStatus || notificationStatus !== 'handled') &&
               !notification.read_at;
      }
      return !notification.read_at;
    });
  } catch (error) {
    console.error('Error fetching notifications:', error.response?.data);
    throw error.response?.data?.message || 'Failed to fetch notifications';
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

// Add a new function to check notifications periodically
export const startNotificationPolling = (callback, interval = 10000) => {
  const pollTimer = setInterval(async () => {
    try {
      const notifications = await fetchNotifications();
      callback(notifications);
    } catch (error) {
      console.error('Notification polling error:', error);
    }
  }, interval);

  return () => clearInterval(pollTimer);
};