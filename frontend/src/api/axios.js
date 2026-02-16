import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Create axios instance. In dev uses relative /api so Vite proxy forwards to backend (no connection refused)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available (from sessionStorage)
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and user data
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Redirect to login will be handled by the app
    }
    return Promise.reject(error);
  }
);

export default api;

