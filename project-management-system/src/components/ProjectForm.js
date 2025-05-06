import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../componentsStyles/ProjectForm.module.css';

const ProjectForm = ({ initialData = {}, onSubmit, isLoading, isCompleted = false }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [startDate, setStartDate] = useState(initialData.start_date || '');
  const [endDate, setEndDate] = useState(initialData.end_date || '');
  const [totalBudget, setTotalBudget] = useState(initialData.total_budget || '');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    const MAX_BUDGET = 999999999.99; // Maximum value for MySQL DECIMAL(10,2)
    
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.length > 255) newErrors.title = 'Title cannot exceed 255 characters.';
    
    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }
    
    if (totalBudget) {
      const budgetValue = parseFloat(totalBudget);
      if (budgetValue < 0) {
        newErrors.totalBudget = 'Budget cannot be negative.';
      } else if (budgetValue > MAX_BUDGET) {
        newErrors.totalBudget = `Budget cannot exceed ${MAX_BUDGET.toLocaleString()}.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status: 'pending',
        total_budget: totalBudget ? parseFloat(totalBudget) : 0,
        actual_expenditure: 0
      });
    }
  };

  return (
    <form className={styles.projectForm} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength="255"
          required
          disabled={isCompleted}
        />
        {errors.title && <p className={styles.error}>{errors.title}</p>}
      </div>

      <div className={styles.formGroup}>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isCompleted}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={isCompleted}
        />
      </div>

      <div className={styles.formGroup}>
        <label>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          disabled={isCompleted}
        />
        {errors.endDate && <p className={styles.error}>{errors.endDate}</p>}
      </div>

      <div className={styles.formGroup}>
        <label>Total Budget</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={totalBudget}
          onChange={(e) => setTotalBudget(e.target.value)}
          placeholder="Enter project budget"
          disabled={isCompleted}
        />
        {errors.totalBudget && <p className={styles.error}>{errors.totalBudget}</p>}
      </div>

      {isCompleted ? (
        <p className={styles.completedMessage}>
          This project is marked as completed and cannot be edited.
        </p>
      ) : (
        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          {isLoading ? 'Saving...' : 'Save Project'}
        </button>
      )}
    </form>
  );
};

ProjectForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isCompleted: PropTypes.bool,
};

export default ProjectForm;