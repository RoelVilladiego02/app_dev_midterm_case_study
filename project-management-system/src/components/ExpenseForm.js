import React, { useState } from 'react';
import { addExpenditure } from '../services/projectService';
import styles from '../componentsStyles/ExpenseForm.module.css';

const ExpenseForm = ({ projectId, budget, onExpenseAdded }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const expenseAmount = parseFloat(amount);
    if (!expenseAmount || expenseAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check if expense exceeds remaining budget
    const remainingBudget = budget.total_budget - budget.actual_expenditure;
    if (expenseAmount > remainingBudget) {
      setError('Expense amount exceeds remaining budget');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addExpenditure(projectId, expenseAmount, description);
      
      // Update budget if response includes updated budget info
      if (result.project_budget) {
        onExpenseAdded(result.project_budget);
      } else {
        onExpenseAdded();
      }
      
      // Clear form
      setAmount('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label>Amount ($)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  );
};

export default ExpenseForm;
