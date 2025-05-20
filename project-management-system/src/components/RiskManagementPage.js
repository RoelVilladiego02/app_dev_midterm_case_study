import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import RiskManagement from './RiskManagement';
import styles from '../componentsStyles/RiskManagementPage.module.css';

const RiskManagementPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <div className={styles.pageContainer}>
      <Header user={user} />
      <div className={styles.content}>
        <div className={styles.header}>
          <button 
            onClick={() => navigate(`/projects/${projectId}`)} 
            className={styles.backButton}
          >
            ← Back to Project
          </button>
          <h1>Risk Management</h1>
        </div>
        <RiskManagement projectId={projectId} isOwner={true} />
      </div>
    </div>
  );
};

export default RiskManagementPage;
