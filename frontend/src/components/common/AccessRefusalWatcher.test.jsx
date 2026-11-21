/**
 * "Access removed" end to end on the screen: a real router, a real store and a real refusal event from the request
 * layer. The creator is told, her access is re-read, she is moved only when the page is no longer hers, and she is
 * never signed out.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom';

vi.mock('../../services/authService', () => ({
  default: { getCurrentUser: vi.fn() },
}));

import authService from '../../services/authService';
import userReducer, { setUser } from '../../store/slices/userSlice';
import uiReducer from '../../store/slices/uiSlice';
import { emitAccessRefusal } from '../../api/accessRefusal';
import AccessRefusalWatcher, { REFUSAL_WINDOW_MS } from './AccessRefusalWatcher';

const creator = (accessAreas) => ({ _id: 'c1', name: 'Pat', role: 'content_creator', accessAreas });
const MESSAGE = "You don't have access to Explore. Ask an admin if you need it.";

let where;
let how;
let goTo;
const Where = () => {
  where = useLocation().pathname;
  how = useNavigationType();
  goTo = useNavigate();
  return null;
};

function mount({ user, path }) {
  const store = configureStore({ reducer: { user: userReducer, ui: uiReducer } });
  store.dispatch({ type: 'user/login/fulfilled', payload: { user, token: 't' } });
  store.dispatch(setUser(user));
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AccessRefusalWatcher />
        <Where />
      </MemoryRouter>
    </Provider>
  );
  return { store, ...view };
}

const refuse = async (detail = { message: MESSAGE, url: '/explore' }) => {
  await act(async () => {
    emitAccessRefusal(detail);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-21T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('a creator is refused because an admin took the area away', () => {
  it('tells her in plain words', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    const { store } = mount({ user: creator(['contents', 'explore']), path: '/content-creator/contents' });

    await refuse();

    expect(store.getState().ui.notification).toEqual(expect.objectContaining({ open: true, type: 'warning', message: MESSAGE }));
  });

  it('re-reads her access, so her menu will update', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['contents']) } });
    const { store } = mount({ user: creator(['contents', 'explore']), path: '/content-creator/contents' });

    await refuse();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
  });

  it('takes her to her first allowed page when the page she is on is no longer hers', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    mount({ user: creator(['explore', 'notifications']), path: '/content-creator/explore' });

    await refuse();

    expect(where).toBe('/content-creator/notifications');
  });

  it('leaves her where she is when the page is still hers (the refusal came from something else)', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['contents', 'explore']) } });
    mount({ user: creator(['contents', 'explore']), path: '/content-creator/contents' });

    await refuse();

    expect(where).toBe('/content-creator/contents');
  });

  it('replaces the page she was on, so the Back button does not return her to a closed page', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    const view = mount({ user: creator(['explore']), path: '/content-creator/explore' });

    await refuse();

    expect(where).toBe('/content-creator/notifications');
    expect(how).toBe('REPLACE');
    view.unmount();
  });

  it('never signs her out', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    const { store } = mount({ user: creator(['explore']), path: '/content-creator/explore' });

    await refuse();

    expect(store.getState().user.isAuthenticated).toBe(true);
    expect(store.getState().user.user).not.toBeNull();
  });
});

describe('when the refresh cannot be done', () => {
  it('still tells her, still keeps her signed in, and leaves her where she is', async () => {
    authService.getCurrentUser.mockRejectedValue(new Error('Network Error'));
    const { store } = mount({ user: creator(['contents']), path: '/content-creator/contents' });

    await refuse();

    expect(store.getState().ui.notification.message).toBe(MESSAGE);
    expect(store.getState().user.isAuthenticated).toBe(true);
    expect(store.getState().user.user.accessAreas).toEqual(['contents']);
    expect(where).toBe('/content-creator/contents');
  });

  it('even if the server says the user was not found, she is not signed out', async () => {
    authService.getCurrentUser.mockRejectedValue(new Error('User not found'));
    const { store } = mount({ user: creator(['contents']), path: '/content-creator/contents' });

    await refuse();

    expect(store.getState().user.isAuthenticated).toBe(true);
  });

  it('judges the page she is on NOW, not the one she was on when the screen opened', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications', 'explore']) } });
    mount({ user: creator(['notifications', 'explore']), path: '/content-creator/notifications' });

    // She moves on to Explore (still hers), and only then is refused something
    await act(async () => {
      goTo('/content-creator/explore');
    });
    await refuse();

    expect(where).toBe('/content-creator/explore');
  });

  it('and moves her when the page she has moved to is the one that is no longer hers', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    mount({ user: creator(['notifications', 'explore']), path: '/content-creator/notifications' });

    await act(async () => {
      goTo('/content-creator/explore');
    });
    await refuse();

    expect(where).toBe('/content-creator/notifications');
  });

  it('moves her using the list the screen already has, when the page is no longer in it', async () => {
    authService.getCurrentUser.mockRejectedValue(new Error('Network Error'));
    mount({ user: creator(['notifications']), path: '/content-creator/explore' });

    await refuse();

    expect(where).toBe('/content-creator/notifications');
  });
});

describe('several refusals at once are one event', () => {
  it('reacts only once for a burst (a page load fires several requests)', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    const { store } = mount({ user: creator(['explore']), path: '/content-creator/explore' });

    await refuse();
    await refuse();
    await refuse();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(store.getState().ui.notification.open).toBe(true);
  });

  it('reacts again to a refusal after the window has passed', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    mount({ user: creator(['notifications']), path: '/content-creator/notifications' });

    await refuse();
    await act(async () => {
      vi.setSystemTime(Date.now() + REFUSAL_WINDOW_MS + 1);
    });
    await refuse();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(2);
  });
});

describe('only where it should', () => {
  it('does not move anyone who is not a content creator', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: { _id: 'a1', role: 'admin' } } });
    mount({ user: { _id: 'a1', name: 'Admin', role: 'admin' }, path: '/admin/users' });

    await refuse();

    expect(where).toBe('/admin/users');
  });

  it('does not move a creator who is somewhere else on the site', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    mount({ user: creator(['notifications']), path: '/login' });

    await refuse();

    expect(where).toBe('/login');
  });

  it('stops listening when it goes away', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['notifications']) } });
    const { store, unmount } = mount({ user: creator(['explore']), path: '/content-creator/explore' });
    unmount();

    await refuse();

    expect(authService.getCurrentUser).not.toHaveBeenCalled();
    expect(store.getState().ui.notification.open).toBe(false);
  });

  it('does not stack up listeners across re-renders', async () => {
    authService.getCurrentUser.mockResolvedValue({ data: { user: creator(['explore']) } });
    const { rerender, store } = mount({ user: creator(['explore']), path: '/content-creator/explore' });
    rerender(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/content-creator/explore']}>
          <AccessRefusalWatcher />
          <Where />
        </MemoryRouter>
      </Provider>
    );

    await refuse();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
