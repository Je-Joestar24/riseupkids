/**
 * Content creator access areas through the REAL router and route table (pages are stand-ins that show their name):
 * who ends up on which page when they open an address, including the new Notifications and Experiences pages.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

vi.mock('../services/authService', () => ({ default: { getCurrentUser: vi.fn() } }));
vi.mock('../hooks/userHook', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

vi.mock('../store/slices/userSlice', async (importOriginal) => ({
  ...(await importOriginal()),
  bootstrapSession: () => ({ type: 'test/bootstrap' }),
}));

// Every page and layout is a stand-in showing its own name (a layout shows its page inside it)
vi.mock('./routeComponents', async () => {
  const React = await import('react');
  const cache = {};
  // The home page for unknown addresses is the real one: its redirect is what is being tested
  const Home = (await import('../pages/contentcreator/ContentCreatorHome')).default;
  Home.preload = () => {};
  cache.ContentCreatorHome = Home;
  const stand = (name) => {
    if (!cache[name]) {
      const Stub = ({ children }) => React.createElement('div', { 'data-testid': name }, name, children);
      Stub.preload = () => {};
      cache[name] = Stub;
    }
    return cache[name];
  };
  return { ROUTE_COMPONENTS: new Proxy({}, { get: (_target, name) => stand(String(name)) }) };
});

import userReducer from '../store/slices/userSlice';
import uiReducer from '../store/slices/uiSlice';
import AppRouter from './AppRouter';

const ALL = ['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions', 'notifications', 'experiences'];

function open(user, path) {
  const store = configureStore({ reducer: { user: userReducer, ui: uiReducer } });
  store.dispatch({ type: 'user/login/fulfilled', payload: { user, token: 't' } });
  window.history.pushState({}, '', path);
  return render(
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

const creator = (accessAreas) => ({ _id: 'c1', name: 'Pat', role: 'content_creator', accessAreas });
const LEGACY = { _id: 'c1', name: 'Pat', role: 'content_creator' }; // never given a list: what every creator had before
const here = () => window.location.pathname;

beforeEach(() => vi.clearAllMocks());

describe('a creator from before access areas (no saved list)', () => {
  it.each([
    ['/content-creator/dashboard', 'ContentCreatorDashboard'],
    ['/content-creator/contents', 'AdminActivities'],
    ['/content-creator/built-in-books', 'AdminBooksBuilder'],
    ['/content-creator/built-in-books/create', 'AdminBooksBuilderCreate'],
    ['/content-creator/built-in-books/book-1/edit', 'AdminBooksBuilderCreate'],
    ['/content-creator/explore', 'AdminExplore'],
    ['/content-creator/star-cam-missions', 'AdminStarCamMissions'],
  ])('opens %s exactly as before (%s, inside her layout)', async (path, page) => {
    open(LEGACY, path);

    expect(await screen.findByTestId(page)).toBeInTheDocument();
    expect(screen.getByTestId('ContentCreatorLayout')).toBeInTheDocument();
    expect(here()).toBe(path);
  });

  it.each(['/content-creator/notifications', '/content-creator/experiences', '/content-creator/experiences/create', '/content-creator/experiences/uuid-1/edit'])(
    'cannot open %s: she is sent to her Dashboard',
    async (path) => {
      open(LEGACY, path);

      expect(await screen.findByTestId('ContentCreatorDashboard')).toBeInTheDocument();
      expect(here()).toBe('/content-creator/dashboard');
    }
  );
});

describe('a Notifications-only creator', () => {
  it('opens Notifications in her own layout (the page admins use)', async () => {
    open(creator(['notifications']), '/content-creator/notifications');

    expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
    expect(screen.getByTestId('ContentCreatorLayout')).toBeInTheDocument();
  });

  it.each([
    '/content-creator/dashboard',
    '/content-creator/contents',
    '/content-creator/explore',
    '/content-creator/built-in-books',
    '/content-creator/built-in-books/create',
    '/content-creator/star-cam-missions',
    '/content-creator/experiences',
    '/content-creator/experiences/create',
  ])('is sent from %s to Notifications', async (path) => {
    open(creator(['notifications']), path);

    expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
    expect(here()).toBe('/content-creator/notifications');
    expect(screen.queryByTestId('ContentCreatorDashboard')).not.toBeInTheDocument();
  });

  it.each(['/content-creator', '/content-creator/', '/content-creator/anything', '/content-creator/zzz/deep'])(
    'is sent from the unknown address %s to Notifications too',
    async (path) => {
      open(creator(['notifications']), path);

      expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
      expect(here()).toBe('/content-creator/notifications');
    }
  );
});

describe('a Notifications and Experiences creator', () => {
  const user = creator(['notifications', 'experiences']);

  it.each([
    ['/content-creator/experiences', 'AdminExperiences'],
    ['/content-creator/experiences/create', 'AdminExperienceEditor'],
    ['/content-creator/experiences/123e4567-e89b-42d3-a456-426614174000/edit', 'AdminExperienceEditor'],
  ])('opens %s (%s)', async (path, page) => {
    open(user, path);

    expect(await screen.findByTestId(page)).toBeInTheDocument();
    expect(screen.getByTestId('ContentCreatorLayout')).toBeInTheDocument();
    expect(here()).toBe(path);
  });

  it('cannot open the content tools she does not have', async () => {
    open(user, '/content-creator/contents');

    expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
    expect(here()).toBe('/content-creator/notifications');
  });
});

describe('a creator who has Experiences but not Notifications', () => {
  it('lands on Experiences from an address that is not hers', async () => {
    open(creator(['experiences']), '/content-creator/notifications');

    expect(await screen.findByTestId('AdminExperiences')).toBeInTheDocument();
    expect(here()).toBe('/content-creator/experiences');
  });
});

describe('a creator with every area', () => {
  it.each([
    ['/content-creator/dashboard', 'ContentCreatorDashboard'],
    ['/content-creator/notifications', 'AdminNotifications'],
    ['/content-creator/experiences', 'AdminExperiences'],
    ['/content-creator/explore', 'AdminExplore'],
  ])('opens %s', async (path, page) => {
    open(creator(ALL), path);

    expect(await screen.findByTestId(page)).toBeInTheDocument();
    expect(here()).toBe(path);
  });

  it('is sent to her Dashboard from an unknown address', async () => {
    open(creator(ALL), '/content-creator/nonsense');

    expect(await screen.findByTestId('ContentCreatorDashboard')).toBeInTheDocument();
    expect(here()).toBe('/content-creator/dashboard');
  });
});

describe('a creator with no area at all', () => {
  it.each(['/content-creator/dashboard', '/content-creator/notifications', '/content-creator', '/content-creator/zzz'])(
    'is told so at %s, and not sent round in circles',
    async (path) => {
      open(creator(['retired_area']), path);

      expect(await screen.findByText(/You don.t have access to anything yet/)).toBeInTheDocument();
      expect(screen.queryByTestId('ContentCreatorLayout')).not.toBeInTheDocument();
    }
  );
});

describe('nobody else is affected', () => {
  it('an admin still opens the admin pages, including Notifications and Experiences', async () => {
    open({ _id: 'a1', role: 'admin' }, '/admin/notifications');
    expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
    expect(screen.getByTestId('AdminLayout')).toBeInTheDocument();
  });

  it('an admin is still turned away from the content creator pages (the role check, unchanged): back to the admin home', async () => {
    open({ _id: 'a1', role: 'admin' }, '/content-creator/notifications');

    await waitFor(() => expect(here()).toBe('/admin/dashboard'));
    expect(screen.queryByTestId('AdminNotifications')).not.toBeInTheDocument();
  });

  it('a teacher still opens the teacher pages, and cannot open the creator ones', async () => {
    const view = open({ _id: 't1', role: 'teacher' }, '/teacher/dashboard');
    expect(await screen.findByTestId('TeacherDashboard')).toBeInTheDocument();
    view.unmount();

    open({ _id: 't1', role: 'teacher' }, '/content-creator/notifications');
    await waitFor(() => expect(here()).toBe('/teacher/dashboard'));
  });

  it('a parent cannot open the content creator pages', async () => {
    open({ _id: 'p1', role: 'parent' }, '/content-creator/notifications');

    await waitFor(() => expect(here()).toBe('/parents/child'));
  });

  it('a creator cannot open the admin pages (role check, unchanged)', async () => {
    open(creator(ALL), '/admin/notifications');

    await waitFor(() => expect(here()).toBe('/content-creator/dashboard'));
    expect(screen.queryByTestId('AdminNotifications')).not.toBeInTheDocument();
  });
});

describe('her access changing while she is on the site', () => {
  it('the guard follows the user in the store: when Explore is taken away she is moved on', async () => {
    const store = configureStore({ reducer: { user: userReducer, ui: uiReducer } });
    store.dispatch({ type: 'user/login/fulfilled', payload: { user: creator(['explore', 'notifications']), token: 't' } });
    window.history.pushState({}, '', '/content-creator/explore');
    render(
      <Provider store={store}>
        <AppRouter />
      </Provider>
    );
    expect(await screen.findByTestId('AdminExplore')).toBeInTheDocument();

    store.dispatch({ type: 'user/setUser', payload: creator(['notifications']) });

    expect(await screen.findByTestId('AdminNotifications')).toBeInTheDocument();
    expect(screen.queryByTestId('AdminExplore')).not.toBeInTheDocument();
  });
});
