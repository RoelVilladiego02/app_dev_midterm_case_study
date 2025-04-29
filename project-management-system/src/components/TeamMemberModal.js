import React, { useState, useEffect } from 'react';
import { fetchAllUsers } from '../services/userService';
import { sendTeamInvitation } from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const TeamMemberModal = ({ projectId, currentTeamMembers, onClose, onTeamUpdate }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');
        
        const allUsers = await fetchAllUsers();
        console.log('Fetched all users:', allUsers);
        
        // Filter out current team members and current user
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const availableUsers = allUsers.filter(user => 
          !currentTeamMembers.some(member => member.id === user.id) &&
          user.id !== currentUser?.id
        );
        
        setUsers(availableUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load available users. Please try again.');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [currentTeamMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a user to invite');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    setDebugInfo(null);
    
    try {
      // Add validation for projectId and selectedUserId
      if (!projectId || isNaN(parseInt(projectId))) {
        throw new Error(`Invalid project ID: ${projectId}`);
      }
      
      if (!selectedUserId || isNaN(parseInt(selectedUserId))) {
        throw new Error(`Invalid user ID: ${selectedUserId}`);
      }
      
      console.log('Sending invitation to user:', selectedUserId, 'for project:', projectId);
      
      // Check auth token before making the request
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const result = await sendTeamInvitation(projectId, selectedUserId);
      
      setSuccess(result.message || 'Invitation sent successfully!');
      setSelectedUserId('');
      
      // If we have a team update callback, call it
      if (onTeamUpdate) {
        await onTeamUpdate();
      }
      
      // Delay modal close to show success message
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to send invitation:', err);
      
      // Enhanced error handling with debug info
      setError(err.message || 'Failed to send invitation. Please try again.');
      setDebugInfo({
        projectId,
        selectedUserId,
        errorType: err.name,
        fullMessage: err.toString()
      });
      
      if (err.message && (
        err.message.includes('authentication') || 
        err.message.includes('log in') || 
        err.message.includes('401')
      )) {
        alert('Your session has expired. You will be redirected to login.');
        window.location.href = '/login';
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Invite Team Member</h3>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        
        {loadingUsers ? (
          <p>Loading available users...</p>
        ) : (
          <form onSubmit={handleInvite}>
            {users.length > 0 ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={styles.select}
                disabled={isLoading}
              >
                <option value="">Select a user to invite</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : (
              <p>No users available to invite.</p>
            )}
            
            <div className={styles.modalActions}>
              <button
                type="submit"
                disabled={!selectedUserId || isLoading || users.length === 0}
                className={styles.submitButton}
              >
                {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        {/* Debug information panel (can be removed in production) */}
        {debugInfo && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
            <h4>Debug Information</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMemberModal;