import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchTaskAnalytics } from '../../services/reportService';
import styles from '../../componentsStyles/reports/TaskAnalytics.module.css';

const TaskAnalytics = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Loading task analytics for project:', projectId);
        const response = await fetchTaskAnalytics(projectId);
        
        if (!response) {
          throw new Error('No analytics data received');
        }

        setData(response);
        console.log('Task analytics loaded:', response);
      } catch (err) {
        console.error('Task analytics error:', err);
        setError(
          err.message === 'Too Many Attempts' 
            ? 'Server is busy. Data will reload automatically...' 
            : `Error loading task analytics: ${err.message}`
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
    } else {
      setError('No project ID provided');
    }
  }, [projectId, retryCount]);

  if (loading) return <div className={styles.loading}>Loading task analytics...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div className={styles.noData}>No task data available</div>;

  // Transform data for status chart with null checks
  const statusChartData = (data.tasks_by_status || []).map(status => ({
    name: (status.status || 'Unknown').charAt(0).toUpperCase() + (status.status || 'Unknown').slice(1),
    count: status.count || 0,
    percentage: status.percentage || 0
  }));

  // Transform data for priority chart with null checks
  const priorityChartData = (data.tasks_by_priority || []).map(priority => ({
    name: (priority.priority || 'Unknown').charAt(0).toUpperCase() + (priority.priority || 'Unknown').slice(1),
    count: priority.count || 0,
    percentage: priority.percentage || 0
  }));

  // Add default values for summary data
  const summary = data.summary || { completed: 0, in_progress: 0, todo: 0 };
  const totalTasks = data.total_tasks || 0;

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <div className={styles.stat}>
          <h4>Task Overview</h4>
          <div className={styles.statNumbers}>
            <span>Total Tasks: {totalTasks}</span>
            <span>Completed: {summary.completed}</span>
            <span>In Progress: {summary.in_progress}</span>
            <span>To Do: {summary.todo}</span>
          </div>
        </div>
      </div>

      <div className={styles.chartsContainer}>
        {/* Status Distribution Chart */}
        <div className={styles.chartSection}>
          <h4>Task Status Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value} tasks`} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Number of Tasks" 
                fill="#0066cc" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution Chart */}
        <div className={styles.chartSection}>
          <h4>Task Priority Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value} tasks`} />
              <Legend />
              <Bar 
                dataKey="count" 
                name="Number of Tasks" 
                fill="#28a745" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TaskAnalytics;
