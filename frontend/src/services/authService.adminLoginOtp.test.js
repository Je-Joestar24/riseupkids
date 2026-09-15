import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../api/axios';
import authService from '../services/authService';
import { getAccessToken, clearAccessToken } from '../services/tokenStore';

describe('authService – admin login OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    clearAccessToken();
  });

  describe('login', () => {
    it('does not persist session when requiresOtp is true', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          message: 'A verification code has been sent to your email.',
          data: {
            requiresOtp: true,
            email: 'admin@example.com',
          },
        },
      });

      const result = await authService.login('admin@example.com', 'secret123');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@example.com',
        password: 'secret123',
      });
      expect(result.data.requiresOtp).toBe(true);
      expect(getAccessToken()).toBeNull();
    });

    it('persists the access token in memory (never in sessionStorage) for non-OTP login responses', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Login successful',
          data: {
            token: 'jwt-token',
            user: { email: 'parent@example.com', role: 'parent' },
          },
        },
      });

      const result = await authService.login('parent@example.com', 'secret123');

      expect(result.data.token).toBe('jwt-token');
      expect(getAccessToken()).toBe('jwt-token');
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('user')).toBeNull();
    });
  });

  describe('verifyLoginOtp', () => {
    it('posts normalized code and persists the access token in memory on success', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Login successful',
          data: {
            token: 'admin-jwt',
            user: { email: 'admin@example.com', role: 'admin' },
          },
        },
      });

      const result = await authService.verifyLoginOtp('admin@example.com', '654 321');

      expect(api.post).toHaveBeenCalledWith('/auth/verify-login-otp', {
        email: 'admin@example.com',
        code: '654321',
      });
      expect(result.data.token).toBe('admin-jwt');
      expect(getAccessToken()).toBe('admin-jwt');
      expect(sessionStorage.getItem('token')).toBeNull();
    });

    it('throws API error message on failure', async () => {
      api.post.mockRejectedValue({
        response: { data: { message: 'Invalid or expired verification code' } },
      });

      await expect(
        authService.verifyLoginOtp('admin@example.com', '000000')
      ).rejects.toEqual({ message: 'Invalid or expired verification code' });
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('resendLoginOtp', () => {
    it('posts email to resend endpoint', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          message: 'A new verification code has been sent to your email.',
          data: { sent: true, email: 'admin@example.com' },
        },
      });

      const result = await authService.resendLoginOtp('  admin@example.com  ');

      expect(api.post).toHaveBeenCalledWith('/auth/resend-login-otp', {
        email: 'admin@example.com',
      });
      expect(result.success).toBe(true);
    });
  });
});
