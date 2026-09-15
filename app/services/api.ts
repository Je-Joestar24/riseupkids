/**
 * Rise Up Kids API client
 * Axios-based HTTP client for backend API (shared with web frontend)
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosRequestHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL } from '@/config';
import { useNetworkStore } from '@/store/networkStore';
import {
  ApiRequestError,
  isNetworkError,
  NETWORK_UNAVAILABLE_MESSAGE,
} from '@/utils/networkError';
import { getAuthToken, runRefresh } from './tokenBridge';

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15 * 60 * 1000,
  headers: {
    Accept: 'application/json',
    // Chunk 9 Phase C: tells the backend this request has no browser cookie jar, so refresh
    // tokens travel explicitly in the body instead — see backend/config/refreshCookie.js.
    'X-Client-Platform': 'mobile',
  },
  adapter: 'xhr',
});

function withFormDataSafeConfig(config?: AxiosRequestConfig, data?: unknown): AxiosRequestConfig | undefined {
  if (!(typeof FormData !== 'undefined' && data instanceof FormData)) return config;
  const headers: AxiosRequestHeaders = { ...(config?.headers as AxiosRequestHeaders) };
  delete headers['Content-Type'];
  delete headers['content-type'];
  return {
    ...config,
    headers,
  };
}

// Endpoints where a 401 means "wrong credentials" / "no session to refresh", not "this access
// token expired" — retrying them through /auth/refresh would be meaningless or would recurse.
const NO_REFRESH_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/** At most one /auth/refresh in flight at a time — several requests 401ing together (e.g. right
 * after a background/foreground cycle) all await the SAME refresh instead of each racing their
 * own, which would trip the backend's refresh-token reuse detection. */
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Chunk 9 Phase C: this MUST be registered before the error-transforming interceptor below — a
// resolved retry here is passed through as a normal fulfilled response; anything that still fails
// (including a failed refresh) falls through unchanged to that interceptor's rejection handling.
instance.interceptors.response.use(
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
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return instance(config);
      }
      // No valid session to renew — fall through to the original 401 below. The app's own
      // isAuthenticated state (already cleared by refreshSession on failure) drives the redirect
      // to login; this interceptor never navigates directly.
    }

    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isNetworkError(error)) {
      useNetworkStore.getState().reportOffline();
      return Promise.reject(
        new ApiRequestError(NETWORK_UNAVAILABLE_MESSAGE, { isNetworkError: true })
      );
    }
    const status = error.response?.status as number | undefined;
    const message =
      error.response?.data?.message ?? error.message ?? 'Request failed';
    return Promise.reject(
      new ApiRequestError(String(message), { isNetworkError: false, status })
    );
  }
);

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.post<T>(url, data, withFormDataSafeConfig(config, data)).then((r) => r.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.put<T>(url, data, withFormDataSafeConfig(config, data)).then((r) => r.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    instance.patch<T>(url, data, withFormDataSafeConfig(config, data)).then((r) => r.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    instance.delete<T>(url, config).then((r) => r.data),

  /** Health check - verify API is reachable */
  health: () =>
    instance.get<{ success: boolean; status: string; timestamp: string; uptime: number }>('/health').then((r) => r.data),
};
