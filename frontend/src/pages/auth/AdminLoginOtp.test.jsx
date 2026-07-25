import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLoginOtp from './AdminLoginOtp';

const verifyLoginOtp = vi.fn();
const resendLoginOtp = vi.fn();

vi.mock('../../hooks/userHook', () => ({
  default: () => ({
    verifyLoginOtp,
    resendLoginOtp,
    loading: false,
  }),
}));

vi.mock('../../components/auth/AuthLogo', () => ({
  default: () => <div data-testid="auth-logo">Logo</div>,
}));

describe('AdminLoginOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.location;
    window.location = { assign: vi.fn() };
  });

  const renderPage = (email = 'admin@example.com') =>
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login/verify-otp',
            state: { email },
          },
        ]}
      >
        <Routes>
          <Route path="/login/verify-otp" element={<AdminLoginOtp />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders 6 digit inputs and email from location state', () => {
    renderPage();

    expect(screen.getByRole('main', { name: /admin login verification code/i })).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Digit \d of 6/i)).toHaveLength(6);
  });

  it('verifies OTP and redirects to admin dashboard on success', async () => {
    const user = userEvent.setup();
    verifyLoginOtp.mockResolvedValue({
      user: { role: 'admin', email: 'admin@example.com' },
      token: 'jwt',
    });

    renderPage();

    const inputs = screen.getAllByLabelText(/Digit \d of 6/i);
    for (let i = 0; i < 6; i += 1) {
      await user.type(inputs[i], String(i + 1));
    }

    await user.click(
      screen.getByRole('button', { name: /Verify admin login code and continue/i })
    );

    await waitFor(() => {
      expect(verifyLoginOtp).toHaveBeenCalledWith('admin@example.com', '123456');
    });
    expect(window.location.assign).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('calls resendLoginOtp when Resend code is clicked', async () => {
    const user = userEvent.setup();
    resendLoginOtp.mockResolvedValue({ success: true });

    renderPage();

    await user.click(screen.getByRole('button', { name: /Resend admin login verification code/i }));

    await waitFor(() => {
      expect(resendLoginOtp).toHaveBeenCalledWith('admin@example.com');
    });
  });

  it('redirects to login when email state is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/login/verify-otp']}>
        <Routes>
          <Route path="/login/verify-otp" element={<AdminLoginOtp />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
