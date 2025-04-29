import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from '../componentsStyles/TaskForm.module.css';

const TaskForm = ({ initialData = {}, users = [], onSubmit, isLoading, isEditMode = false }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(initialData.assignee || '');
  const [status, setStatus] = useState(isEditMode ? initialData.status || 'todo' : 'todo');
  const [priority, setPriority] = useState(initialData.priority || 'low');
  const [dueDate, setDueDate] = useState(initialData.due_date || '');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (title.length > 255) newErrors.title = 'Title cannot exceed 255 characters.';
    if (!assignee) newErrors.assignee = 'Assignee is required.';
    if (!['todo', 'in_progress', 'completed'].includes(status)) {
      newErrors.status = 'Invalid status.';
    }
    if (!['low', 'medium', 'high'].includes(priority)) {
      newErrors.priority = 'Invalid priority.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const formData = {
        title,
        description,
        assignee: parseInt(assignee), // Ensure assignee is a number
        status,
        priority,
        due_date: dueDate
      };
      console.log('Submitting task with data:', formData);
      onSubmit(formData);
    }
  };

  if (users.length === 0) {
    return (
      <div className={styles.formError}>
        <p>No team members available. Please add team members to the project first.</p>
      </div>
    );
  }

  return (
    <form className={styles.taskForm} onSubmit={handleSubmit}>
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
        <label>Assignee</label>
        <select
          value={assignee} // Ensure the dropdown value is set to the preselected assignee
          onChange={(e) => setAssignee(e.target.value)}
          required
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {errors.assignee && <p className={styles.error}>{errors.assignee}</p>}
      </div>

      {isEditMode && (
        <div className={styles.formGroup}>
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            required
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {errors.status && <p className={styles.error}>{errors.status}</p>}
        </div>
      )}

      <div className={styles.formGroup}>
        <label>Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          required
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        {errors.priority && <p className={styles.error}>{errors.priority}</p>}
      </div>

      <div className={styles.formGroup}>
        <label>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Task'}
      </button>
    </form>
  );
};

TaskForm.propTypes = {
  initialData: PropTypes.object,
  users: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isEditMode: PropTypes.bool,
};

export default TaskForm;