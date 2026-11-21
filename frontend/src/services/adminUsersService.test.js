/**
 * The admin Users service: the addresses it calls, what it sends (a content creator is sent with her access areas,
 * nobody else is), and how every failure becomes one error the screen can show, with the server's code.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';
import adminUsersService, { AdminUserApiError, toAdminUserApiError } from './adminUsersService';

const backendError = (status, data) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

beforeEach(() => vi.clearAllMocks());

describe('createUser', () => {
  it('sends a content creator with her access areas', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    await adminUsersService.createUser({
      role: 'content_creator', name: 'Pat', email: 'p@x.co', password: 'secret1', accessAreas: ['notifications'],
    });

    expect(api.post).toHaveBeenCalledWith('/content-creators', {
      name: 'Pat', email: 'p@x.co', password: 'secret1', accessAreas: ['notifications'],
    });
  });

  it('never sends access areas for a parent or a teacher, even if some are passed', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    await adminUsersService.createUser({ role: 'parent', name: 'A', email: 'a@x.co', password: 'secret1', accessAreas: ['notifications'] });
    await adminUsersService.createUser({ role: 'teacher', name: 'B', email: 'b@x.co', password: 'secret1', accessAreas: ['notifications'] });

    expect(api.post).toHaveBeenNthCalledWith(1, '/parents', { name: 'A', email: 'a@x.co', password: 'secret1' });
    expect(api.post).toHaveBeenNthCalledWith(2, '/teachers', { name: 'B', email: 'b@x.co', password: 'secret1' });
  });

  it('defaults to a parent, as before', async () => {
    api.post.mockResolvedValue({ data: {} });

    await adminUsersService.createUser({ name: 'A', email: 'a@x.co', password: 'secret1' });

    expect(api.post).toHaveBeenCalledWith('/parents', { name: 'A', email: 'a@x.co', password: 'secret1' });
  });

  it('sends a creator with no list as it is (the server then refuses it with its own code)', async () => {
    api.post.mockResolvedValue({ data: {} });

    await adminUsersService.createUser({ role: 'content_creator', name: 'A', email: 'a@x.co', password: 'secret1' });

    expect(api.post.mock.calls[0][1]).toHaveProperty('accessAreas', undefined);
  });
});

describe('updateUser', () => {
  it('passes a content creator\'s access areas along with the rest', async () => {
    api.put.mockResolvedValue({ data: { success: true } });

    await adminUsersService.updateUser('u1', 'content_creator', { name: 'New', accessAreas: ['explore'] });

    expect(api.put).toHaveBeenCalledWith('/content-creators/u1', { name: 'New', accessAreas: ['explore'] });
  });

  it('strips access areas for anyone who is not a content creator', async () => {
    api.put.mockResolvedValue({ data: { success: true } });

    await adminUsersService.updateUser('u1', 'parent', { name: 'New', accessAreas: ['explore'] });
    await adminUsersService.updateUser('u2', 'teacher', { accessAreas: ['explore'] });

    expect(api.put).toHaveBeenNthCalledWith(1, '/parents/u1', { name: 'New' });
    expect(api.put).toHaveBeenNthCalledWith(2, '/teachers/u2', {});
  });

  it('leaves the other fields untouched', async () => {
    api.put.mockResolvedValue({ data: {} });
    const data = { name: 'N', email: 'n@x.co', isActive: false, password: 'secret1' };

    await adminUsersService.updateUser('u1', 'parent', data);

    expect(api.put).toHaveBeenCalledWith('/parents/u1', data);
  });
});

describe('the access calls', () => {
  it('getAccessAreas asks for the checkboxes and returns them', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: { areas: [{ key: 'contents' }], legacyAreas: ['contents'] } } });

    const result = await adminUsersService.getAccessAreas();

    expect(api.get).toHaveBeenCalledWith('/content-creators/access-areas');
    expect(result).toEqual({ areas: [{ key: 'contents' }], legacyAreas: ['contents'] });
  });

  it('setCreatorAccess puts the list for one creator and returns the answer', async () => {
    const answer = { success: true, data: { _id: 'u1', accessAreas: ['explore'] }, previousAccessAreas: ['contents'], changed: true };
    api.put.mockResolvedValue({ data: answer });

    const result = await adminUsersService.setCreatorAccess('u1', ['explore']);

    expect(api.put).toHaveBeenCalledWith('/content-creators/u1/access', { accessAreas: ['explore'] });
    expect(result).toEqual(answer);
  });

  it('setCreatorAccessBulk puts the ids and the list', async () => {
    const answer = { success: true, data: [], matched: 2, changed: 1 };
    api.put.mockResolvedValue({ data: answer });

    const result = await adminUsersService.setCreatorAccessBulk(['a', 'b'], ['explore']);

    expect(api.put).toHaveBeenCalledWith('/content-creators/access/bulk', { ids: ['a', 'b'], accessAreas: ['explore'] });
    expect(result).toEqual(answer);
  });
});

describe('the other calls are as they were', () => {
  it('getUsers keeps the role out of the query', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });

    await adminUsersService.getUsers({ role: 'content_creator', search: 'pat', page: 2 });

    expect(api.get).toHaveBeenCalledWith('/content-creators', { params: { search: 'pat', page: 2 } });
  });

  it('getUserById, archiveUser and restoreUser use the role\'s address', async () => {
    api.get.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });

    await adminUsersService.getUserById('u1', 'teacher');
    await adminUsersService.archiveUser('u1', 'parent');
    await adminUsersService.restoreUser('u1', 'content_creator');

    expect(api.get).toHaveBeenCalledWith('/teachers/u1');
    expect(api.delete).toHaveBeenCalledWith('/parents/u1');
    expect(api.put).toHaveBeenCalledWith('/content-creators/u1/restore');
  });

  it('refuses a role it does not know', async () => {
    await expect(adminUsersService.getUsers({ role: 'admin' })).rejects.toBeInstanceOf(AdminUserApiError);
  });
});

describe('every failure becomes one AdminUserApiError', () => {
  const calls = [
    ['getUsers', () => adminUsersService.getUsers({ role: 'parent' }), 'get', 'Failed to fetch users'],
    ['getUserById', () => adminUsersService.getUserById('u1', 'parent'), 'get', 'Failed to fetch user'],
    ['createUser', () => adminUsersService.createUser({ role: 'parent', name: 'A', email: 'a@x.co', password: 'secret1' }), 'post', 'Failed to create user'],
    ['updateUser', () => adminUsersService.updateUser('u1', 'parent', {}), 'put', 'Failed to update user'],
    ['archiveUser', () => adminUsersService.archiveUser('u1', 'parent'), 'delete', 'Failed to archive user'],
    ['restoreUser', () => adminUsersService.restoreUser('u1', 'parent'), 'put', 'Failed to restore user'],
    ['getAccessAreas', () => adminUsersService.getAccessAreas(), 'get', 'Failed to load the access areas'],
    ['setCreatorAccess', () => adminUsersService.setCreatorAccess('u1', ['explore']), 'put', 'Failed to update access'],
    ['setCreatorAccessBulk', () => adminUsersService.setCreatorAccessBulk(['u1'], ['explore']), 'put', 'Failed to update access'],
  ];

  it.each(calls)('%s: the server\'s own sentence is kept (this used to be lost)', async (_name, run, method) => {
    api[method].mockRejectedValue(backendError(409, { success: false, message: 'User already exists with this email' }));

    const error = await run().catch((e) => e);

    expect(error).toBeInstanceOf(AdminUserApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('User already exists with this email');
    expect(error.status).toBe(409);
  });

  it.each(calls)('%s: with no message from the server, the general sentence is used', async (_name, run, method, fallback) => {
    api[method].mockRejectedValue(backendError(500, {}));

    expect((await run().catch((e) => e)).message).toBe(fallback);
  });

  it.each(calls)('%s: an unreachable server says so, with no status', async (_name, run, method) => {
    api[method].mockRejectedValue(networkError());

    const error = await run().catch((e) => e);

    expect(error.message).toMatch(/Could not reach the server/);
    expect(error.status).toBeNull();
    expect(error.code).toBe('NETWORK_ERROR');
  });

  it('carries the server\'s code so the screen can decide by it', async () => {
    api.put.mockRejectedValue(backendError(400, { success: false, code: 'ACCESS_AREAS_EMPTY', message: 'Choose at least one area. To stop this person using the site, archive them.' }));

    const error = await adminUsersService.setCreatorAccess('u1', []).catch((e) => e);

    expect(error.code).toBe('ACCESS_AREAS_EMPTY');
    expect(error.status).toBe(400);
  });

  it('turns a code into a plain sentence even when the server wording changes', async () => {
    api.put.mockRejectedValue(backendError(404, { success: false, code: 'CONTENT_CREATOR_NOT_FOUND', message: 'whatever the server says' }));

    const error = await adminUsersService.setCreatorAccess('u1', ['explore']).catch((e) => e);

    expect(error.message).toMatch(/could not be found/);
  });

  it('keeps the server\'s sentence for an unknown area, because it names it', async () => {
    api.post.mockRejectedValue(backendError(400, { success: false, code: 'ACCESS_AREAS_INVALID', message: 'Unknown area: billing.' }));

    const error = await adminUsersService.createUser({ role: 'content_creator', name: 'A', email: 'a@x.co', password: 'secret1', accessAreas: ['billing'] }).catch((e) => e);

    expect(error.message).toBe('Unknown area: billing.');
    expect(error.code).toBe('ACCESS_AREAS_INVALID');
  });

  it('keeps the request id for support', async () => {
    api.get.mockRejectedValue(backendError(500, { success: false, message: 'Something went wrong. Please try again.', requestId: 'req-1' }));

    expect((await adminUsersService.getUsers({}).catch((e) => e)).requestId).toBe('req-1');
  });
});

describe('toAdminUserApiError', () => {
  it('returns one of its own errors unchanged', () => {
    const own = new AdminUserApiError('x', { status: 400, code: 'C' });

    expect(toAdminUserApiError(own, 'f')).toBe(own);
  });

  it('copes with an answer that is not an object', () => {
    const error = toAdminUserApiError({ response: { status: 502, data: '<html>bad gateway</html>' } }, 'fallback');

    expect(error.message).toBe('fallback');
    expect(error.status).toBe(502);
    expect(error.code).toBeNull();
  });

  it('copes with nothing at all', () => {
    expect(toAdminUserApiError(undefined, 'f').code).toBe('NETWORK_ERROR');
    expect(toAdminUserApiError(null, 'f').status).toBeNull();
  });

  it('ignores a code that is not text', () => {
    expect(toAdminUserApiError({ response: { status: 400, data: { code: 5, message: 'm' } } }, 'f').code).toBeNull();
  });
});
