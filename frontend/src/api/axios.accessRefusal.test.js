/**
 * The request layer and an "access removed" refusal: a 403 with the access code is announced once and still fails for
 * whoever asked, and NEVER touches the session. Every other kind of failure is left exactly as it was.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { onAccessRefusal } from './accessRefusal';
import { getAccessToken, setAccessToken, clearAccessToken } from '../services/tokenStore';

const refusal = (status, data, config = { url: '/admin/notifications/meta', headers: {} }) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data }, config });

let stop;
let heard;
const originalAdapter = api.defaults.adapter;

const failWith = (error) => {
  api.defaults.adapter = vi.fn(async () => {
    throw error;
  });
};

beforeEach(() => {
  heard = [];
  stop = onAccessRefusal((detail) => heard.push(detail));
  setAccessToken('good-token');
});

afterEach(() => {
  stop();
  api.defaults.adapter = originalAdapter;
  clearAccessToken();
});

describe('a creator is refused because she lacks the area', () => {
  const error403 = () =>
    refusal(403, { success: false, code: 'ACCESS_AREA_REQUIRED', message: "You don't have access to Notifications. Ask an admin if you need it." });

  it('is announced once, with the sentence naming the area and the address that was refused', async () => {
    failWith(error403());

    await api.get('/admin/notifications/meta').catch(() => {});

    expect(heard).toEqual([
      { message: "You don't have access to Notifications. Ask an admin if you need it.", url: '/admin/notifications/meta' },
    ]);
  });

  it('still fails for whoever asked, with the same error (so their own flow stops)', async () => {
    const error = error403();
    failWith(error);

    await expect(api.get('/admin/notifications/meta')).rejects.toBe(error);
  });

  it('does not sign anyone out: the session token is untouched and no refresh is attempted', async () => {
    failWith(error403());

    await api.get('/admin/notifications/meta').catch(() => {});

    expect(getAccessToken()).toBe('good-token');
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
  });

  it('uses the general sentence when the server sent none', async () => {
    failWith(refusal(403, { success: false, code: 'ACCESS_AREA_REQUIRED' }));

    await api.get('/x').catch(() => {});

    expect(heard[0].message).toBe("You don't have access to this area. Ask an admin if you need it.");
  });

  it('is announced for each refused request (the listener decides how often to react)', async () => {
    failWith(error403());

    await Promise.all([api.get('/a').catch(() => {}), api.get('/b').catch(() => {})]);

    expect(heard).toHaveLength(2);
  });
});

describe('everything else is left as it was', () => {
  it.each([
    ['a 403 for a role (no access code)', () => refusal(403, { success: false, message: 'User role is not authorized' })],
    ['a 403 for unfinished two-factor setup', () => refusal(403, { success: false, code: 'TWO_FACTOR_ENROLLMENT_REQUIRED' })],
    ['the access code on another status', () => refusal(400, { success: false, code: 'ACCESS_AREA_REQUIRED' })],
    ['a validation refusal', () => refusal(400, { success: false, code: 'ACCESS_AREAS_EMPTY' })],
    ['a 404', () => refusal(404, { success: false, code: 'CONTENT_CREATOR_NOT_FOUND' })],
    ['a server error', () => refusal(500, { success: false, message: 'Something went wrong.' })],
    ['an unreachable server', () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', config: { url: '/x', headers: {} } })],
  ])('%s is not announced, and still fails', async (_label, make) => {
    const error = make();
    failWith(error);

    await expect(api.get('/x')).rejects.toBe(error);

    expect(heard).toEqual([]);
    expect(getAccessToken()).toBe('good-token');
  });

  it('a 401 still tries to renew the session, and a refused retry is not announced as an access refusal', async () => {
    const calls = [];
    api.defaults.adapter = vi.fn(async (config) => {
      calls.push(config.url);
      if (config.url === '/auth/refresh') {
        throw refusal(401, { success: false }, config);
      }
      throw refusal(401, { success: false }, config);
    });

    await api.get('/admin/something').catch(() => {});

    expect(calls).toContain('/auth/refresh');
    expect(heard).toEqual([]);
  });
});
