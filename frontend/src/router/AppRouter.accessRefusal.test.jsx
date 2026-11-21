/**
 * The real app router carries the "access removed" watcher: a refusal announced by the request layer reaches the
 * person (notice, refreshed access) wherever she is on the site. Pages are stand-ins; only the wiring is tested here
 * (what the watcher does is tested in components/common/AccessRefusalWatcher.test.jsx).
 */
import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../services/authService', () => ({ default: { getCurrentUser: vi.fn() } }));

// The session check on start is not what is tested here; everything else in the user store is real
vi.mock('../store/slices/userSlice', async (importOriginal) => ({
  ...(await importOriginal()),
  bootstrapSession: () => ({ type: 'test/bootstrap' }),
}));

// Every page and layout is a plain stand-in
vi.mock('./routeComponents', () => {
  const Stub = () => null;
  Stub.preload = () => {};
  return { ROUTE_COMPONENTS: new Proxy({}, { get: () => Stub }) };
});

import authService from '../services/authService';
import userReducer from '../store/slices/userSlice';
import uiReducer from '../store/slices/uiSlice';
import { emitAccessRefusal } from '../api/accessRefusal';
import AppRouter from './AppRouter';

const creator = { _id: 'c1', name: 'Pat', role: 'content_creator', accessAreas: ['contents', 'explore'] };

beforeEach(() => vi.clearAllMocks());

describe('AppRouter carries the access-removed watcher', () => {
  it('a refusal announced by the request layer shows her a notice and refreshes her access', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: { ...creator, accessAreas: ['contents'] } } });
    const store = configureStore({ reducer: { user: userReducer, ui: uiReducer } });
    store.dispatch({ type: 'user/login/fulfilled', payload: { user: creator, token: 't' } });
    render(
      <Provider store={store}>
        <AppRouter />
      </Provider>
    );

    await act(async () => {
      emitAccessRefusal({ message: "You don't have access to Explore. Ask an admin if you need it.", url: '/explore' });
    });

    expect(store.getState().ui.notification).toEqual(
      expect.objectContaining({ open: true, type: 'warning', message: "You don't have access to Explore. Ask an admin if you need it." })
    );
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
    expect(store.getState().user.isAuthenticated).toBe(true);
  });
});
