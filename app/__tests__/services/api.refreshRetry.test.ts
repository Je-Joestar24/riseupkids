/**
 * Chunk 9 Phase C — api.ts's reactive 401 -> silent refresh -> retry-once interceptor.
 * axios is mocked at the `axios.create()` boundary (no real network/HTTP mocking library needed):
 * the fake instance captures whatever handlers api.ts registers, and the tests invoke them
 * directly with synthetic axios-error-shaped objects, exactly like axios itself would.
 *
 * Everything the mock needs is built INSIDE the jest.mock('axios', ...) factory itself (not as
 * separate top-level statements) — `import` statements are hoisted above ordinary code by the JS
 * module spec, so anything assigned outside the factory would not exist yet when api.ts's
 * `import '@/services/api'` below actually runs and calls axios.create().
 */

jest.mock('axios', () => {
  const responseHandlers: Array<{ fulfilled: (r: unknown) => unknown; rejected: (e: unknown) => unknown }> = [];
  const requestHandlers: Array<(config: unknown) => unknown> = [];

  function instance(config: unknown) {
    return (instance as unknown as { __retry: (c: unknown) => unknown }).__retry(config);
  }
  const anyInstance = instance as unknown as Record<string, unknown>;
  anyInstance.__retry = jest.fn();
  anyInstance.__responseHandlers = responseHandlers;
  anyInstance.__requestHandlers = requestHandlers;
  anyInstance.interceptors = {
    request: { use: (fn: (config: unknown) => unknown) => requestHandlers.push(fn) },
    response: {
      use: (fulfilled: (r: unknown) => unknown, rejected: (e: unknown) => unknown) =>
        responseHandlers.push({ fulfilled, rejected }),
    },
  };
  anyInstance.get = jest.fn();
  anyInstance.post = jest.fn();
  anyInstance.put = jest.fn();
  anyInstance.patch = jest.fn();
  anyInstance.delete = jest.fn();

  return {
    __esModule: true,
    default: { create: () => instance },
  };
});

jest.mock('@/config', () => ({ API_BASE_URL: 'https://api.test' }));
jest.mock('@/store/networkStore', () => ({
  useNetworkStore: { getState: () => ({ reportOffline: jest.fn() }) },
}));

const mockRunRefresh = jest.fn();
jest.mock('@/services/tokenBridge', () => ({
  getAuthToken: () => 'current-access-token',
  runRefresh: () => mockRunRefresh(),
}));

import axios from 'axios';
// Importing api.ts runs axios.create() + registers interceptors against the mock instance above.
import '@/services/api';

type MockInstance = {
  __retry: jest.Mock;
  __responseHandlers: Array<{ fulfilled: (r: unknown) => unknown; rejected: (e: unknown) => unknown }>;
};

const mockAxiosInstance = (axios as unknown as { create: () => MockInstance }).create();

function make401Error(url: string) {
  return {
    config: { url, headers: {} as Record<string, string> },
    response: { status: 401, data: { message: 'Not authorized' } },
  };
}

// The FIRST response.use() call registered is the refresh-retry interceptor (must run before
// the error-transforming one further down in api.ts).
const refreshInterceptor = () => mockAxiosInstance.__responseHandlers[0];

beforeEach(() => {
  mockAxiosInstance.__retry.mockReset();
  mockRunRefresh.mockReset();
});

describe('api.ts refresh-retry interceptor', () => {
  it('registers itself before the error-transforming interceptor', () => {
    expect(mockAxiosInstance.__responseHandlers.length).toBeGreaterThanOrEqual(2);
  });

  it('on a 401 from a protected endpoint, refreshes once and retries with the new token', async () => {
    mockRunRefresh.mockResolvedValue('brand-new-access-token');
    mockAxiosInstance.__retry.mockResolvedValue({ status: 200, data: { ok: true } });

    const error = make401Error('/children');
    const result = await refreshInterceptor().rejected(error);

    expect(mockRunRefresh).toHaveBeenCalledTimes(1);
    expect(error.config.headers.Authorization).toBe('Bearer brand-new-access-token');
    expect(mockAxiosInstance.__retry).toHaveBeenCalledWith(error.config);
    expect(result).toEqual({ status: 200, data: { ok: true } });
  });

  it('does not retry a 401 from /auth/login (wrong credentials, not an expired session)', async () => {
    const error = make401Error('/auth/login');
    await expect(refreshInterceptor().rejected(error)).rejects.toBe(error);
    expect(mockRunRefresh).not.toHaveBeenCalled();
  });

  it('does not retry a 401 from /auth/refresh itself (avoids recursion)', async () => {
    const error = make401Error('/auth/refresh');
    await expect(refreshInterceptor().rejected(error)).rejects.toBe(error);
    expect(mockRunRefresh).not.toHaveBeenCalled();
  });

  it('only ever retries once per request (a second 401 after retry is not retried again)', async () => {
    mockRunRefresh.mockResolvedValue('token-1');
    const error = make401Error('/children');
    (error.config as Record<string, unknown>)._retriedAfterRefresh = true; // already went through once

    await expect(refreshInterceptor().rejected(error)).rejects.toBe(error);
    expect(mockRunRefresh).not.toHaveBeenCalled();
  });

  it('when the refresh fails (no valid session), the original 401 propagates', async () => {
    mockRunRefresh.mockResolvedValue(null);
    const error = make401Error('/children');

    await expect(refreshInterceptor().rejected(error)).rejects.toBe(error);
    expect(mockAxiosInstance.__retry).not.toHaveBeenCalled();
  });

  it('a non-401 error is never sent through the refresh path', async () => {
    const error = { config: { url: '/children', headers: {} }, response: { status: 500 } };
    await expect(refreshInterceptor().rejected(error)).rejects.toBe(error);
    expect(mockRunRefresh).not.toHaveBeenCalled();
  });

  it('concurrent 401s share a single in-flight refresh (de-duplicated)', async () => {
    let resolveRefresh: (token: string) => void = () => {};
    mockRunRefresh.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    mockAxiosInstance.__retry.mockResolvedValue({ status: 200 });

    const errorA = make401Error('/children');
    const errorB = make401Error('/child-profiles');

    const p1 = refreshInterceptor().rejected(errorA);
    const p2 = refreshInterceptor().rejected(errorB);

    resolveRefresh('shared-token');
    await Promise.all([p1, p2]);

    expect(mockRunRefresh).toHaveBeenCalledTimes(1);
    expect(errorA.config.headers.Authorization).toBe('Bearer shared-token');
    expect(errorB.config.headers.Authorization).toBe('Bearer shared-token');
  });
});
