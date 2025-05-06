import React, { useState, useEffect, useCallback } from 'react';
import { fetchTaskComments, addTaskComment, deleteTaskComment } from '../services/taskCommentService';
import { fetchNotifications } from '../services/notificationService';
import styles from '../componentsStyles/TaskComments.module.css';

const TaskComments = ({ taskId, assignedUser, currentUser, isProjectOwner }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canComment = useCallback(() => {
    if (!currentUser) return false;
    
    const currentUserId = String(currentUser.id);
    
    // Project owner can always comment
    if (isProjectOwner) return true;
  
    // Check both assignment methods
    return (
      (assignedUser && String(assignedUser.id) === currentUserId) ||
      (Array.isArray(assignedUser?.assignedUsers) && 
       assignedUser.assignedUsers.some(u => String(u.id) === currentUserId))
    );
  }, [currentUser, isProjectOwner, assignedUser]);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTaskComments(taskId);
      setComments(data);
      setError('');
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const result = await addTaskComment(taskId, newComment.trim());
      setComments([result.comment, ...comments]);
      setNewComment('');
      setError('');
      
      // Force refresh notifications after adding a comment
      try {
        const notificationResponse = await fetchNotifications();
        if (window.updateNotifications && typeof window.updateNotifications === 'function') {
          window.updateNotifications(notificationResponse);
        }
      } catch (notificationError) {
        console.error('Failed to refresh notifications:', notificationError);
      }
    } catch (err) {
      setError('Failed to add comment');
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteTaskComment(taskId, commentId);
      setComments(comments.filter(comment => comment.id !== commentId));
      setError('');
    } catch (err) {
      setError('Failed to delete comment');
      console.error('Error deleting comment:', err);
    }
  };

  if (loading) return <div className={styles.loading}>Loading comments...</div>;

  return (
    <div className={styles.commentsContainer}>
      {canComment() ? (
        <form onSubmit={handleSubmit} className={styles.commentForm}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className={styles.commentInput}
            disabled={submitting}
          />
          <button 
            type="submit" 
            disabled={submitting || !newComment.trim()}
            className={styles.submitButton}
          >
            {submitting ? 'Adding...' : 'Add Comment'}
          </button>
        </form>
      ) : (
        <p className={styles.noPermission}>
          Only project owners and assigned users can comment on this task.
        </p>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.commentsList}>
        {comments.length === 0 ? (
          <p className={styles.noComments}>No comments yet.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAuthor}>{comment.user.name}</span>
                <span className={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className={styles.commentText}>{comment.comment_text}</p>
              {currentUser.id === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskComments;
