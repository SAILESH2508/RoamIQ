import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../api/axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // The axios instance handling of token is now done in src/api/axios.js via interceptors
  // so we just need to keep our local state in sync.
  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [user]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          // Token is automatically added by the interceptor in src/api/axios.js
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          if (error.response && error.response.status === 401) {
            // Token expired or invalid, clear it
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          }
          // For network errors etc, we might want to keep the token, 
          // but for now, any auth failure clears session for safety
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        setLoading(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { access_token, user: userData } = response.data;

      if (!access_token) {
        throw new Error('Invalid response from server: No access token received');
      }

      localStorage.setItem('token', access_token);
      setUser(userData);

      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { access_token, user: newUser } = response.data;

      if (!access_token) {
        throw new Error('Invalid response from server: No access token received');
      }

      localStorage.setItem('token', access_token);
      setUser(newUser);

      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.error || error.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};