import React, { useState, useEffect } from 'react';
import { fetchActivities, getActivityIcon } from '../services/activityService';
import styles from '../componentsStyles/ActivityFeed.module.css';

const ActivityFeed = ({ projectId, taskId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const response = await fetchActivities({ projectId, taskId, page: 1 });
        setActivities(response.data);
        setHasMore(response.meta.current_page < response.meta.last_page);
      } catch (err) {
        console.error('Failed to load activities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Poll for new activities every 30 seconds
    const pollInterval = setInterval(loadActivities, 30000);
    
    return () => clearInterval(pollInterval);
  }, [projectId, taskId]);

  const loadMore = async () => {
    try {
      const nextPage = page + 1;
      const response = await fetchActivities({ projectId, taskId, page: nextPage });
      setActivities(prev => [...prev, ...response.data]);
      setPage(nextPage);
      setHasMore(response.meta.current_page < response.meta.last_page);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 1000 / 60);
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={styles.activityFeed}>
      <h3 className={styles.feedHeader}>Activity Feed</h3>
      
      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setPage(1)} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}
      
      <div className={styles.activities}>
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={activity.id || index} className={styles.activityItem}>
              <span className={styles.activityIcon}>
                {getActivityIcon(activity.action)}
              </span>
              <div className={styles.activityContent}>
                <div className={styles.activityHeader}>
                  <span className={styles.userName}>{activity.user?.name}</span>
                  <span className={styles.timestamp}>
                    {formatDate(activity.created_at)}
                  </span>
                </div>
                <p className={styles.description}>{activity.description}</p>
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className={styles.metadata}>
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <span key={key} className={styles.metadataItem}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                {activity.task && (
                  <div className={styles.taskReference}>
                    Task: {activity.task.title}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            {loading ? 'Loading activities...' : 'No activities recorded yet'}
          </div>
        )}
      </div>

      {hasMore && (
        <button 
          onClick={loadMore}
          disabled={loading}
          className={styles.loadMoreButton}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
