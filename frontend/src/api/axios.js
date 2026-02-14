
import axios from 'axios';

// Get the API URL from environment variables
// In development, this is empty (uses proxy)
// In production, this should be your Render backend URL (e.g., https://roamiq-backend.onrender.com)
const API_URL = process.env.REACT_APP_API_URL || '';

const instance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to every request
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
