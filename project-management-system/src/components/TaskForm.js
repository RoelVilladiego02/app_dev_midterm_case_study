import React, { useState } from 'react';
import styles from '../componentsStyles/Modal.module.css';

const TaskForm = ({ initialData = {}, onSubmit, isLoading, isEditMode = false }) => {
  // Format the due date to YYYY-MM-DD for the input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) 
      ? date.toISOString().split('T')[0]
      : '';
  };

  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    due_date: formatDateForInput(initialData.due_date) || '',
    status: initialData.status || 'todo',
    completion_percentage: initialData.completion_percentage || 0  // Make sure this gets initialized
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    let newPercentage = formData.completion_percentage;

    if (newStatus === 'completed') {
      newPercentage = 100;
    } else if (newStatus === 'todo') {
      newPercentage = 0;
    }

    setFormData(prev => ({
      ...prev,
      status: newStatus,
      completion_percentage: newPercentage
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Strict validation matching Laravel requirements
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (formData.title?.length > 255) {
      newErrors.title = 'Title cannot exceed 255 characters';
    }

    // Add due date validation
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for proper comparison

      if (isNaN(dueDate.getTime())) {
        newErrors.due_date = 'Invalid date format';
      } else if (dueDate < today) {
        newErrors.due_date = 'Due date cannot be in the past';
      }
    }

    if (!['todo', 'in_progress', 'completed'].includes(formData.status)) {
      newErrors.status = 'Status must be one of: todo, in_progress, completed';
    }

    if (!['low', 'medium', 'high'].includes(formData.priority)) {
      newErrors.priority = 'Priority must be one of: low, medium, high';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submissionData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        status: formData.status || 'todo',
        priority: formData.priority || 'medium',
        due_date: formData.due_date || null,
        completion_percentage: formData.completion_percentage || 0
      };

      console.log('Submitting task:', submissionData);
      onSubmit(submissionData);
    }
  };

  // Get today's date in YYYY-MM-DD format for the input max attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {Object.keys(errors).length > 0 && (
        <div className={styles.errorContainer}>
          {Object.keys(errors).map((key) => (
            <p key={key} className={styles.error}>{errors[key]}</p>
          ))}
        </div>
      )}
      
      <div className={styles.formGroup}>
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          maxLength="255"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
        />
      </div>

      {/* Only show status field in edit mode */}
      {isEditMode && (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleStatusChange}
              required
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {isEditMode && formData.status === 'in_progress' && (
            <div className={styles.formGroup}>
              <label htmlFor="completion_percentage">Progress (%)</label>
              <input
                type="number"
                id="completion_percentage"
                name="completion_percentage"
                value={formData.completion_percentage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  completion_percentage: Math.min(99, Math.max(0, parseInt(e.target.value) || 0))
                }))}
                min="0"
                max="99"
                required
              />
              <small className={styles.hint}>Enter a value between 0 and 99</small>
            </div>
          )}
        </>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="priority">Priority *</label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          required
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="due_date">Due Date</label>
        <input
          type="date"
          id="due_date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          min={today} // Prevent selecting past dates
          className={errors.due_date ? styles.inputError : ''}
        />
        {errors.due_date && (
          <span className={styles.errorMessage}>{errors.due_date}</span>
        )}
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className={styles.submitButton}
      >
        {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Task' : 'Create Task')}
      </button>
    </form>
  );
};

export default TaskForm;
