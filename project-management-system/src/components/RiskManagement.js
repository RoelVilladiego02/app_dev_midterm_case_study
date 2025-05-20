import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchProjectRisks, 
  createRisk, 
  updateRisk, 
  deleteRisk 
} from '../services/riskService';
import styles from '../componentsStyles/RiskManagement.module.css';
import RiskMatrixChart from './RiskMatrixChart';

const RiskManagement = ({ projectId, isOwner }) => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    severity: 'low',
    probability: 'low',
    status: 'identified',
    mitigation_plan: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  
  const loadRisks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjectRisks(projectId);
      setRisks(data);
      setError('');
    } catch (err) {
      setError('Failed to load risks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  const validateForm = () => {
    const errors = {};
    if (!newRisk.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!newRisk.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!newRisk.mitigation_plan.trim()) {
      errors.mitigation_plan = 'Mitigation plan is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      await createRisk(projectId, newRisk);
      setShowAddForm(false);
      setNewRisk({
        title: '',
        description: '',
        severity: 'low',
        probability: 'low',
        status: 'identified',
        mitigation_plan: ''
      });
      await loadRisks();
    } catch (err) {
      if (err.response?.data?.errors) {
        setValidationErrors(err.response.data.errors);
      } else {
        setError(err.message || 'Failed to create risk');
      }
    }
  };

  const handleStatusUpdate = async (riskId, newStatus) => {
    try {
      setError(''); // Clear any existing errors
      
      // Find the current risk data
      const currentRisk = risks.find(r => r.id === riskId);
      if (!currentRisk) {
        throw new Error('Risk not found');
      }

      // Update the risk with all required fields
      const updatedRisk = await updateRisk(projectId, riskId, {
        ...currentRisk,
        status: newStatus
      });
      
      // Update the risk in the local state
      setRisks(prevRisks => prevRisks.map(risk => 
        risk.id === riskId ? { ...risk, ...updatedRisk } : risk
      ));

    } catch (err) {
      console.error('Error updating risk status:', err);
      setError(err.message || 'Failed to update risk status. Please try again.');
      
      // Revert the select value to previous state
      setRisks(prevRisks => [...prevRisks]);
    }
  };

  const handleDelete = async (riskId) => {
    if (window.confirm('Are you sure you want to delete this risk?')) {
      try {
        await deleteRisk(projectId, riskId);
        await loadRisks();
      } catch (err) {
        setError('Failed to delete risk');
      }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return styles.highSeverity;
      case 'medium': return styles.mediumSeverity;
      default: return styles.lowSeverity;
    }
  };

  return (
    <div className={styles.riskManagement}>
      <div className={styles.header}>
        <h2>Risk Management</h2>
        {isOwner && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.addButton}
          >
            {showAddForm ? 'Cancel' : 'Add Risk'}
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className={styles.riskForm}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input
              type="text"
              value={newRisk.title}
              onChange={(e) => setNewRisk({...newRisk, title: e.target.value})}
              className={validationErrors.title ? styles.inputError : ''}
              required
            />
            {validationErrors.title && (
              <span className={styles.errorText}>{validationErrors.title}</span>
            )}
          </div>
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={newRisk.description}
              onChange={(e) => setNewRisk({...newRisk, description: e.target.value})}
              className={validationErrors.description ? styles.inputError : ''}
              required
            />
            {validationErrors.description && (
              <span className={styles.errorText}>{validationErrors.description}</span>
            )}
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Severity</label>
              <select
                value={newRisk.severity}
                onChange={(e) => setNewRisk({...newRisk, severity: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Probability</label>
              <select
                value={newRisk.probability}
                onChange={(e) => setNewRisk({...newRisk, probability: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Mitigation Plan</label>
            <textarea
              value={newRisk.mitigation_plan}
              onChange={(e) => setNewRisk({...newRisk, mitigation_plan: e.target.value})}
              className={validationErrors.mitigation_plan ? styles.inputError : ''}
              required
            />
            {validationErrors.mitigation_plan && (
              <span className={styles.errorText}>{validationErrors.mitigation_plan}</span>
            )}
          </div>
          <button type="submit" className={styles.submitButton}>Add Risk</button>
        </form>
      )}

      <div className={styles.risksList}>
        {risks.length > 0 ? (
          risks.map(risk => (
            <div key={risk.id} className={styles.riskItem}>
              <div className={styles.riskHeader}>
                <h3>{risk.title}</h3>
                <span className={`${styles.severity} ${getSeverityColor(risk.severity)}`}>
                  {risk.severity.toUpperCase()}
                </span>
              </div>
              <p className={styles.description}>{risk.description}</p>
              <div className={styles.riskDetails}>
                <span>Probability: {risk.probability}</span>
                <span>Status: {risk.status}</span>
              </div>
              {risk.mitigation_plan && (
                <div className={styles.mitigationPlan}>
                  <strong>Mitigation Plan:</strong>
                  <p>{risk.mitigation_plan}</p>
                </div>
              )}
              {isOwner && (
                <div className={styles.actions}>
                  <select
                    value={risk.status}
                    onChange={(e) => handleStatusUpdate(risk.id, e.target.value)}
                    className={error ? styles.selectError : ''}
                    disabled={loading || risk.status === 'resolved'}
                  >
                    <option value="identified">Identified</option>
                    <option value="mitigating">Mitigating</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button 
                    onClick={() => handleDelete(risk.id)}
                    className={styles.deleteButton}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className={styles.noRisks}>No risks identified yet.</p>
        )}
      </div>
      
      {risks.length > 0 && (
        <div className={styles.riskMatrix}>
          <h3>Risk Matrix</h3>
          <RiskMatrixChart risks={risks} />
        </div>
      )}
    </div>
  );
};

export default RiskManagement;
