/**
 * The sign-in pages are for signed-out visitors only: a signed-in person is sent to the home of their role.
 * A content creator goes to her landing page (her first allowed page), not to the site's front door.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import userReducer, { setUser } from '../../store/slices/userSlice';
import UnAuthed from './UnAuthed';

let where;
const Where = () => {
  where = useLocation().pathname;
  return null;
};

function visitSignIn(user, { loadingFirst = false } = {}) {
  const store = configureStore({ reducer: { user: userReducer } });
  if (user) store.dispatch({ type: 'user/login/fulfilled', payload: { user, token: 't' } });
  if (loadingFirst) store.dispatch({ type: 'user/getCurrentUser/pending' });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <Where />
        <Routes>
          <Route path="/login" element={<UnAuthed><div>the sign-in page</div></UnAuthed>} />
          <Route path="*" element={<div>somewhere else</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('UnAuthed', () => {
  it('shows the sign-in page to a signed-out visitor', () => {
    visitSignIn(null, { loadingFirst: false });
    // no user in the store: still the initial state, which is "loading" until the first session check
    expect(screen.getByText('the sign-in page')).toBeInTheDocument();
  });

  it('shows the sign-in page while the session is still being checked', () => {
    visitSignIn({ _id: 'p1', role: 'parent' }, { loadingFirst: true });

    expect(screen.getByText('the sign-in page')).toBeInTheDocument();
  });

  it.each([
    ['parent', '/parents/child'],
    ['admin', '/admin/dashboard'],
    ['teacher', '/teacher/dashboard'],
    ['child', '/child/dashboard'],
  ])('sends a signed-in %s to %s', (role, path) => {
    visitSignIn({ _id: 'u1', role });

    expect(where).toBe(path);
  });

  it('sends a signed-in person with an unknown role to the front door', () => {
    visitSignIn({ _id: 'u1', role: 'visitor' });

    expect(where).toBe('/');
  });

  describe('a content creator', () => {
    it('from before access areas goes to the Dashboard', () => {
      visitSignIn({ _id: 'c1', role: 'content_creator' });

      expect(where).toBe('/content-creator/dashboard');
    });

    it('goes to her first allowed page', () => {
      visitSignIn({ _id: 'c1', role: 'content_creator', accessAreas: ['notifications', 'experiences'] });

      expect(where).toBe('/content-creator/notifications');
    });

    it('with no area at all goes to /content-creator, which tells her so', () => {
      visitSignIn({ _id: 'c1', role: 'content_creator', accessAreas: ['retired_area'] });

      expect(where).toBe('/content-creator');
    });
  });
});
