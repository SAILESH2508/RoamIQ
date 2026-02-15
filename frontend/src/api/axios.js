
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

// Add a response interceptor to handle common errors
instance.interceptors.response.use(
    (response) => {
        // If the response is HTML but we expected JSON, it's likely hitting the frontend SPA fallback
        // This happens when the API URL is wrong or the proxy is not working
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html') && typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE')) {
            return Promise.reject({
                message: 'Invalid API response (HTML received instead of JSON)',
                response: {
                    data: { error: 'Backend server not reachable. Please check your API configuration.' }
                }
            });
        }
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default instance;
