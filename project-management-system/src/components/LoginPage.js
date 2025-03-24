import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await login(email, password);
            if (response.token && response.user) {
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

    return React.createElement('div', { className: 'login-container' },
        React.createElement('div', { className: 'login-box' },
            React.createElement('h2', null, 'Login'),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'email',
                        placeholder: 'Email',
                        value: email,
                        onChange: (e) => setEmail(e.target.value),
                        required: true,
                        className: 'form-control'
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Password',
                        value: password,
                        onChange: (e) => setPassword(e.target.value),
                        required: true,
                        className: 'form-control'
                    })
                ),
                error && React.createElement('div', { className: 'error-message' }, error),
                React.createElement('button', {
                    type: 'submit',
                    disabled: isLoading,
                    className: 'login-button'
                }, isLoading ? 'Logging in...' : 'Login'),
                React.createElement('p', { className: 'mt-3 text-center' },
                    'Don\'t have an account? ',
                    React.createElement(Link, { to: '/register' }, 'Register here')
                )
            )
        )
    );
};

export default LoginPage;
