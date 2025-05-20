import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { fetchBudgetAnalytics } from '../../services/reportService';
import styles from '../../componentsStyles/reports/BudgetAnalytics.module.css';

const BudgetAnalytics = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetchBudgetAnalytics(projectId);
        const processedData = {
          ...response,
          total_budget: parseFloat(response.total_budget || 0),
          actual_expenditure: parseFloat(response.actual_expenditure || 0),
          remaining_budget: parseFloat(response.total_budget || 0) - parseFloat(response.actual_expenditure || 0)
        };
        setData(processedData);
      } catch (err) {
        console.error('Budget analytics error:', err);
        setError(
          err.message === 'Too Many Attempts' 
            ? 'Server is busy. Data will reload automatically...' 
            : err.message
        );
        
        // Auto-retry with increasing delay if rate limited
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

    loadData();
  }, [projectId, retryCount]);

  if (loading) return <div className={styles.loading}>Loading budget data...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <div className={styles.noData}>No budget data available</div>;

  const pieData = [
    { name: 'Spent', value: data.actual_expenditure },
    { name: 'Remaining', value: data.remaining_budget }
  ];

  const COLORS = ['#FF8042', '#00C49F'];

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <div className={styles.stat}>
          <h4>Total Budget</h4>
          <p>${data.total_budget.toFixed(2)}</p>
        </div>
        <div className={styles.stat}>
          <h4>Spent</h4>
          <p>${data.actual_expenditure.toFixed(2)}</p>
        </div>
        <div className={styles.stat}>
          <h4>Remaining</h4>
          <p>${data.remaining_budget.toFixed(2)}</p>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BudgetAnalytics;
