/**
 * Where the login form sends someone after a good sign-in. A content creator goes to the first area she has (not
 * always the Dashboard, which she may not have), everyone else to their usual home.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = { login: vi.fn(), loading: false, isAuthenticated: false, user: null, twoFactorEnrollmentRequired: false };
vi.mock('../../hooks/userHook', () => ({ default: () => auth, useAuth: () => auth }));

import AuthLoginForm from './AuthLoginForm';

const realLocation = window.location;
let assign;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: { ...realLocation, assign } });
  auth.login = vi.fn();
  auth.isAuthenticated = false;
  auth.user = null;
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation });
});

async function signIn() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AuthLoginForm />
    </MemoryRouter>
  );
  await user.type(screen.getByPlaceholderText('your@email.com'), 'creator@example.com');
  await user.type(screen.getByPlaceholderText('Password'), 'secret123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('after a good sign-in', () => {
  it('sends a Notifications-only content creator to Notifications, not to a Dashboard she does not have', async () => {
    auth.login.mockResolvedValue({ user: { _id: 'c1', role: 'content_creator', accessAreas: ['notifications'] } });

    await signIn();

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/content-creator/notifications'));
  });

  it('sends a creator who has the Dashboard to the Dashboard', async () => {
    auth.login.mockResolvedValue({ user: { _id: 'c1', role: 'content_creator', accessAreas: ['dashboard', 'notifications'] } });

    await signIn();

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/content-creator/dashboard'));
  });

  it('sends a creator from before access areas (no list) to the Dashboard', async () => {
    auth.login.mockResolvedValue({ user: { _id: 'c1', role: 'content_creator' } });

    await signIn();

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/content-creator/dashboard'));
  });
});

describe('already signed in', () => {
  it('a creator who opens the login page again goes to her first area', async () => {
    auth.isAuthenticated = true;
    auth.user = { _id: 'c1', role: 'content_creator', accessAreas: ['experiences'] };

    render(
      <MemoryRouter>
        <AuthLoginForm />
      </MemoryRouter>
    );

    await waitFor(() => expect(assign).toHaveBeenCalledWith('/content-creator/experiences'));
  });
});
