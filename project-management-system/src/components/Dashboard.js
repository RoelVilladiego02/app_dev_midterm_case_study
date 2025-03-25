import React from 'react';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  return (
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      
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
