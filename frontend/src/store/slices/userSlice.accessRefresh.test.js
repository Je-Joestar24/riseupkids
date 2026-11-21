/**
 * Refreshing what a signed-in content creator can use, quietly: no loading screen, never a sign-out, only the same
 * person's own record is replaced.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../../services/authService', () => ({
  default: { getCurrentUser: vi.fn() },
}));

import authService from '../../services/authService';
import reducer, { refreshUserAccess, getCurrentUser, setUser } from './userSlice';

const signedIn = (user) => {
  const store = configureStore({ reducer: { user: reducer } });
  store.dispatch(setUser(user));
  return store;
};

const creator = (accessAreas) => ({ _id: 'c1', name: 'Pat', role: 'content_creator', accessAreas });

beforeEach(() => vi.clearAllMocks());

describe('refreshUserAccess', () => {
  it('swaps in the fresh user, so her list is the new one', async () => {
    const store = signedIn(creator(['contents', 'notifications']));
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });

    await store.dispatch(refreshUserAccess());

    expect(store.getState().user.user.accessAreas).toEqual(['notifications']);
  });

  it('never changes the loading flag, at any moment (so the page is not blanked)', async () => {
    for (const startedAs of [false, true]) {
      const store = signedIn(creator(['contents']));
      store.dispatch({ type: 'user/login/fulfilled', payload: { user: creator(['contents']), token: 't' } });
      // login.fulfilled leaves it false; force the other starting value through a pending getCurrentUser
      if (startedAs) store.dispatch({ type: 'user/getCurrentUser/pending' });
      const before = store.getState().user.loading;
      let resolve;
      authService.getCurrentUser.mockReturnValue(new Promise((r) => { resolve = r; }));

      const pending = store.dispatch(refreshUserAccess());
      expect(store.getState().user.loading).toBe(before);
      resolve({ data: { user: creator(['explore']) } });
      await pending;

      expect(store.getState().user.loading).toBe(before);
    }
  });

  it('keeps her signed in when the refresh fails, and changes nothing', async () => {
    const store = signedIn(creator(['contents']));
    store.dispatch({ type: 'user/login/fulfilled', payload: { user: creator(['contents']), token: 't' } });
    const before = store.getState().user;
    authService.getCurrentUser.mockRejectedValue(new Error('Network Error'));

    const action = await store.dispatch(refreshUserAccess());

    expect(action.type).toBe('user/refreshUserAccess/rejected');
    expect(store.getState().user).toEqual(before);
    expect(store.getState().user.isAuthenticated).toBe(true);
    expect(store.getState().user.user).not.toBeNull();
  });

  it('keeps her signed in even when the server says the user is not found', async () => {
    const store = signedIn(creator(['contents']));
    store.dispatch({ type: 'user/login/fulfilled', payload: { user: creator(['contents']), token: 't' } });
    authService.getCurrentUser.mockRejectedValue(new Error('User not found'));

    await store.dispatch(refreshUserAccess());

    expect(store.getState().user.isAuthenticated).toBe(true);
    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
  });

  it('only replaces the same person (a different id is ignored)', async () => {
    const store = signedIn(creator(['contents']));
    authService.getCurrentUser.mockResolvedValue({ data: { user: { ...creator(['notifications']), _id: 'someone-else' } } });

    await store.dispatch(refreshUserAccess());

    expect(store.getState().user.user._id).toBe('c1');
    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
  });

  it('ignores an answer with no user in it', async () => {
    const store = signedIn(creator(['contents']));
    authService.getCurrentUser.mockResolvedValue({ data: {} });

    await store.dispatch(refreshUserAccess());

    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
  });

  it('does nothing when nobody is signed in', async () => {
    const store = configureStore({ reducer: { user: reducer } });
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });

    await store.dispatch(refreshUserAccess());

    expect(store.getState().user.user).toBeNull();
  });

  it('leaves the rest of the session as it was (children, token, two-factor flag)', async () => {
    const store = signedIn(creator(['contents']));
    store.dispatch({
      type: 'user/getCurrentUser/fulfilled',
      payload: { user: creator(['contents']), childProfiles: [{ _id: 'k1' }], twoFactorEnrollmentRequired: false },
    });
    const before = store.getState().user;
    authService.getCurrentUser.mockResolvedValue({
      data: { user: creator(['explore']), childProfiles: [{ _id: 'other' }], twoFactorEnrollmentRequired: true },
    });

    await store.dispatch(refreshUserAccess());

    const after = store.getState().user;
    expect(after.childProfiles).toEqual(before.childProfiles);
    expect(after.twoFactorEnrollmentRequired).toBe(before.twoFactorEnrollmentRequired);
    expect(after.token).toBe(before.token);
    expect(after.isAuthenticated).toBe(before.isAuthenticated);
    expect(after.user.accessAreas).toEqual(['explore']);
  });
});

describe('the old getCurrentUser is untouched (and is exactly why a separate refresh exists)', () => {
  it('still shows the loading screen while it runs', async () => {
    const store = signedIn(creator(['contents']));
    let resolve;
    authService.getCurrentUser.mockReturnValue(new Promise((r) => { resolve = r; }));

    const pending = store.dispatch(getCurrentUser());
    expect(store.getState().user.loading).toBe(true);
    resolve({ data: { user: creator(['contents']) } });
    await pending;
  });
});
