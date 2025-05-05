import React, { useState, useEffect } from 'react';
import { fetchAssignedUsers } from '../services/taskService';
import styles from '../componentsStyles/AssignedUsers.module.css';

const AssignedUsersList = ({ projectId, taskId, assignedUser }) => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user'));

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

  const formatUserName = (user) => {
    if (user.id === currentUser?.id) {
      return `${user.name} (you)`;
    }
    return user.name;
  };

  return (
    <span className={styles.assignedTo}>
      Assigned to: {assignedUsers.map((user, index) => (
        <React.Fragment key={user.id}>
          {index > 0 && ', '}
          {formatUserName(user)}
        </React.Fragment>
      ))}
    </span>
  );
};

export default AssignedUsersList;