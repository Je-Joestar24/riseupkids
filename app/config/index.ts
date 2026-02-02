/**
 * Rise Up Kids app configuration
 */

export * from './theme';

// API base URL - same backend as web frontend (from .env)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Rise Up Kids';
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
