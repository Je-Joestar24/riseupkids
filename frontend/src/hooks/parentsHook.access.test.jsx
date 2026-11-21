/**
 * The Users hook for content creator access: loading the checkboxes, saving one creator or several, and what the
 * admin is told. A refusal is thrown to the dialog that asked (it shows it inline and stays open), not shown twice.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../services/adminUsersService', async (importOriginal) => {
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

import service, { AdminUserApiError } from '../services/adminUsersService';
import parentsReducer from '../store/slices/parentsSlice';
import uiReducer from '../store/slices/uiSlice';
import useParents from './parentsHook';

const OPTIONS = { areas: [{ key: 'contents', label: 'Contents', help: 'h', legacy: true }], legacyAreas: ['contents'] };

function setup() {
  const store = configureStore({ reducer: { parents: parentsReducer, ui: uiReducer } });
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useParents(), { wrapper });
  const notice = () => store.getState().ui.notification;
  return { store, result, notice };
}

beforeEach(() => vi.clearAllMocks());

describe('loading the checkboxes', () => {
  it('exposes them once loaded, and does not ask twice', async () => {
    service.getAccessAreas.mockResolvedValue(OPTIONS);
    const { result } = setup();
    expect(result.current.accessAreaOptions.loaded).toBe(false);

    await act(async () => {
      await result.current.loadAccessAreas();
    });
    await act(async () => {
      expect(await result.current.loadAccessAreas()).toBeNull();
    });

    expect(service.getAccessAreas).toHaveBeenCalledTimes(1);
    expect(result.current.accessAreaOptions).toEqual(expect.objectContaining({ ...OPTIONS, loaded: true }));
  });

  it('throws when it cannot load, keeps the reason for the checkboxes to show, and shows NO notice', async () => {
    service.getAccessAreas.mockRejectedValue(new AdminUserApiError('Could not reach the server. Check your connection and try again.'));
    const { result, notice } = setup();

    await act(async () => {
      await expect(result.current.loadAccessAreas()).rejects.toBeTruthy();
    });

    expect(result.current.accessAreaOptions.error).toMatch(/Could not reach the server/);
    expect(result.current.accessAreaOptions.loaded).toBe(false);
    expect(notice().open).toBe(false);
  });

  it('can be asked again after a failure, and then loads', async () => {
    service.getAccessAreas.mockRejectedValueOnce(new AdminUserApiError('Could not reach the server. Check your connection and try again.'));
    service.getAccessAreas.mockResolvedValueOnce(OPTIONS);
    const { result } = setup();

    await act(async () => {
      await result.current.loadAccessAreas().catch(() => {});
    });
    await act(async () => {
      await result.current.loadAccessAreas();
    });

    expect(result.current.accessAreaOptions.loaded).toBe(true);
    expect(result.current.accessAreaOptions.error).toBeNull();
  });
});

describe('manage access for one creator', () => {
  it('shows a success notice when the list changed', async () => {
    service.setCreatorAccess.mockResolvedValue({ data: { _id: 'u1', accessAreas: ['explore'] }, changed: true });
    const { result, notice } = setup();

    let answer;
    await act(async () => {
      answer = await result.current.setCreatorAccessData('u1', ['explore']);
    });

    expect(answer.changed).toBe(true);
    expect(notice()).toEqual(expect.objectContaining({ type: 'success', message: 'Access updated successfully' }));
  });

  it('says so when nothing changed', async () => {
    service.setCreatorAccess.mockResolvedValue({ data: { _id: 'u1', accessAreas: ['explore'] }, changed: false });
    const { result, notice } = setup();

    await act(async () => {
      await result.current.setCreatorAccessData('u1', ['explore']);
    });

    expect(notice().message).toBe('Access was already set this way');
  });

  it('throws a refusal as { message, code, status } and shows NO notice (the dialog shows it inline)', async () => {
    service.setCreatorAccess.mockRejectedValue(new AdminUserApiError('Choose at least one area.', { status: 400, code: 'ACCESS_AREAS_REQUIRED' }));
    const { result, notice } = setup();

    let thrown;
    await act(async () => {
      thrown = await result.current.setCreatorAccessData('u1', []).catch((e) => e);
    });

    expect(thrown).toEqual({ message: 'Choose at least one area.', code: 'ACCESS_AREAS_REQUIRED', status: 400 });
    expect(notice().open).toBe(false);
  });

  it('is "saving" only while it runs', async () => {
    let resolve;
    service.setCreatorAccess.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = setup();

    let pending;
    act(() => {
      pending = result.current.setCreatorAccessData('u1', ['explore']);
    });
    expect(result.current.accessSaving).toBe(true);
    await act(async () => {
      resolve({ data: { _id: 'u1', accessAreas: ['explore'] }, changed: true });
      await pending;
    });

    expect(result.current.accessSaving).toBe(false);
  });
});

describe('manage access for several creators', () => {
  it('shows the server\'s own sentence as the success notice', async () => {
    service.setCreatorAccessBulk.mockResolvedValue({ message: 'Access updated for 2 people', data: [], matched: 2, changed: 2 });
    const { result, notice } = setup();

    await act(async () => {
      await result.current.setCreatorAccessBulkData(['a', 'b'], ['explore']);
    });

    expect(service.setCreatorAccessBulk).toHaveBeenCalledWith(['a', 'b'], ['explore']);
    expect(notice()).toEqual(expect.objectContaining({ type: 'success', message: 'Access updated for 2 people' }));
  });

  it('falls back to a general sentence when the answer has none', async () => {
    service.setCreatorAccessBulk.mockResolvedValue({ data: [] });
    const { result, notice } = setup();

    await act(async () => {
      await result.current.setCreatorAccessBulkData(['a'], ['explore']);
    });

    expect(notice().message).toBe('Access updated successfully');
  });

  it('throws a refusal with its code and shows no notice', async () => {
    service.setCreatorAccessBulk.mockRejectedValue(new AdminUserApiError('Choose at most 100 people at a time.', { status: 400, code: 'ACCESS_BULK_INVALID' }));
    const { result, notice } = setup();

    let thrown;
    await act(async () => {
      thrown = await result.current.setCreatorAccessBulkData(['a'], ['explore']).catch((e) => e);
    });

    expect(thrown.code).toBe('ACCESS_BULK_INVALID');
    expect(notice().open).toBe(false);
  });
});

describe('create and edit', () => {
  it('create sends the access areas and says "Content Creator created successfully!"', async () => {
    service.createUser.mockResolvedValue({ data: { _id: 'n1', role: 'content_creator', accessAreas: ['notifications'] } });
    const { result, notice } = setup();
    const form = { role: 'content_creator', name: 'Pat', email: 'p@x.co', password: 'secret1', accessAreas: ['notifications'] };

    await act(async () => {
      await result.current.createUser(form);
    });

    expect(service.createUser).toHaveBeenCalledWith(form);
    expect(notice()).toEqual(expect.objectContaining({ type: 'success', message: 'Content Creator created successfully!' }));
  });

  it('a refused create shows a readable notice (never "[object Object]") and throws the code to the dialog', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('Unknown area: billing.', { status: 400, code: 'ACCESS_AREAS_INVALID' }));
    const { result, notice } = setup();

    let thrown;
    await act(async () => {
      thrown = await result.current.createUser({ role: 'content_creator', name: 'P', email: 'p@x.co', password: 'secret1', accessAreas: ['billing'] }).catch((e) => e);
    });

    expect(notice()).toEqual(expect.objectContaining({ type: 'error', message: 'Unknown area: billing.' }));
    expect(notice().message).not.toContain('[object');
    expect(thrown).toEqual({ message: 'Unknown area: billing.', code: 'ACCESS_AREAS_INVALID', status: 400 });
  });

  it('a refused edit does the same', async () => {
    service.updateUser.mockRejectedValue(new AdminUserApiError('Choose at least one area. To stop this person using the site, archive them.', { status: 400, code: 'ACCESS_AREAS_EMPTY' }));
    const { result, notice } = setup();

    let thrown;
    await act(async () => {
      thrown = await result.current.updateUserData('u1', { accessAreas: [] }, 'content_creator').catch((e) => e);
    });

    expect(notice().message).toMatch(/archive them/);
    expect(thrown.code).toBe('ACCESS_AREAS_EMPTY');
  });

  it('an email that is already used shows the server\'s own sentence', async () => {
    service.createUser.mockRejectedValue(new AdminUserApiError('User already exists with this email', { status: 409 }));
    const { result, notice } = setup();

    await act(async () => {
      await result.current.createUser({ role: 'parent', name: 'P', email: 'p@x.co', password: 'secret1' }).catch(() => {});
    });

    expect(notice().message).toBe('User already exists with this email');
  });
});
