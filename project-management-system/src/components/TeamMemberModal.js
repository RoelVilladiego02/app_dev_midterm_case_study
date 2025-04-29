import React, { useState, useEffect } from 'react';
import { fetchAllUsers } from '../services/userService';
import { sendTeamInvitation, fetchTeamMembers } from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const TeamMemberModal = ({ projectId, currentTeamMembers, onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Get both all users and current team members
        const [allUsers, existingMembers] = await Promise.all([
          fetchAllUsers(),
          fetchTeamMembers(projectId)
        ]);
        
        // Filter out users who are:
        // 1. Already team members from the existingMembers response
        // 2. In the currentTeamMembers prop
        // 3. The current user (to prevent self-invitation)
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const availableUsers = allUsers.filter(user => 
          !existingMembers.some(member => member.id === user.id) &&
          !currentTeamMembers.some(member => member.id === user.id) &&
          user.id !== currentUser?.id
        );
        
        setUsers(availableUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load available users');
      }
    };
    loadUsers();
  }, [projectId, currentTeamMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendTeamInvitation(projectId, selectedUserId);
      setSuccess('Invitation sent successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Invitation error:', err);
      setError(err.message || 'Failed to send invitation');
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
        <form onSubmit={handleInvite}>
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
          <div className={styles.modalActions}>
            <button
              type="submit"
              disabled={!selectedUserId || isLoading}
              className={styles.submitButton}
            >
              {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberModal;
