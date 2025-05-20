import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../componentsStyles/ProjectForm.module.css';

const ProjectForm = ({ initialData = {}, onSubmit, isLoading, isCompleted = false }) => {
  // Format dates for input fields
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) 
      ? date.toISOString().split('T')[0]
      : '';
  };

  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [startDate, setStartDate] = useState(formatDateForInput(initialData.start_date) || '');
  const [endDate, setEndDate] = useState(formatDateForInput(initialData.end_date) || '');
  const [totalBudget, setTotalBudget] = useState(initialData.total_budget || '');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    const MAX_BUDGET = 999999999.99;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time component for date comparison
    
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.length > 255) newErrors.title = 'Title cannot exceed 255 characters.';
    
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(0, 0, 0, 0);

      if (startDate && new Date(startDate) > endDateObj) {
        newErrors.endDate = 'End date cannot be earlier than start date.';
      }
      
      if (endDateObj < today) {
        newErrors.endDate = 'End date cannot be in the past.';
      }
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

  // Get today's date for the end date input only
  const today = new Date().toISOString().split('T')[0];

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
          min={startDate || today} // Use start date as minimum if available
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