import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from '../componentsStyles/ProgressTracking.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ProgressTracking = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const chartData = {
    labels: ['To Do', 'In Progress', 'Completed'],
    datasets: [
      {
        label: 'Tasks',
        data: [
          tasks.filter(task => task.status === 'todo').length,
          tasks.filter(task => task.status === 'in_progress').length,
          tasks.filter(task => task.status === 'completed').length
        ],
        backgroundColor: [
          'rgba(108, 117, 125, 0.7)',  // grey for todo
          'rgba(13, 202, 240, 0.7)',   // blue for in progress
          'rgba(25, 135, 84, 0.7)'     // green for completed
        ],
        borderColor: [
          'rgba(108, 117, 125, 1)',
          'rgba(13, 202, 240, 1)',
          'rgba(25, 135, 84, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Task Status Distribution'
      }
    }
  };

  return (
    <div className={styles.progressContainer}>
      <div className={styles.overallProgress}>
        <h3>Project Progress</h3>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${overallProgress}%` }}
          />
          <span className={styles.progressLabel}>{Math.round(overallProgress)}%</span>
        </div>
        <div className={styles.progressStats}>
          <span>Completed Tasks: {completedTasks}</span>
          <span>Total Tasks: {totalTasks}</span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default ProgressTracking;
