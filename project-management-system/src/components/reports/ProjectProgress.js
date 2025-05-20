import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchProjectProgress } from '../../services/reportService';
import styles from '../../componentsStyles/reports/ProjectProgress.module.css';

const ProjectProgress = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchProjectProgress(projectId);
        console.log('Project progress response:', response); // Debug log
        setData(response);
      } catch (err) {
        console.error('Progress data error:', err);
        setError(
          err.message === 'Too Many Attempts' 
            ? 'Server is busy. Data will reload automatically...' 
            : err.message
        );
        
        if (err.message === 'Too Many Attempts' && retryCount < 3) {
          const delay = 2000 * Math.pow(2, retryCount);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, delay);
        }
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId, retryCount]);

  if (loading) return <div className={styles.loading}>Loading progress data...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div className={styles.noData}>No progress data available</div>;

  const progressData = [
    { name: 'To Do', tasks: data.task_statistics.todo || 0 },
    { name: 'In Progress', tasks: data.task_statistics.in_progress || 0 },
    { name: 'Completed', tasks: data.task_statistics.completed || 0 }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.progressSummary}>
        <div className={styles.stat}>
          <h4>Total Tasks</h4>
          <p>{data.task_statistics.total || 0}</p>
        </div>
        <div className={styles.stat}>
          <h4>Completion Rate</h4>
          <p>{data.progress_percentage?.toFixed(1) || 0}%</p>
        </div>
        <div className={styles.stat}>
          <h4>Project Status</h4>
          <p className={styles[data.status || 'pending']}>
            {(data.status || 'Pending').replace('_', ' ')}
          </p>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => [`${value} tasks`, 'Count']}
              labelStyle={{ color: '#333' }}
            />
            <Bar 
              dataKey="tasks" 
              fill="#0066cc"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.timelineInfo}>
        <div className={styles.timelineStat}>
          <h4>Start Date</h4>
          <p>{data.start_date ? new Date(data.start_date).toLocaleDateString() : 'Not set'}</p>
        </div>
        <div className={styles.timelineStat}>
          <h4>End Date</h4>
          <p>{data.end_date ? new Date(data.end_date).toLocaleDateString() : 'Not set'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectProgress;
