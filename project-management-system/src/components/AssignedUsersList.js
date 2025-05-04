import React, { useState, useEffect } from 'react';
import { fetchAssignedUsers } from '../services/taskService';
import styles from '../componentsStyles/AssignedUsers.module.css';

const AssignedUsersList = ({ projectId, taskId, assignedUser }) => {
  const [assignedUsers, setAssignedUsers] = useState([]);

  useEffect(() => {
    const loadAssignedUsers = async () => {
      try {
        if (assignedUser) {
          setAssignedUsers([assignedUser]);
        } else {
          const users = await fetchAssignedUsers(projectId, taskId);
          setAssignedUsers(users);
        }
      } catch (err) {
        console.error('Failed to load assigned users:', err);
      }
    };

    loadAssignedUsers();
  }, [projectId, taskId, assignedUser]);

  if (assignedUsers.length === 0) {
    return <span className={styles.unassigned}>No user assigned</span>;
  }

  return (
    <span className={styles.assignedTo}>
      Assigned to: {assignedUsers.map(user => user.name).join(', ')}
    </span>
  );
};

export default AssignedUsersList;