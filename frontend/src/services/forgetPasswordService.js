import api from '../api/axios';

/**
 * Forgot password / reset code service.
 * - requestCode: POST /auth/forgot-password (sends 6-digit code to email)
 * - resetPassword: POST /auth/reset-password (email + code + newPassword)
 */

const forgetPasswordService = {
  /**
   * Request a reset code to be sent to the given email.
   * @param {string} email
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  requestCode: async (email) => {
    const response = await api.post('/auth/forgot-password', { email: email.trim() });
    return response.data;
  },

  /**
   * Reset password with email, 6-digit code, and new password.
   * @param {string} email
   * @param {string} code - 6 digits
   * @param {string} newPassword
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      email: email.trim(),
      code: String(code).replace(/\D/g, '').slice(0, 6),
      newPassword,
    });
    return response.data;
  },
};

export default forgetPasswordService;
