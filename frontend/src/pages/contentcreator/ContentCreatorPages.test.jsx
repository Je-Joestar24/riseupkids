/**
 * The content creator Dashboard (shortcuts only to areas she has) and the home page for any other address (her
 * landing page, or "no access yet").
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import userReducer, { setUser } from '../../store/slices/userSlice';
import ContentCreatorDashboard from './ContentCreatorDashboard';
import ContentCreatorHome from './ContentCreatorHome';

vi.mock('../../hooks/userHook', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

const theme = createTheme({ palette: { orange: { main: '#e98a68' }, border: { main: '#e2e8f0' } } });

let where;
const Where = () => {
  where = useLocation().pathname;
  return null;
};

const creator = (accessAreas) => ({ _id: 'c1', role: 'content_creator', accessAreas });

function mount(ui, user, path) {
  const store = configureStore({ reducer: { user: userReducer } });
  if (user) store.dispatch(setUser(user));
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider theme={theme}>
          <Where />
          <Routes>
            <Route path="/content-creator/dashboard" element={ui} />
            <Route path="/content-creator/notifications" element={<div>the notifications page</div>} />
            <Route path="/content-creator/experiences" element={<div>the experiences page</div>} />
            <Route path="/content-creator/*" element={ui} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );
}

const tiles = () => screen.queryAllByRole('button').map((tile) => tile.getAttribute('aria-label'));

describe('the Dashboard shortcuts', () => {
  it('a creator from before access areas sees the four shortcuts she has today, and no more', () => {
    mount(<ContentCreatorDashboard />, { _id: 'c1', role: 'content_creator' }, '/content-creator/dashboard');

    expect(tiles()).toEqual(['Go to My Contents', 'Go to Built-in Books', 'Go to Explore', 'Go to Star Cam Missions']);
  });

  it('shows only shortcuts to the areas she has', () => {
    mount(<ContentCreatorDashboard />, creator(['dashboard', 'explore', 'notifications']), '/content-creator/dashboard');

    expect(tiles()).toEqual(['Go to Explore', 'Go to Notifications']);
  });

  it('has shortcuts for the two new areas', () => {
    mount(<ContentCreatorDashboard />, creator(['dashboard', 'notifications', 'experiences']), '/content-creator/dashboard');

    expect(tiles()).toEqual(['Go to Notifications', 'Go to Experiences']);
  });

  it('shows none when she has the Dashboard only', () => {
    mount(<ContentCreatorDashboard />, creator(['dashboard']), '/content-creator/dashboard');

    expect(tiles()).toEqual([]);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('opens the area when a shortcut is clicked', async () => {
    const click = userEvent.setup();
    mount(<ContentCreatorDashboard />, creator(['dashboard', 'experiences']), '/content-creator/dashboard');

    await click.click(screen.getByRole('button', { name: 'Go to Experiences' }));

    expect(where).toBe('/content-creator/experiences');
  });

  it('opens the area from the keyboard too', async () => {
    const click = userEvent.setup();
    mount(<ContentCreatorDashboard />, creator(['dashboard', 'notifications']), '/content-creator/dashboard');

    screen.getByRole('button', { name: 'Go to Notifications' }).focus();
    await click.keyboard('{Enter}');

    expect(where).toBe('/content-creator/notifications');
  });
});

describe('the home page for any other address', () => {
  it('sends a creator to her first allowed page', () => {
    mount(<ContentCreatorHome />, creator(['notifications', 'experiences']), '/content-creator/anything-else');

    expect(screen.getByText('the notifications page')).toBeInTheDocument();
    expect(where).toBe('/content-creator/notifications');
  });

  it('sends a creator from before access areas to the Dashboard, as the old home did', () => {
    mount(<ContentCreatorHome />, { _id: 'c1', role: 'content_creator' }, '/content-creator/anything-else');

    expect(where).toBe('/content-creator/dashboard');
  });

  it('tells a creator with no area so, and stays where it is', () => {
    mount(<ContentCreatorHome />, creator(['retired_area']), '/content-creator/anything-else');

    expect(screen.getByText(/You don.t have access to anything yet/)).toBeInTheDocument();
    expect(where).toBe('/content-creator/anything-else');
  });
});
