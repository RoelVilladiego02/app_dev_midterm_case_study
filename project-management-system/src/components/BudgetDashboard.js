import React, { useState } from 'react';
import { updateProjectBudget } from '../services/projectService';
import ExpenseForm from './ExpenseForm';
import styles from '../componentsStyles/BudgetDashboard.module.css';

const BudgetDashboard = ({ projectId, budget, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    totalBudget: parseFloat(budget?.total_budget || 0),
    actualExpenditure: parseFloat(budget?.actual_expenditure || 0)
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newBudget.totalBudget < 0 || newBudget.actualExpenditure < 0) {
      setError('Budget values cannot be negative');
      return;
    }

    try {
      await updateProjectBudget(projectId, newBudget);
      onUpdate({
        total_budget: newBudget.totalBudget,
        actual_expenditure: newBudget.actualExpenditure
      });
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to update budget');
    }
  };

  const totalBudget = parseFloat(budget?.total_budget || 0);
  const actualExpenditure = parseFloat(budget?.actual_expenditure || 0);
  const remainingBudget = totalBudget - actualExpenditure;
  const budgetStatus = remainingBudget >= 0 ? 'within-budget' : 'over-budget';

  return (
    <div className={styles.budgetDashboard}>
      <div className={styles.header}>
        <h2>Budget Dashboard</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className={styles.editButton}>
            Edit Budget
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className={styles.budgetForm}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formGroup}>
            <label>Total Budget ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newBudget.totalBudget}
              onChange={(e) => setNewBudget({
                ...newBudget,
                totalBudget: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Actual Expenditure ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newBudget.actualExpenditure}
              onChange={(e) => setNewBudget({
                ...newBudget,
                actualExpenditure: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton}>
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.budgetSummary}>
          <div className={styles.budgetItem}>
            <span>Total Budget:</span>
            <span>${totalBudget.toFixed(2)}</span>
          </div>
          <div className={styles.budgetItem}>
            <span>Actual Expenditure:</span>
            <span>${actualExpenditure.toFixed(2)}</span>
          </div>
          <div className={`${styles.budgetItem} ${styles[budgetStatus]}`}>
            <span>Remaining Budget:</span>
            <span>${remainingBudget.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className={styles.expenseSection}>
        <button 
          onClick={() => setShowExpenseForm(!showExpenseForm)}
          className={styles.addExpenseButton}
        >
          {showExpenseForm ? 'Cancel' : 'Add Expense'}
        </button>
        
        {showExpenseForm && (
          <ExpenseForm 
            projectId={projectId}
            budget={budget}
            onExpenseAdded={() => {
              setShowExpenseForm(false);
              onUpdate(budget);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BudgetDashboard;
