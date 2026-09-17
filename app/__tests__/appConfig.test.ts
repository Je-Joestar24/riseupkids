/**
 * Chunk 11 — Mobile App Security: transport hardening.
 * app.config.js derives android.usesCleartextTraffic from the actual configured API URL instead
 * of a blanket `true`, since that flag was previously relaxing Android's network policy in
 * production release builds too, not just local dev against a LAN IP backend.
 */
const ORIGINAL_API_URL = process.env.EXPO_PUBLIC_API_URL;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const configFn = require('../app.config.js');

afterEach(() => {
  if (ORIGINAL_API_URL === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = ORIGINAL_API_URL;
  }
});

describe('app.config.js android.usesCleartextTraffic', () => {
  it('disables cleartext traffic when the configured API URL is https', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.riseup.kids/api';

    const result = configFn({ config: { android: { package: 'com.riseupkids.app' } } });

    expect(result.android.usesCleartextTraffic).toBe(false);
  });

  it('falls back to the real https API (cleartext disabled) when no API URL is set at all', () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    const result = configFn({ config: { android: {} } });

    expect(result.android.usesCleartextTraffic).toBe(false);
  });

  it('enables cleartext traffic only when the configured API URL is plain http (local dev)', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.50:5000/api';

    const result = configFn({ config: { android: {} } });

    expect(result.android.usesCleartextTraffic).toBe(true);
  });

  it('preserves every other field already on the incoming android config', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.riseup.kids/api';

    const result = configFn({
      config: {
        name: 'Rise Up Kids',
        android: { package: 'com.riseupkids.app', permissions: ['android.permission.CAMERA'] },
      },
    });

    expect(result.name).toBe('Rise Up Kids');
    expect(result.android.package).toBe('com.riseupkids.app');
    expect(result.android.permissions).toEqual(['android.permission.CAMERA']);
  });
});
