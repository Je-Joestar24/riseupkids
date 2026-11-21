/**
 * The area lock on the screen: a creator with the area sees the page, one without is sent to her landing page (never
 * back to the same page), one with no area at all is told so. Everyone else passes.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import userReducer, { setUser } from '../../store/slices/userSlice';
import CreatorAreaAccess from './CreatorAreaAccess';

vi.mock('../../hooks/userHook', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

let where;
let how;
const Where = () => {
  where = useLocation().pathname;
  how = useNavigationType();
  return null;
};

const creator = (accessAreas) => ({ _id: 'c1', role: 'content_creator', accessAreas });

function mount({ user, area, path = '/content-creator/explore' }) {
  const store = configureStore({ reducer: { user: userReducer } });
  if (user) store.dispatch(setUser(user));
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route
            path="/content-creator/explore"
            element={
              <CreatorAreaAccess area={area}>
                <div>the explore page</div>
              </CreatorAreaAccess>
            }
          />
          <Route path="/content-creator/notifications" element={<div>the notifications page</div>} />
          <Route path="/content-creator/dashboard" element={<div>the dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('a content creator', () => {
  it('sees the page of an area she has', () => {
    mount({ user: creator(['explore', 'notifications']), area: 'explore' });

    expect(screen.getByText('the explore page')).toBeInTheDocument();
  });

  it('is sent to her landing page for an area she does not have, replacing the address', () => {
    mount({ user: creator(['notifications']), area: 'explore' });

    expect(screen.queryByText('the explore page')).not.toBeInTheDocument();
    expect(screen.getByText('the notifications page')).toBeInTheDocument();
    expect(where).toBe('/content-creator/notifications');
  });

  it('replaces the address when it sends her away, so Back does not return her to the closed page', () => {
    mount({ user: creator(['notifications']), area: 'explore' });

    expect(where).toBe('/content-creator/notifications');
    expect(how).toBe('REPLACE');
  });

  it('a creator from before access areas (no list) can open Explore, and is sent to the Dashboard for Notifications', () => {
    mount({ user: { _id: 'c1', role: 'content_creator' }, area: 'explore' });
    expect(screen.getByText('the explore page')).toBeInTheDocument();
  });

  it('with no saved list is turned away from Notifications to the Dashboard (her landing page)', () => {
    mount({ user: { _id: 'c1', role: 'content_creator' }, area: 'notifications' });

    expect(screen.getByText('the dashboard page')).toBeInTheDocument();
    expect(where).toBe('/content-creator/dashboard');
  });

  it('with no area at all is told so, and is not redirected anywhere', () => {
    mount({ user: creator(['retired_area']), area: 'explore' });

    expect(screen.getByText(/You don.t have access to anything yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(where).toBe('/content-creator/explore');
  });
});

describe('everyone else', () => {
  it.each(['admin', 'teacher', 'parent'])('a %s passes, whatever list they carry', (role) => {
    mount({ user: { _id: 'u1', role, accessAreas: ['notifications'] }, area: 'explore' });

    expect(screen.getByText('the explore page')).toBeInTheDocument();
  });

  it('a page with no area passes for a creator too (it is not an area page)', () => {
    mount({ user: creator(['notifications']), area: undefined });

    expect(screen.getByText('the explore page')).toBeInTheDocument();
  });

  it('nobody signed in passes through (the role guard in front of this one deals with that)', () => {
    mount({ user: null, area: 'explore' });

    expect(screen.getByText('the explore page')).toBeInTheDocument();
  });
});
