// API Configuration
// In development: use relative /api so Vite proxy forwards to backend (no direct connection to :5000)
// .env is never changed; VITE_API_URL still used in production
const isDev = import.meta.env.DEV;
const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE_URL = isDev ? '/api' : envApiUrl;
/** Base URL for uploads/images (no /api). In dev use '' so /uploads/... goes through proxy. */
export const BACKEND_BASE_URL = isDev ? '' : (envApiUrl.replace(/\/api\/?$/, '') || 'http://localhost:5000');

// App Configuration
export const APP_NAME = 'Rise Up Kids';
export const APP_VERSION = '1.0.0';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  PARENT: 'parent',
  CHILD: 'child',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
};

