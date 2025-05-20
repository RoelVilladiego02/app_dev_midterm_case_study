// Component for user login
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import '../componentsStyles/LoginPage.css';

const LoginPage = () => {
    // State variables for form inputs and UI states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Set loading state and clear error
        setIsLoading(true);
        setError('');

        try {
            // Attempt to login using authService
            const response = await login(email, password);
            // If login successful, store user data and redirect
            if (response.token && response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
                navigate('/dashboard');
            } else {
                setError('Invalid login response');
            }
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    // Render login form using React.createElement
    return React.createElement('div', { className: 'login-container' },
        React.createElement('div', { className: 'login-box' },
            React.createElement('div', { className: 'login-header' },
                React.createElement('h1', null, 'Welcome to Klick Inc.'),
                React.createElement('p', { className: 'subtitle' }, 'Project Management System')
            ),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Corporate Email'),
                    React.createElement('input', {
                        type: 'email',
                        className: 'form-control',
                        value: email,
                        onChange: (e) => setEmail(e.target.value),
                        placeholder: 'name@klickinc.com',
                        required: true
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Password'),
                    React.createElement('input', {
                        type: 'password',
                        className: 'form-control',
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        required: true
                    })
                ),
                error && React.createElement('div', { className: 'error-message' }, error),
                React.createElement('button', {
                    type: 'submit',
                    disabled: isLoading,
                    className: 'login-button'
                }, isLoading ? 'Signing in...' : 'Sign In')
            ),
            React.createElement('div', { className: 'login-footer' },
                React.createElement('p', null,
                    "Don't have an account? ",
                    React.createElement(Link, { to: '/register' }, 'Register')
                )
            )
        )
    );
};

export default LoginPage;
