import {
  ApiRequestError,
  isNetworkError,
  NETWORK_UNAVAILABLE_MESSAGE,
  pingApiHealth,
} from '@/utils/networkError';

describe('isNetworkError', () => {
  it('detects axios-style offline failures', () => {
    expect(
      isNetworkError({ code: 'ERR_NETWORK', message: 'Network Error' })
    ).toBe(true);
    expect(isNetworkError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' })).toBe(
      true
    );
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(NETWORK_UNAVAILABLE_MESSAGE)).toBe(true);
  });

  it('does not treat API 4xx/5xx as network failures', () => {
    expect(
      isNetworkError({
        message: 'Unauthorized',
        response: { status: 401 },
      })
    ).toBe(false);
    expect(isNetworkError(new Error('Course not found'))).toBe(false);
  });

  it('respects ApiRequestError.isNetworkError', () => {
    expect(isNetworkError(new ApiRequestError('nope', { isNetworkError: true }))).toBe(true);
    expect(
      isNetworkError(new ApiRequestError('Course not found', { isNetworkError: false, status: 404 }))
    ).toBe(false);
  });
});

describe('pingApiHealth', () => {
  it('returns true when health responds ok', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
    await expect(pingApiHealth(fetchImpl, 'https://api.example.com/api', 50)).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.com/api/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('returns false when fetch throws', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('Network request failed');
    }) as unknown as typeof fetch;
    await expect(pingApiHealth(fetchImpl, 'https://api.example.com/api', 50)).resolves.toBe(false);
  });
});
