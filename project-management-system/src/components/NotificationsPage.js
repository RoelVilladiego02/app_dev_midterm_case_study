import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  deleteNotification,
  respondToInvitation 
} from '../services/notificationService';
import Header from './Header';
import styles from '../componentsStyles/NotificationsPage.module.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0
  });
  const navigate = useNavigate();

  const loadNotifications = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetchNotifications(page);
      setNotifications(prev => 
        page === 1 ? response.data : [...prev, ...response.data]
      );
      setPagination({
        currentPage: response.meta.current_page,
        lastPage: response.meta.last_page,
        total: response.meta.total
      });
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleInvitationResponse = async (notification, accept) => {
    try {
      await respondToInvitation(notification.data.invitation_id, accept);
      await loadNotifications(); // Refresh notifications
    } catch (err) {
      setError('Failed to process invitation response');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read_at: new Date().toISOString() }
          : notification
      ));
    } catch (err) {
      setError('Failed to mark notification as read');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      setError('Failed to delete notification');
    }
  };

  const handleViewTask = (projectId, taskId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleLoadMore = () => {
    if (pagination.currentPage < pagination.lastPage) {
      loadNotifications(pagination.currentPage + 1);
    }
  };

  const renderNotificationContent = (notification) => {
    const type = notification.data.type || notification.type;

    if (type.includes('TeamInvitationNotification') || type === 'team_invitation') {
      const invitationStatus = notification.data.invitation_status || notification.status;
      const isPending = !invitationStatus || invitationStatus === 'pending';

      return (
        <div className={styles.notificationContent}>
          <p>{notification.data.message}</p>
          {isPending && !notification.read_at && (
            <div className={styles.actionButtons}>
              <button
                onClick={() => handleInvitationResponse(notification, true)}
                className={styles.acceptButton}
              >
                Accept
              </button>
              <button
                onClick={() => handleInvitationResponse(notification, false)}
                className={styles.declineButton}
              >
                Decline
              </button>
            </div>
          )}
          {!isPending && (
            <div className={styles.statusBadge}>
              Status: {invitationStatus.charAt(0).toUpperCase() + invitationStatus.slice(1)}
            </div>
          )}
        </div>
      );
    } else if (type.includes('TaskCommentNotification') || type === 'task_comment') {
      return (
        <div className={styles.notificationContent}>
          <p>{notification.data.message}</p>
          <button
            onClick={() => handleViewTask(notification.data.project_id, notification.data.task_id)}
            className={styles.viewButton}
          >
            View Task
          </button>
        </div>
      );
    } else if (type.includes('TaskFileUploadNotification') || type === 'task_file_upload') {
      return (
        <div className={styles.notificationContent}>
          <p>{notification.data.message}</p>
          <div className={styles.fileInfo}>
            <small>Task: {notification.data.task_title}</small>
            <small>File: {notification.data.file_name}</small>
            <button
              onClick={() => handleViewTask(notification.data.project_id, notification.data.task_id)}
              className={styles.viewButton}
            >
              View Task
            </button>
          </div>
        </div>
      );
    }

    return <p>{notification.data.message}</p>;
  };

  return (
    <div className={styles.pageContainer}>
      <Header user={JSON.parse(localStorage.getItem('user'))} />
      <div className={styles.content}>
        <h1>Notifications ({pagination.total})</h1>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.notificationsList}>
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`${styles.notificationItem} ${!notification.read_at ? styles.unread : ''}`}
            >
              {renderNotificationContent(notification)}
              <div className={styles.notificationFooter}>
                <span className={styles.timestamp}>
                  {new Date(notification.created_at).toLocaleString()}
                </span>
                <div className={styles.actions}>
                  {!notification.read_at && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className={styles.markReadButton}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pagination.currentPage < pagination.lastPage && (
          <div className={styles.loadMoreContainer}>
            <button 
              onClick={handleLoadMore}
              className={styles.loadMoreButton}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
