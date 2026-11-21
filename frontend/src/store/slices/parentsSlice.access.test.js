/**
 * The Users state for content creator access: loading the checkboxes once, saving one creator's list, saving several
 * at once, and what a refusal looks like (a sentence, a code and a status the dialog can show).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../../services/adminUsersService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      archiveUser: vi.fn(),
      restoreUser: vi.fn(),
      getAccessAreas: vi.fn(),
      setCreatorAccess: vi.fn(),
      setCreatorAccessBulk: vi.fn(),
    },
  };
});

import service, { AdminUserApiError } from '../../services/adminUsersService';
import reducer, {
  createParent,
  fetchAccessAreas,
  fetchAllParents,
  fetchParentById,
  resetParentsState,
  setCreatorAccess,
  setCreatorAccessBulk,
  updateParent,
} from './parentsSlice';

const makeStore = () => configureStore({ reducer: { parents: reducer } });
const creatorRow = (id, accessAreas, extra = {}) => ({ _id: id, name: `N${id}`, role: 'content_creator', accessAreas, ...extra });

const OPTIONS = {
  areas: [
    { key: 'dashboard', label: 'Dashboard', help: 'h', legacy: true },
    { key: 'notifications', label: 'Notifications', help: 'h', legacy: false },
  ],
  legacyAreas: ['dashboard'],
};

async function storeWithRows(rows) {
  const store = makeStore();
  service.getUsers.mockResolvedValue({ data: rows, pagination: { currentPage: 1, totalPages: 1, totalItems: rows.length } });
  await store.dispatch(fetchAllParents({ role: 'content_creator' }));
  return store;
}

beforeEach(() => vi.clearAllMocks());

describe('the access checkboxes', () => {
  it('start empty and not loaded', () => {
    expect(makeStore().getState().parents.accessAreas).toEqual({ areas: [], legacyAreas: [], loaded: false, loading: false, error: null });
  });

  it('are loaded once and kept', async () => {
    service.getAccessAreas.mockResolvedValue(OPTIONS);
    const store = makeStore();

    await store.dispatch(fetchAccessAreas());

    expect(store.getState().parents.accessAreas).toEqual({ ...OPTIONS, loaded: true, loading: false, error: null });
  });

  it('are not asked for again once loaded, or while loading', async () => {
    service.getAccessAreas.mockResolvedValue(OPTIONS);
    const store = makeStore();

    await Promise.all([store.dispatch(fetchAccessAreas()), store.dispatch(fetchAccessAreas())]);
    await store.dispatch(fetchAccessAreas());

    expect(service.getAccessAreas).toHaveBeenCalledTimes(1);
  });

  it('say they are loading while the answer is on its way', async () => {
    let resolve;
    service.getAccessAreas.mockReturnValue(new Promise((r) => { resolve = r; }));
    const store = makeStore();

    const pending = store.dispatch(fetchAccessAreas());
    expect(store.getState().parents.accessAreas.loading).toBe(true);
    resolve(OPTIONS);
    await pending;

    expect(store.getState().parents.accessAreas.loading).toBe(false);
  });

  it('keep a failure as a sentence, and can be asked for again', async () => {
    service.getAccessAreas.mockRejectedValueOnce(new AdminUserApiError('Could not reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' }));
    const store = makeStore();

    await store.dispatch(fetchAccessAreas());
    expect(store.getState().parents.accessAreas.error).toMatch(/Could not reach the server/);
    expect(store.getState().parents.accessAreas.loaded).toBe(false);

    service.getAccessAreas.mockResolvedValue(OPTIONS);
    await store.dispatch(fetchAccessAreas());

    expect(store.getState().parents.accessAreas.loaded).toBe(true);
    expect(store.getState().parents.accessAreas.error).toBeNull();
  });

  it('tolerate an answer with missing parts', async () => {
    service.getAccessAreas.mockResolvedValue({});
    const store = makeStore();

    await store.dispatch(fetchAccessAreas());

    expect(store.getState().parents.accessAreas).toEqual({ areas: [], legacyAreas: [], loaded: true, loading: false, error: null });
  });

  it('are cleared by a full reset', async () => {
    service.getAccessAreas.mockResolvedValue(OPTIONS);
    const store = makeStore();
    await store.dispatch(fetchAccessAreas());

    store.dispatch(resetParentsState());

    expect(store.getState().parents.accessAreas.loaded).toBe(false);
  });
});

describe('manage access for one creator', () => {
  it('puts the new list into her row and into the open record', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents']), creatorRow('2', ['contents'])]);
    service.setCreatorAccess.mockResolvedValue({ data: creatorRow('1', ['explore']), previousAccessAreas: ['contents'], changed: true });

    const result = await store.dispatch(setCreatorAccess({ userId: '1', accessAreas: ['explore'] })).unwrap();

    expect(service.setCreatorAccess).toHaveBeenCalledWith('1', ['explore']);
    expect(result.changed).toBe(true);
    const { parents } = store.getState().parents;
    expect(parents.find((row) => row._id === '1').accessAreas).toEqual(['explore']);
    expect(parents.find((row) => row._id === '2').accessAreas).toEqual(['contents']);
  });

  it('updates the open record when it is the same person', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.getUserById.mockResolvedValue({ data: creatorRow('1', ['contents']) });
    await store.dispatch(fetchParentById({ userId: '1', role: 'content_creator' }));
    service.setCreatorAccess.mockResolvedValue({ data: creatorRow('1', ['notifications']), changed: true });

    await store.dispatch(setCreatorAccess({ userId: '1', accessAreas: ['notifications'] }));

    expect(store.getState().parents.currentParent.accessAreas).toEqual(['notifications']);
  });

  it('says it is saving while it runs, without touching the table\'s own loading flag', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    let resolve;
    service.setCreatorAccess.mockReturnValue(new Promise((r) => { resolve = r; }));

    const pending = store.dispatch(setCreatorAccess({ userId: '1', accessAreas: ['explore'] }));
    expect(store.getState().parents.accessSaving).toBe(true);
    expect(store.getState().parents.loading).toBe(false);
    resolve({ data: creatorRow('1', ['explore']), changed: true });
    await pending;

    expect(store.getState().parents.accessSaving).toBe(false);
  });

  it('rejects a refusal with its sentence, code and status, and leaves her row alone', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccess.mockRejectedValue(new AdminUserApiError('Choose at least one area.', { status: 400, code: 'ACCESS_AREAS_REQUIRED' }));

    const action = await store.dispatch(setCreatorAccess({ userId: '1', accessAreas: [] }));

    expect(action.payload).toEqual({ message: 'Choose at least one area.', code: 'ACCESS_AREAS_REQUIRED', status: 400 });
    expect(store.getState().parents.parents[0].accessAreas).toEqual(['contents']);
    expect(store.getState().parents.accessSaving).toBe(false);
  });

  it('copes with an error that has no message or code', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccess.mockRejectedValue(new Error(''));

    const action = await store.dispatch(setCreatorAccess({ userId: '1', accessAreas: ['explore'] }));

    expect(action.payload).toEqual({ message: 'Failed to update access', code: null, status: null });
  });

  it('does nothing to the rows when the answer has no creator in it', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccess.mockResolvedValue({ changed: false });

    await store.dispatch(setCreatorAccess({ userId: '1', accessAreas: ['contents'] }));

    expect(store.getState().parents.parents[0].accessAreas).toEqual(['contents']);
  });
});

describe('manage access for several creators at once', () => {
  it('changes only the access list in the rows named in the answer', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'], { name: 'Keep Me' }), creatorRow('2', ['contents']), creatorRow('3', ['notifications'])]);
    service.setCreatorAccessBulk.mockResolvedValue({
      data: [
        { id: '1', name: 'Keep Me', accessAreas: ['explore'], changed: true },
        { id: '2', name: 'N2', accessAreas: ['explore'], changed: true },
      ],
      matched: 2,
      changed: 2,
    });

    await store.dispatch(setCreatorAccessBulk({ ids: ['1', '2'], accessAreas: ['explore'] })).unwrap();

    expect(service.setCreatorAccessBulk).toHaveBeenCalledWith(['1', '2'], ['explore']);
    const rows = store.getState().parents.parents;
    expect(rows.map((row) => row.accessAreas)).toEqual([['explore'], ['explore'], ['notifications']]);
    expect(rows[0].name).toBe('Keep Me');
  });

  it('ignores a person named in the answer who is not on this page', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccessBulk.mockResolvedValue({ data: [{ id: '99', accessAreas: ['explore'] }], matched: 1, changed: 1 });

    await store.dispatch(setCreatorAccessBulk({ ids: ['99'], accessAreas: ['explore'] }));

    expect(store.getState().parents.parents).toHaveLength(1);
    expect(store.getState().parents.parents[0].accessAreas).toEqual(['contents']);
  });

  it('rejects a refusal with its code, and changes no row', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccessBulk.mockRejectedValue(new AdminUserApiError('Choose at most 100 people at a time.', { status: 400, code: 'ACCESS_BULK_INVALID' }));

    const action = await store.dispatch(setCreatorAccessBulk({ ids: ['1'], accessAreas: ['explore'] }));

    expect(action.payload).toEqual({ message: 'Choose at most 100 people at a time.', code: 'ACCESS_BULK_INVALID', status: 400 });
    expect(store.getState().parents.parents[0].accessAreas).toEqual(['contents']);
    expect(store.getState().parents.accessSaving).toBe(false);
  });

  it('tolerates an answer with no list of results', async () => {
    const store = await storeWithRows([creatorRow('1', ['contents'])]);
    service.setCreatorAccessBulk.mockResolvedValue({});

    await expect(store.dispatch(setCreatorAccessBulk({ ids: ['1'], accessAreas: ['explore'] })).unwrap()).resolves.toEqual({});
  });
});

describe('create and edit: access refusals reach the dialog, and the old behaviour stays', () => {
  it('create passes the whole form on, including the access areas', async () => {
    service.createUser.mockResolvedValue({ data: creatorRow('9', ['notifications']) });
    const store = makeStore();
    const form = { role: 'content_creator', name: 'Pat', email: 'p@x.co', password: 'secret1', accessAreas: ['notifications'] };

    await store.dispatch(createParent(form)).unwrap();

    expect(service.createUser).toHaveBeenCalledWith(form);
    expect(store.getState().parents.parents[0].accessAreas).toEqual(['notifications']);
  });

  it('a refused create rejects with { message, code, status }, and `error` stays a plain sentence', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('Choose at least one area.', { status: 400, code: 'ACCESS_AREAS_REQUIRED' }));
    const store = makeStore();

    const action = await store.dispatch(createParent({ role: 'content_creator', name: 'P', email: 'p@x.co', password: 'secret1' }));

    expect(action.payload).toEqual({ message: 'Choose at least one area.', code: 'ACCESS_AREAS_REQUIRED', status: 400 });
    expect(store.getState().parents.error).toBe('Choose at least one area.');
    expect(store.getState().parents.loading).toBe(false);
  });

  it('a refused edit rejects the same way', async () => {
    service.updateUser.mockRejectedValue(new AdminUserApiError('Unknown area: billing.', { status: 400, code: 'ACCESS_AREAS_INVALID' }));
    const store = makeStore();

    const action = await store.dispatch(updateParent({ parentId: '1', role: 'content_creator', updateData: { accessAreas: ['billing'] } }));

    expect(action.payload).toEqual({ message: 'Unknown area: billing.', code: 'ACCESS_AREAS_INVALID', status: 400 });
    expect(store.getState().parents.error).toBe('Unknown area: billing.');
  });

  it('an email that is already used now shows the server\'s own sentence (it used to show a generic one)', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('User already exists with this email', { status: 409 }));
    const store = makeStore();

    const action = await store.dispatch(createParent({ role: 'parent', name: 'P', email: 'p@x.co', password: 'secret1' }));

    expect(action.payload.message).toBe('User already exists with this email');
    expect(action.payload.status).toBe(409);
  });

  it('listing and archiving still reject with a plain sentence', async () => {
    service.getUsers.mockRejectedValue(new AdminUserApiError('Failed to fetch users'));
    const store = makeStore();

    const action = await store.dispatch(fetchAllParents({}));

    expect(action.payload).toBe('Failed to fetch users');
    expect(store.getState().parents.error).toBe('Failed to fetch users');
  });
});
