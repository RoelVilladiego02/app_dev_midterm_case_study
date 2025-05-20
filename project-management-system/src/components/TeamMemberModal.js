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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');
        
        const allUsers = await fetchAllUsers();
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const availableUsers = allUsers.filter(user => 
          !currentTeamMembers.some(member => member.id === user.id) &&
          user.id !== currentUser?.id
        );
        
        setUsers(availableUsers);
        setFilteredUsers(availableUsers);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load available users. Please try again.');
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [currentTeamMembers]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setSelectedUser(null);
    
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
    setFilteredUsers(filtered);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setSelectedUserId(user.id.toString());
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a user to invite');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!projectId || isNaN(parseInt(projectId))) {
        throw new Error(`Invalid project ID: ${projectId}`);
      }
      
      if (!selectedUserId || isNaN(parseInt(selectedUserId))) {
        throw new Error(`Invalid user ID: ${selectedUserId}`);
      }
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const result = await sendTeamInvitation(projectId, selectedUserId);
      
      setSuccess(result.message || 'Invitation sent successfully!');
      setSelectedUserId('');
      
      if (onTeamUpdate) {
        await onTeamUpdate();
      }
      
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError(err.message || 'Failed to send invitation. Please try again.');
      
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
      <div className={styles.teamModalContent}>
        <h3 className={styles.modalTitle}>Invite Team Member</h3>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        
        {loadingUsers ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading available users...</p>
          </div>
        ) : (
          <form onSubmit={handleInvite}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.searchInput}
                autoComplete="off"
              />
              
              {searchQuery && !selectedUser && (
                <div className={styles.searchResults}>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={styles.searchResultItem}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className={styles.userName}>{user.name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noResults}>
                      No matching users found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {selectedUser && (
              <div className={styles.selectedUser}>
                <div className={styles.userName}>{selectedUser.name}</div>
                <div className={styles.userEmail}>{selectedUser.email}</div>
              </div>
            )}
            
            <div className={styles.modalActions}>
              <button
                type="submit"
                disabled={!selectedUser || isLoading}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Sending Invitation...
                  </>
                ) : (
                  'Send Invitation'
                )}
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
      </div>
    </div>
  );
};

export default TeamMemberModal;