import React, { useState, useEffect } from 'react';
import { 
  fetchTeamMembers, 
  assignUserToTask, 
  fetchAssignedUsers, 
  unassignUserFromTask 
} from '../services/projectService';
import styles from '../componentsStyles/Modal.module.css';

const AssignUserModal = ({ projectId, taskId, onClose }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [currentAssignee, setCurrentAssignee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch team members
        const members = await fetchTeamMembers(projectId);
        setTeamMembers(members);
        
        // Fetch current assigned user for the task
        const assignedUsers = await fetchAssignedUsers(projectId, taskId);
        if (assignedUsers && assignedUsers.length > 0) {
          setCurrentAssignee(assignedUsers[0]);
          setSelectedUserId(assignedUsers[0].id.toString());
        }
      } catch (err) {
        console.error('Error loading data for assignment:', err);
        setError(err.message || 'Failed to load team members');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [projectId, taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a team member');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // If there's a current assignee that's different from the selected one
      if (currentAssignee && currentAssignee.id.toString() !== selectedUserId) {
        console.log(`Unassigning current user ${currentAssignee.id} before assigning new user`);
        // Unassign the current user first
        await unassignUserFromTask(projectId, taskId, currentAssignee.id);
      }
      
      // Then assign the new user
      await assignUserToTask(projectId, taskId, selectedUserId);
      console.log(`User ${selectedUserId} assigned to task ${taskId}`);
      
      // Close modal and refresh parent component
      onClose();
    } catch (err) {
      console.error('Error assigning user:', err);
      setError(err.message || 'Failed to assign user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (!currentAssignee) {
      setError('No user is currently assigned to this task');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await unassignUserFromTask(projectId, taskId, currentAssignee.id);
      console.log(`User ${currentAssignee.id} unassigned from task ${taskId}`);
      onClose(); // Close modal and refresh parent component
    } catch (err) {
      console.error('Error unassigning user:', err);
      setError(err.message || 'Failed to unassign user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Assign Task to Team Member</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        {loading ? (
          <div className={styles.loading}>Loading team members...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {currentAssignee && (
              <div className={styles.currentAssignee}>
                <p>Currently assigned to: <strong>{currentAssignee.name}</strong></p>
              </div>
            )}
            
            <div className={styles.formGroup}>
              <label htmlFor="team-member">Select Team Member:</label>
              <select
                id="team-member"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value="">-- Select a team member --</option>
                {teamMembers.map(member => (
                  <option 
                    key={member.id} 
                    value={member.id}
                  >
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={styles.buttonGroup}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Assigning...' : 'Assign User'}
              </button>
              
              {currentAssignee && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleUnassign}
                  disabled={isSubmitting}
                >
                  Unassign
                </button>
              )}
              
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={isSubmitting}
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

export default AssignUserModal;