import React, { useState, useEffect, useCallback } from 'react';
import { updateProjectBudget, fetchProjectExpenses, fetchBudgetHistory } from '../services/projectService';
import ExpenseForm from './ExpenseForm';
import BudgetHistory from './BudgetHistory';
import styles from '../componentsStyles/BudgetDashboard.module.css';

const BudgetDashboard = ({ projectId, budget, onUpdate, isOwner }) => {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [additionalBudget, setAdditionalBudget] = useState(0);
  const [budgetHistories, setBudgetHistories] = useState([]);

  const loadExpenses = useCallback(async () => {
    if (!isOwner) return; // Only load expenses for owners
    try {
      const projectExpenses = await fetchProjectExpenses(projectId);
      setExpenses(projectExpenses);
    } catch (err) {
      setError('Failed to load expenses');
    }
  }, [projectId, isOwner]);

  const loadBudgetHistory = useCallback(async () => {
    if (!isOwner) return;
    try {
      const histories = await fetchBudgetHistory(projectId);
      setBudgetHistories(histories);
    } catch (err) {
      setError('Failed to load budget history');
    }
  }, [projectId, isOwner]);

  useEffect(() => {
    loadExpenses();
    loadBudgetHistory(); // Load budget history when component mounts
  }, [loadExpenses, loadBudgetHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (additionalBudget < 0) {
      setError('Additional budget cannot be negative');
      return;
    }

    try {
      const newTotalBudget = parseFloat(budget.total_budget) + parseFloat(additionalBudget);
      await updateProjectBudget(projectId, {
        totalBudget: newTotalBudget,
        actualExpenditure: budget.actual_expenditure // keep existing expenditure
      });
      onUpdate({
        total_budget: newTotalBudget,
        actual_expenditure: budget.actual_expenditure
      });
      setIsAddingBudget(false);
      setAdditionalBudget(0);
      setError('');
      await loadBudgetHistory(); // Refresh budget history after adding budget
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
        {isOwner && (
          <button onClick={() => setIsAddingBudget(true)} className={styles.editButton}>
            Add Budget
          </button>
        )}
      </div>

      {isAddingBudget ? (
        <form onSubmit={handleSubmit} className={styles.budgetForm}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formGroup}>
            <label>Additional Budget ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={additionalBudget}
              onChange={(e) => setAdditionalBudget(e.target.value)}
            />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton}>
              Add to Budget
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingBudget(false);
                setAdditionalBudget(0);
              }}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.budgetSummary}>
          {isOwner ? (
            // Show full budget details to owner
            <>
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
            </>
          ) : (
            // Show limited budget info to team members
            <div className={styles.budgetItem}>
              <span>Project Budget Status:</span>
              <span className={styles[budgetStatus]}>
                {remainingBudget >= 0 ? 'Within Budget' : 'Over Budget'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Only show expense section to owners */}
      {isOwner && (
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
      )}

      {/* Add budget history section for owners */}
      {isOwner && <BudgetHistory histories={budgetHistories} />}
    </div>
  );
};

export default BudgetDashboard;
