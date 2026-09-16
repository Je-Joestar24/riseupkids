import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthedAccess from './AuthedAccess';

let mockState;
vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ user: mockState }),
}));

function renderAt(path, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <AuthedAccess allowedRoles={allowedRoles}>
              <div>Protected content</div>
            </AuthedAccess>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/admin/setup-2fa" element={<div>2FA setup page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthedAccess — Chunk 10 admin 2FA enrollment gate', () => {
  it('lets a non-admin through regardless of twoFactorEnrollmentRequired (it is admin-only)', () => {
    mockState = {
      isAuthenticated: true,
      loading: false,
      user: { role: 'parent' },
      twoFactorEnrollmentRequired: true, // would never actually be set for a parent, but prove it's ignored
    };
    renderAt('/parents/child', ['parent']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('lets an enrolled admin through to a normal admin route', () => {
    mockState = {
      isAuthenticated: true,
      loading: false,
      user: { role: 'admin' },
      twoFactorEnrollmentRequired: false,
    };
    renderAt('/admin/dashboard', ['admin']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects an UNenrolled admin away from a normal admin route to the setup screen', () => {
    mockState = {
      isAuthenticated: true,
      loading: false,
      user: { role: 'admin' },
      twoFactorEnrollmentRequired: true,
    };
    renderAt('/admin/dashboard', ['admin']);
    expect(screen.getByText('2FA setup page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('does NOT redirect when the admin is already ON the setup screen itself (no redirect loop)', () => {
    mockState = {
      isAuthenticated: true,
      loading: false,
      user: { role: 'admin' },
      twoFactorEnrollmentRequired: true,
    };
    renderAt('/admin/setup-2fa', ['admin']);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('still redirects to /login first when not authenticated at all, even if the flag is somehow set', () => {
    mockState = {
      isAuthenticated: false,
      loading: false,
      user: null,
      twoFactorEnrollmentRequired: true,
    };
    renderAt('/admin/dashboard', ['admin']);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('shows the loading state before the enrollment flag is even known', () => {
    mockState = { isAuthenticated: false, loading: true, user: null, twoFactorEnrollmentRequired: null };
    renderAt('/admin/dashboard', ['admin']);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
