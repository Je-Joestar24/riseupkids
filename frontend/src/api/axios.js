import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import { TIMEOUT } from '../constants/timeout';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/tokenStore';

// Create axios instance. In dev uses relative /api so Vite proxy forwards to backend (no connection refused)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Chunk 9: the refresh token lives in an httpOnly cookie — this must be set for the browser to
  // send/receive it, including cross-origin (S3/CloudFront frontend + separate API origin).
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available (in-memory only — see services/tokenStore.js)
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Endpoints where a 401 means "wrong credentials" / "no session to refresh", not "this access
// token expired" — retrying them through /auth/refresh would be meaningless or would recurse.
const NO_REFRESH_RETRY_PATHS = ['/auth/login', '/auth/verify-login-otp', '/auth/register', '/auth/refresh'];

/** At most one /auth/refresh in flight at a time — concurrent 401s from several requests firing
 * together (a normal page load) all await the SAME refresh instead of each starting their own. */
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const newToken = res.data?.data?.token;
        if (!newToken) throw new Error('No token in refresh response');
        setAccessToken(newToken);
        return newToken;
      })
      .catch((err) => {
        clearAccessToken();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const shouldTryRefresh =
      response?.status === 401 &&
      config &&
      !config._retriedAfterRefresh &&
      !NO_REFRESH_RETRY_PATHS.some((path) => config.url?.includes(path));

    if (shouldTryRefresh) {
      config._retriedAfterRefresh = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        // No valid session to renew — fall through to the original 401. The app's route guards
        // react to isAuthenticated becoming false and redirect to login; this interceptor never
        // navigates directly (kept consistent with the previous behavior).
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

