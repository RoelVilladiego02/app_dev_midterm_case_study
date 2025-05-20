import React, { useState, useEffect } from 'react';
import { fetchProjectRisks } from '../../services/riskService';
import RiskMatrixChart from '../RiskMatrixChart';
import styles from '../../componentsStyles/reports/RiskMatrix.module.css';

const RiskMatrix = ({ projectId }) => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadRisks = async () => {
      try {
        const data = await fetchProjectRisks(projectId);
        setRisks(data);
      } catch (err) {
        setError('Failed to load risk data');
      } finally {
        setLoading(false);
      }
    };

    loadRisks();
  }, [projectId]);

  if (loading) return <div>Loading risk matrix...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.riskMatrixSection}>
      <h3>Risk Analysis Matrix</h3>
      <div className={styles.matrixContainer}>
        <RiskMatrixChart risks={risks} />
      </div>
      <div className={styles.summary}>
        <p>Total Risks: {risks.length}</p>
        <p>High Severity: {risks.filter(r => r.severity === 'high').length}</p>
        <p>Medium Severity: {risks.filter(r => r.severity === 'medium').length}</p>
        <p>Low Severity: {risks.filter(r => r.severity === 'low').length}</p>
      </div>
    </div>
  );
};

export default RiskMatrix;
