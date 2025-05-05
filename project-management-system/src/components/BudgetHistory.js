import React from 'react';
import styles from '../componentsStyles/BudgetHistory.module.css';

const BudgetHistory = ({ histories }) => {
  return (
    <div className={styles.historyContainer}>
      <h3>Budget History</h3>
      {histories.length > 0 ? (
        <table className={styles.historyTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount Added</th>
              <th>Total After</th>
              <th>Added By</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {histories.map(history => (
              <tr key={history.id}>
                <td>{new Date(history.created_at).toLocaleDateString()}</td>
                <td className={styles.amount}>+${parseFloat(history.amount).toFixed(2)}</td>
                <td>${parseFloat(history.total_budget_after).toFixed(2)}</td>
                <td>{history.user?.name || 'Unknown'}</td>
                <td>{history.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noHistory}>No budget history available</p>
      )}
    </div>
  );
};

export default BudgetHistory;
