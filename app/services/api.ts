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
import { getAuthToken } from './tokenBridge';

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
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

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ?? error.message ?? 'Request failed';
    return Promise.reject(new Error(message));
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
