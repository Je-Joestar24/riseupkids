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

describe('authService — Chunk 10 two-factor authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAccessToken();
  });

  describe('verifyLoginTwoFactor', () => {
    it('posts email + code and persists the access token in memory on success', async () => {
      api.post.mockResolvedValue({
        data: {
          success: true,
          message: 'Login successful',
          data: { token: 'jwt-token', user: { email: 'p@example.com', role: 'parent' } },
        },
      });

      const result = await authService.verifyLoginTwoFactor('p@example.com', '123456');

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/login-verify', {
        email: 'p@example.com',
        code: '123456',
      });
      expect(result.data.token).toBe('jwt-token');
      expect(getAccessToken()).toBe('jwt-token');
    });

    it('trims the email but sends a recovery code verbatim', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: { token: 't', user: {} } } });

      await authService.verifyLoginTwoFactor('  p@example.com  ', 'ABCDE-12345');

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/login-verify', {
        email: 'p@example.com',
        code: 'ABCDE-12345',
      });
    });

    it('throws the API error on failure and does not persist a token', async () => {
      api.post.mockRejectedValue({ response: { data: { message: 'Invalid verification code' } } });

      await expect(authService.verifyLoginTwoFactor('p@example.com', '000000')).rejects.toEqual({
        message: 'Invalid verification code',
      });
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('setupTwoFactor / verifySetupTwoFactor', () => {
    it('setupTwoFactor returns the QR/secret payload', async () => {
      api.post.mockResolvedValue({
        data: { success: true, data: { secret: 'ABC', otpauthUrl: 'otpauth://x', qrDataUrl: 'data:image/png;base64,x' } },
      });

      const result = await authService.setupTwoFactor();

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/setup');
      expect(result.secret).toBe('ABC');
    });

    it('verifySetupTwoFactor posts the code and returns recovery codes', async () => {
      api.post.mockResolvedValue({
        data: { success: true, data: { recoveryCodes: ['AAAAA-11111', 'BBBBB-22222'] } },
      });

      const result = await authService.verifySetupTwoFactor('654321');

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/verify-setup', { code: '654321' });
      expect(result.recoveryCodes).toHaveLength(2);
    });
  });

  describe('disableTwoFactor', () => {
    it('posts password and code', async () => {
      api.post.mockResolvedValue({ data: { success: true, message: 'Disabled' } });

      await authService.disableTwoFactor('mypassword', '123456');

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/disable', {
        password: 'mypassword',
        code: '123456',
      });
    });

    it('propagates a wrong-password error', async () => {
      api.post.mockRejectedValue({ response: { data: { message: 'Incorrect password' } } });

      await expect(authService.disableTwoFactor('wrong', '123456')).rejects.toEqual({
        message: 'Incorrect password',
      });
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('posts the code and returns the new batch', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: { recoveryCodes: ['ZZZZZ-99999'] } } });

      const result = await authService.regenerateRecoveryCodes('123456');

      expect(api.post).toHaveBeenCalledWith('/auth/2fa/recovery-codes', { code: '123456' });
      expect(result.recoveryCodes).toEqual(['ZZZZZ-99999']);
    });
  });

  describe('getTwoFactorStatus', () => {
    it('returns enabled + remaining recovery codes', async () => {
      api.get.mockResolvedValue({ data: { success: true, data: { enabled: true, remainingRecoveryCodes: 7 } } });

      const result = await authService.getTwoFactorStatus();

      expect(api.get).toHaveBeenCalledWith('/auth/2fa/status');
      expect(result).toEqual({ enabled: true, remainingRecoveryCodes: 7 });
    });
  });

  describe('stepUpVerify', () => {
    it('posts the code and returns a step-up token', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: { stepUpToken: 'short-lived-token' } } });

      const result = await authService.stepUpVerify('123456');

      expect(api.post).toHaveBeenCalledWith('/auth/step-up-verify', { code: '123456' });
      expect(result.stepUpToken).toBe('short-lived-token');
    });

    it('propagates a STEP_UP failure', async () => {
      api.post.mockRejectedValue({ response: { data: { message: 'Invalid verification code' } } });

      await expect(authService.stepUpVerify('000000')).rejects.toEqual({
        message: 'Invalid verification code',
      });
    });
  });

  describe('bootstrapSession — Chunk 10 addition', () => {
    it('threads twoFactorEnrollmentRequired through from /auth/me', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: { token: 'jwt' } } });
      api.get.mockResolvedValue({
        data: { success: true, data: { user: { role: 'admin' }, twoFactorEnrollmentRequired: true } },
      });

      const result = await authService.bootstrapSession();

      expect(result.authenticated).toBe(true);
      expect(result.twoFactorEnrollmentRequired).toBe(true);
    });

    it('defaults to null when /auth/me does not include the field (non-admin)', async () => {
      api.post.mockResolvedValue({ data: { success: true, data: { token: 'jwt' } } });
      api.get.mockResolvedValue({ data: { success: true, data: { user: { role: 'parent' } } } });

      const result = await authService.bootstrapSession();

      expect(result.twoFactorEnrollmentRequired).toBeNull();
    });
  });
});
