// API Configuration
// When VITE_API_URL is set (e.g. CloudFront), use it in both dev and prod so requests go to the API directly.
// When unset in dev, use relative /api so Vite proxy forwards to backend.
const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const useRemoteApi = envApiUrl.startsWith('http');
export const API_BASE_URL = useRemoteApi
  ? envApiUrl.replace(/\/+$/, '')
  : (import.meta.env.DEV ? '/api' : envApiUrl || 'http://localhost:5000/api');
/** Base URL for uploads/images (no /api). When using remote API this is the origin; else proxy in dev. */
export const BACKEND_BASE_URL = useRemoteApi
  ? envApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  : (import.meta.env.DEV ? '' : (envApiUrl.replace(/\/api\/?$/, '') || 'http://localhost:5000'));

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

