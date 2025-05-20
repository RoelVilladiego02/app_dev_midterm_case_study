import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  fetchUnreadNotifications, 
  respondToInvitation, 
  markNotificationAsRead,
  startNotificationPolling 
} from '../services/notificationService';
import LogoutButton from './LogoutButton';
import styles from '../componentsStyles/Header.module.css';

const Header = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState([]); // Track which notifications are being processed

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetchUnreadNotifications();
      setNotifications(response.data || []);
      setError('');
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadNotifications();

    // Start polling for new notifications
    const stopPolling = startNotificationPolling((response) => {
      // Extract notifications array from paginated response
      setNotifications(response.data || []);
    });

    // Cleanup polling on component unmount
    return () => stopPolling();
  }, []);

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

  const handleViewTask = (projectId, taskId) => {
    setShowNotifications(false);
    navigate(`/projects/${projectId}`);
    // Mark notification as read
    const currentNotification = notifications.find(n => n.data.task_id === taskId);
    if (currentNotification) {
      markNotificationAsRead(currentNotification.id);
    }
  };

  const handleSeeAllNotifications = () => {
    setShowNotifications(false);
    navigate('/notifications');
  };

  const renderNotificationContent = (notification) => {
    if (notification.type.includes('TeamInvitationNotification')) {
      return (
        <>
          <p>{notification.data.message}</p>
          {(!notification.data.invitation_status || 
            notification.data.invitation_status === 'pending') && (
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
        </>
      );
    } else if (notification.type.includes('TaskCommentNotification')) {
      return (
        <>
          <p>{notification.data.message}</p>
          <div className={styles.commentInfo}>
            <small>Task: {notification.data.task_title}</small>
            <button
              onClick={() => handleViewTask(notification.data.project_id, notification.data.task_id)}
              className={styles.viewButton}
            >
              View Task
            </button>
          </div>
        </>
      );
    } else if (notification.type.includes('TaskFileUploadNotification') || 
               notification.data?.type === 'task_file_upload') {
      return (
        <>
          <p>{notification.data.message}</p>
          <div className={styles.commentInfo}>
            <small>Task: {notification.data.task_title}</small>
            <button
              onClick={() => handleViewTask(notification.data.project_id, notification.data.task_id)}
              className={styles.viewButton}
            >
              View Task
            </button>
          </div>
        </>
      );
    }
    return <p>{notification.data.message}</p>;
  };

  // Determine if a notification is currently being processed
  const isProcessing = (notificationId) => {
    return processingIds.includes(notificationId);
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1>Klick Inc. Project Management</h1>
        {user && <p className={styles.welcomeText}>Welcome, {user.name}</p>}
      </div>
      <div className={styles.headerRight}>
        {user && location.pathname !== '/dashboard' && (
          <Link to="/dashboard" className={styles.dashboardLink}>
            Dashboard
          </Link>
        )}
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
              <div className={styles.notificationHeader}>
                <h3>Notifications</h3>
              </div>
              <div className={styles.notificationContent}>
                {error && <div className={styles.error}>{error}</div>}
                {loading ? (
                  <div className={styles.loading}>Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className={styles.noNotifications}>
                    No New Notifications
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div key={notification.id} className={styles.notificationItem}>
                      {renderNotificationContent(notification)}
                    </div>
                  ))
                )}
              </div>
              <div className={styles.seeAll} onClick={handleSeeAllNotifications}>
                See all notifications
              </div>
            </div>
          )}
        </div>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Header;