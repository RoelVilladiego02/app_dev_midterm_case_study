import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../componentsStyles/ProjectForm.module.css';

const ProjectForm = ({ initialData = {}, onSubmit, isLoading }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [startDate, setStartDate] = useState(initialData.start_date || '');
  const [endDate, setEndDate] = useState(initialData.end_date || '');
  const [status, setStatus] = useState(initialData.status || 'pending'); // Default to 'pending'
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.length > 255) newErrors.title = 'Title cannot exceed 255 characters.';
    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        title, // Use 'title' instead of 'name'
        description,
        start_date: startDate,
        end_date: endDate,
        status,
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
        />
        {errors.title && <p className={styles.error}>{errors.title}</p>}
      </div>

      <div className={styles.formGroup}>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        {errors.endDate && <p className={styles.error}>{errors.endDate}</p>}
      </div>

      <div className={styles.formGroup}>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <button type="submit" disabled={isLoading} className={styles.submitButton}>
        {isLoading ? 'Saving...' : 'Save Project'}
      </button>
    </form>
  );
};

ProjectForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default ProjectForm;