import React, { useState, useEffect } from 'react';
import styles from '../componentsStyles/Dashboard.module.css';
import LogoutButton from './LogoutButton';

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          {user && <p className={styles.welcome}>Welcome, {user.name}</p>}
        </div>
        <LogoutButton />
      </div>
      
      <div className={styles.gridContainer}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Projects</h2>
            <button className={styles.addButton}>Add Project</button>
          </div>
          <div className={styles.placeholder}>
            <p>No projects yet</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Tasks</h2>
            <button className={styles.addButton}>Add Task</button>
          </div>
          <div className={styles.placeholder}>
            <p>No tasks yet</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
