import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import './LoginPage.css';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirmation) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const response = await register(name, email, password);
            if (response.token && response.user) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return React.createElement('div', { className: 'login-container' },
        React.createElement('div', { className: 'login-box' },
            React.createElement('h2', null, 'Register'),
            React.createElement('form', { onSubmit: handleSubmit },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Name',
                        value: name,
                        onChange: (e) => setName(e.target.value),
                        required: true,
                        className: 'form-control'
                    })
                ),
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
                React.createElement('div', { className: 'form-group' },
                    React.createElement('input', {
                        type: 'password',
                        placeholder: 'Confirm Password',
                        value: passwordConfirmation,
                        onChange: (e) => setPasswordConfirmation(e.target.value),
                        required: true,
                        className: 'form-control'
                    })
                ),
                error && React.createElement('div', { className: 'error-message' }, error),
                React.createElement('button', {
                    type: 'submit',
                    disabled: isLoading,
                    className: 'login-button'
                }, isLoading ? 'Registering...' : 'Register'),
                React.createElement('p', { className: 'mt-3 text-center' },
                    'Already have an account? ',
                    React.createElement(Link, { to: '/login' }, 'Login here')
                )
            )
        )
    );
};

export default RegisterPage;
