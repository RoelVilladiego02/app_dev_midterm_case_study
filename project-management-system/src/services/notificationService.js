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

export const fetchNotifications = async () => {
  setupAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/api/notifications`);
    const notifications = response.data.data || response.data || [];
    
    // Get all team invitation notifications
    const invitationNotifications = notifications.filter(notification => {
      // Skip if notification doesn't exist
      if (!notification) return false;

      // Skip if notification is deleted
      if (notification.deleted_at) return false;

      if (notification.type && notification.type.includes('TeamInvitationNotification')) {
        const data = notification.data || {};
        
        // Double check the actual invitation still exists and is pending
        // This handles the race condition where notification exists but invitation was deleted
        if (data.invitation_id) {
          try {
            // Perform a quick check for the invitation status without blocking
            // This runs asynchronously and doesn't affect the current filtering
            checkInvitationStatus(data.invitation_id, notification.id);
          } catch (error) {
            console.warn('Failed to verify invitation status:', error);
          }
        }
        
        // Don't show notifications for:
        // 1. Deleted invitations
        // 2. Cancelled invitations
        // 3. Already handled invitations
        // 4. Already read notifications 
        // 5. Invitations with invalid status
        if (data.is_deleted) return false;
        if (data.status === 'cancelled') return false;
        if (data.status === 'handled') return false;
        if (data.invitation_status === 'cancelled') return false;
        if (data.cancelled_at) return false;
        if (notification.read_at) return false;

        // Only show pending invitations
        return data.invitation_status === 'pending' || !data.invitation_status;
      }
      
      // For non-invitation notifications, only show unread ones
      return !notification.read_at;
    });
    
    return invitationNotifications;
  } catch (error) {
    console.error('Error fetching notifications:', error.response?.data);
    throw error.response?.data?.message || 'Failed to fetch notifications';
  }
};

// New function to verify invitation status and delete stale notifications
const checkInvitationStatus = async (invitationId, notificationId) => {
  try {
    // Try to fetch the invitation - if it doesn't exist anymore, clean up the notification
    await axios.get(`${API_URL}/api/invitations/${invitationId}`);
  } catch (error) {
    // If invitation not found (status 404), delete the notification
    if (error.response?.status === 404) {
      console.log(`Removing stale notification ${notificationId} for non-existent invitation ${invitationId}`);
      try {
        await deleteNotification(notificationId);
      } catch (deleteError) {
        console.error('Failed to delete stale notification:', deleteError);
      }
    }
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