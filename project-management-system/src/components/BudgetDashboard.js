import React, { useState, useEffect, useCallback } from 'react';
import { updateProjectBudget, fetchProjectExpenses } from '../services/projectService';
import ExpenseForm from './ExpenseForm';
import styles from '../componentsStyles/BudgetDashboard.module.css';

const BudgetDashboard = ({ projectId, budget, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [newBudget, setNewBudget] = useState({
    totalBudget: parseFloat(budget?.total_budget || 0),
    actualExpenditure: parseFloat(budget?.actual_expenditure || 0)
  });
  const [error, setError] = useState('');

  const loadExpenses = useCallback(async () => {
    try {
      const projectExpenses = await fetchProjectExpenses(projectId);
      setExpenses(projectExpenses);
    } catch (err) {
      setError('Failed to load expenses');
    }
  }, [projectId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

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
            onExpenseAdded={async () => {
              setShowExpenseForm(false);
              await loadExpenses();
              onUpdate(budget);
            }}
          />
        )}

        <div className={styles.expensesList}>
          <h3>Expense History</h3>
          {expenses.length > 0 ? (
            <table className={styles.expensesTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.created_at).toLocaleDateString()}</td>
                    <td>{expense.description}</td>
                    <td className={styles.amount}>
                      ${parseFloat(expense.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.noExpenses}>No expenses recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;
