import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../componentsStyles/Dashboard.module.css';

const LogoutButton = () => {
    const navigate = useNavigate();

    const handleLogoutClick = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <button onClick={handleLogoutClick} className={styles.logoutButton}>
            Logout
        </button>
    );
};

export default LogoutButton;
