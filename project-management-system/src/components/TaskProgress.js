import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import styles from '../componentsStyles/TaskProgress.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const TaskProgress = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const todoTasks = tasks.filter(task => task.status === 'todo').length;

  const data = {
    labels: ['Completed', 'In Progress', 'To Do'],
    datasets: [
      {
        data: [completedTasks, inProgressTasks, todoTasks],
        backgroundColor: ['#198754', '#0dcaf0', '#6c757d'],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    cutout: '60%',
  };

  return (
    <div className={styles.progressContainer}>
      <h2>Project Progress</h2>
      <div className={styles.chartWrapper}>
        <Doughnut data={data} options={options} />
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <h3>Total Tasks</h3>
          <p>{totalTasks}</p>
        </div>
        <div className={styles.stat}>
          <h3>Completed</h3>
          <p>{completedTasks}</p>
        </div>
        <div className={styles.stat}>
          <h3>In Progress</h3>
          <p>{inProgressTasks}</p>
        </div>
        <div className={styles.stat}>
          <h3>To Do</h3>
          <p>{todoTasks}</p>
        </div>
      </div>
    </div>
  );
};

export default TaskProgress;
