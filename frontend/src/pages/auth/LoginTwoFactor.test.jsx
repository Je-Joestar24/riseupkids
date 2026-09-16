import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginTwoFactor from './LoginTwoFactor';

const verifyLoginTwoFactor = vi.fn();

vi.mock('../../hooks/userHook', () => ({
  default: () => ({
    verifyLoginTwoFactor,
    loading: false,
  }),
}));

vi.mock('../../components/auth/AuthLogo', () => ({
  default: () => <div data-testid="auth-logo">Logo</div>,
}));

describe('LoginTwoFactor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.location;
    window.location = { assign: vi.fn() };
  });

  const renderPage = (email = 'parent@example.com') =>
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login/verify-2fa', state: { email } }]}>
        <Routes>
          <Route path="/login/verify-2fa" element={<LoginTwoFactor />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders 6 digit inputs by default and the email from location state', () => {
    renderPage();

    expect(screen.getByRole('main', { name: /two-factor verification code/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Digit \d of 6/i)).toHaveLength(6);
  });

  it('verifies a TOTP code and redirects a parent to their dashboard', async () => {
    const user = userEvent.setup();
    verifyLoginTwoFactor.mockResolvedValue({
      user: { role: 'parent', email: 'parent@example.com' },
      token: 'jwt',
    });

    renderPage();

    const inputs = screen.getAllByLabelText(/Digit \d of 6/i);
    for (let i = 0; i < 6; i += 1) {
      await user.type(inputs[i], String(i + 1));
    }
    await user.click(screen.getByRole('button', { name: /Verify code and continue/i }));

    await waitFor(() => {
      expect(verifyLoginTwoFactor).toHaveBeenCalledWith('parent@example.com', '123456');
    });
    expect(window.location.assign).toHaveBeenCalledWith('/parents/child');
  });

  it('redirects an admin who has NOT enrolled TOTP to the mandatory setup screen instead of the dashboard', async () => {
    const user = userEvent.setup();
    verifyLoginTwoFactor.mockResolvedValue({
      user: { role: 'admin', email: 'admin@example.com' },
      token: 'jwt',
      twoFactorEnrollmentRequired: true,
    });

    renderPage('admin@example.com');

    const inputs = screen.getAllByLabelText(/Digit \d of 6/i);
    for (let i = 0; i < 6; i += 1) {
      await user.type(inputs[i], String(i + 1));
    }
    await user.click(screen.getByRole('button', { name: /Verify code and continue/i }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/admin/setup-2fa');
    });
  });

  it('an admin who has already enrolled TOTP goes straight to the dashboard', async () => {
    const user = userEvent.setup();
    verifyLoginTwoFactor.mockResolvedValue({
      user: { role: 'admin', email: 'admin@example.com' },
      token: 'jwt',
      twoFactorEnrollmentRequired: false,
    });

    renderPage('admin@example.com');

    const inputs = screen.getAllByLabelText(/Digit \d of 6/i);
    for (let i = 0; i < 6; i += 1) {
      await user.type(inputs[i], String(i + 1));
    }
    await user.click(screen.getByRole('button', { name: /Verify code and continue/i }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('switches to a single recovery-code field and submits it verbatim', async () => {
    const user = userEvent.setup();
    verifyLoginTwoFactor.mockResolvedValue({
      user: { role: 'parent', email: 'parent@example.com' },
      token: 'jwt',
    });

    renderPage();

    await user.click(screen.getByRole('button', { name: /use a recovery code instead/i }));
    expect(screen.queryAllByLabelText(/Digit \d of 6/i)).toHaveLength(0);

    const recoveryInput = screen.getByLabelText('Recovery code');
    await user.type(recoveryInput, 'ABCDE-12345');
    await user.click(screen.getByRole('button', { name: /Verify code and continue/i }));

    await waitFor(() => {
      expect(verifyLoginTwoFactor).toHaveBeenCalledWith('parent@example.com', 'ABCDE-12345');
    });
  });

  it('shows an error and clears the code on an invalid attempt, without navigating', async () => {
    const user = userEvent.setup();
    verifyLoginTwoFactor.mockRejectedValue({ message: 'Invalid verification code' });

    renderPage();

    const inputs = screen.getAllByLabelText(/Digit \d of 6/i);
    for (let i = 0; i < 6; i += 1) {
      await user.type(inputs[i], '0');
    }
    await user.click(screen.getByRole('button', { name: /Verify code and continue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid verification code/i);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('redirects to login when email state is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/login/verify-2fa']}>
        <Routes>
          <Route path="/login/verify-2fa" element={<LoginTwoFactor />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
