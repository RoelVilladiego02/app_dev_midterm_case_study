import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
delete axios.defaults.headers.common['Content-Type'];

const setupCSRF = async () => {
    try {
        await axios.get(`${API_URL}/sanctum/csrf-cookie`, {
            withCredentials: true,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
    } catch (error) {
        if (error.response?.status === 404) {
            console.warn('CSRF cookie endpoint not found. Skipping CSRF setup.');
        } else {
            console.error('CSRF cookie error:', error);
            throw new Error('Failed to setup CSRF protection');
        }
    }
};

export const login = async (email, password) => {
  try {
    await setupCSRF();
    const response = await axios.post(`${API_URL}/api/login`, {
      email,
      password
    }, {
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (response.data.token) {
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set token in axios defaults immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Auth token set:', token);
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  } catch (error) {
    console.error('Login error:', error.response || error);
    throw error.response?.data?.message || 'Authentication failed';
  }
};

export const register = async (name, email, password) => {
    try {
        await setupCSRF();
        const response = await axios.post(`${API_URL}/api/register`, {
            name,
            email,
            password,
            password_confirmation: password // Required by Laravel validation
        }, {
            withCredentials: true,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.data.token) {
            const { token, user } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return response.data;
        }
        throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
        console.error('Registration error:', error.response || error);
        throw error.response?.data?.message || 'Registration failed';
    }
};

export const logout = async () => {
    try {
        await axios.post(`${API_URL}/api/logout`, {}, {
            withCredentials: true,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
    } finally {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};
