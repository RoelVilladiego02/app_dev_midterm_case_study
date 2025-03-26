// Component for handling user logout
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../componentsStyles/Dashboard.module.css';

const LogoutButton = () => {
    const navigate = useNavigate();

    // Handle logout click with confirmation
    const handleLogoutClick = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            // Clear user data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login page
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
