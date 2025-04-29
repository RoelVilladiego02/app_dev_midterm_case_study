import React, { useState, useEffect } from 'react';
import { 
  fetchNotifications, 
  respondToInvitation, 
  markNotificationAsRead,
  startNotificationPolling 
} from '../services/notificationService';
import LogoutButton from './LogoutButton';
import styles from '../componentsStyles/Header.module.css';

const Header = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState([]); // Track which notifications are being processed

  useEffect(() => {
    // Initial load
    loadNotifications();

    // Start polling for new notifications
    const stopPolling = startNotificationPolling((newNotifications) => {
      setNotifications(newNotifications);
    });

    // Cleanup polling on component unmount
    return () => stopPolling();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notificationsData = await fetchNotifications();
      setNotifications(notificationsData);
      setError('');
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (notification, accept) => {
    try {
      // Add this notification to processing state
      setProcessingIds(prev => [...prev, notification.id]);
      
      await respondToInvitation(notification.data.invitation_id, accept);
      
      // Immediately remove from UI to give instant feedback
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      // Mark as read on the backend for good measure
      if (notification.id) {
        await markNotificationAsRead(notification.id);
      }
      
      // Force reload notifications to ensure sync with server
      await loadNotifications();
      
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
      setError(error.message || 'Failed to process invitation');
    } finally {
      // Remove from processing state
      setProcessingIds(prev => prev.filter(id => id !== notification.id));
    }
  };

  // Determine if a notification is currently being processed
  const isProcessing = (notificationId) => {
    return processingIds.includes(notificationId);
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1>Project Management System</h1>
        {user && <p className={styles.welcomeText}>Welcome, {user.name}</p>}
      </div>
      <div className={styles.headerRight}>
        <div className={styles.notifications}>
          <button 
            className={styles.notificationButton}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <i className="fas fa-bell"></i>
            {notifications.length > 0 && (
              <span className={styles.notificationBadge}>
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className={styles.notificationDropdown}>
              {error && <div className={styles.error}>{error}</div>}
              {loading && <div className={styles.loading}>Loading...</div>}
              {!loading && notifications.length === 0 ? (
                <div className={styles.noNotifications}>
                  No new notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div key={notification.id} className={styles.notificationItem}>
                    <p>{notification.data.message}</p>
                    {notification.type.includes('TeamInvitationNotification') &&
                     (!notification.data.invitation_status || notification.data.invitation_status === 'pending') && (
                      <div className={styles.notificationActions}>
                        <button
                          onClick={() => handleInvitationResponse(notification, true)}
                          className={styles.acceptButton}
                          disabled={isProcessing(notification.id)}
                        >
                          {isProcessing(notification.id) ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(notification, false)}
                          className={styles.declineButton}
                          disabled={isProcessing(notification.id)}
                        >
                          {isProcessing(notification.id) ? 'Processing...' : 'Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Header;