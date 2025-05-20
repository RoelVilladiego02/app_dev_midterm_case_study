import React, { useState, useEffect } from 'react';
import { 
  fetchTaskComments, 
  addTaskComment, 
  deleteTaskComment 
} from '../services/taskCommentService';
import styles from '../componentsStyles/TaskComments.module.css';

const TaskComments = ({ taskId, assignedUser, currentUser, isProjectOwner }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const fetchedComments = await fetchTaskComments(taskId);
        setComments(fetchedComments);
        setError('');
      } catch (err) {
        console.error('Error loading comments:', err);
        // Only show error if it's not a permission issue
        if (!err.message.includes('permission')) {
          setError('Failed to load comments');
        }
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [taskId]);

  // Check if user has access to comment
  const canComment = () => {
    if (isProjectOwner) return true;
    if (!currentUser || !assignedUser) return false;
    return currentUser.id === assignedUser.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await addTaskComment(taskId, newComment.trim());
      setNewComment('');
      // Reload comments after adding new one
      const fetchedComments = await fetchTaskComments(taskId);
      setComments(fetchedComments);
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
      // Reload comments after deletion
      const fetchedComments = await fetchTaskComments(taskId);
      setComments(fetchedComments);
    } catch (err) {
      setError('Failed to delete comment');
      console.error('Error deleting comment:', err);
    }
  };

  const canDeleteComment = (comment) => {
    return isProjectOwner || comment.user_id === currentUser?.id;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={styles.commentsSection}>
      <h4>Comments</h4>
      
      {error && <div className={styles.error}>{error}</div>}
      
      {canComment() && (
        <form onSubmit={handleSubmit} className={styles.commentForm}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className={styles.commentInput}
            rows="3"
            disabled={submitting}
          />
          <button 
            type="submit" 
            disabled={submitting || !newComment.trim()}
            className={styles.submitButton}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      )}

      <div className={styles.commentsList}>
        {loading ? (
          <div className={styles.loading}>Loading comments...</div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.userName}>{comment.user?.name}</span>
                <span className={styles.timestamp}>
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className={styles.commentText}>{comment.comment_text}</p>
              {canDeleteComment(comment) && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              )}
            </div>
          ))
        ) : (
          <p className={styles.noComments}>No comments yet</p>
        )}
      </div>
    </div>
  );
};

export default TaskComments;
