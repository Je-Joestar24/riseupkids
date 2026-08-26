export const NETWORK_UNAVAILABLE_MESSAGE =
  'This app needs the internet to load. Check your connection and try again.';

export const NETWORK_UNAVAILABLE_TITLE = 'Oops! No internet';

export class ApiRequestError extends Error {
  readonly isNetworkError: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: { isNetworkError?: boolean; status?: number } = {}
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.isNetworkError = Boolean(options.isNetworkError);
    this.status = options.status;
  }
}

function isAxiosNetworkCode(code: string | undefined): boolean {
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND'
  );
}

export function isNetworkErrorMessage(message: string): boolean {
  const msg = message.trim().toLowerCase();
  if (!msg) return false;
  if (msg === NETWORK_UNAVAILABLE_MESSAGE.toLowerCase()) return true;
  return (
    msg === 'network error' ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('internet') ||
    msg.includes('offline') ||
    msg.includes('timeout of') ||
    msg.includes('timed out') ||
    msg.includes('econnaborted') ||
    msg.includes('err_network')
  );
}

/**
 * True when a request never reached the API (offline, DNS, timeout).
 * Server 4xx/5xx responses are not network errors.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiRequestError) return error.isNetworkError;
  if (typeof error === 'string') return isNetworkErrorMessage(error);
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    isNetworkError?: boolean;
    code?: string;
    message?: string;
    response?: unknown;
  };

  if (candidate.isNetworkError === true) return true;
  if (candidate.response) return false;
  if (isAxiosNetworkCode(candidate.code)) return true;
  return isNetworkErrorMessage(String(candidate.message ?? ''));
}

export function toFriendlyLoadError(error: unknown): string {
  if (isNetworkError(error)) return NETWORK_UNAVAILABLE_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Something went wrong. Please try again.';
}

export const NETWORK_HEALTH_PING_TIMEOUT_MS = 8000;

/** True when the device reports offline (web / some RN runtimes). */
export function isNavigatorOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Lightweight reachability check (does not use the Axios client, so it cannot
 * recurse through API interceptors).
 */
export async function pingApiHealth(
  fetchImpl: typeof fetch = fetch,
  apiBaseUrl: string,
  timeoutMs = NETWORK_HEALTH_PING_TIMEOUT_MS
): Promise<boolean> {
  if (isNavigatorOffline()) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/health`;
    const res = await fetchImpl(url, {
      method: 'GET',
      signal: controller.signal,
    });
    return Boolean(res?.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
