import React, { useState, useEffect } from 'react';
import { fetchAssignedUsers } from '../services/projectService';
import styles from '../componentsStyles/AssignedUsers.module.css';

const AssignedUsersList = ({ projectId, taskId, assignedUser }) => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAssignedUsers = async () => {
      try {
        setLoading(true);
        // If we already have assignedUser data from parent component, use it
        if (assignedUser) {
          setAssignedUsers([assignedUser]);
        } else {
          // Otherwise fetch from API
          const users = await fetchAssignedUsers(projectId, taskId);
          setAssignedUsers(users);
        }
      } catch (err) {
        console.error('Failed to load assigned users:', err);
        setError('Failed to load assigned users');
      } finally {
        setLoading(false);
      }
    };

    loadAssignedUsers();
  }, [projectId, taskId, assignedUser]);

  if (loading) return <div className={styles.loading}>Loading assigned users...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  
  return (
    <div className={styles.assignedUsers}>
      <h4>Assigned Users</h4>
      {assignedUsers && assignedUsers.length > 0 ? (
        <ul className={styles.usersList}>
          {assignedUsers.map(user => (
            <li key={user.id} className={styles.userItem}>
              {user.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.noUsers}>No users assigned</p>
      )}
    </div>
  );
};

export default AssignedUsersList;