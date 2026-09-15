import api from '../api/axios';
import { setAccessToken, clearAccessToken } from './tokenStore';

/**
 * Authentication Service
 *
 * Handles all authentication-related API calls.
 *
 * Chunk 9 (RUK-SEC-012(b)): the access token is held in memory only (services/tokenStore.js),
 * never in sessionStorage/localStorage — same for user/childProfiles/childProfile/parent, which
 * now live in Redux only. The refresh token is an httpOnly cookie the browser manages entirely on
 * its own; this file never touches it directly. A hard reload / new tab / reopened tab has none
 * of this in memory, which is expected — see bootstrapSession() below, called once at app boot,
 * which silently re-establishes the session from the cookie before anything protected renders.
 */

const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {String} userData.name - User's name
   * @param {String} userData.email - User's email
   * @param {String} userData.password - User's password
   * @returns {Promise} API response with user data and token
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      authService.persistSession(response.data.data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Store the access token from a login / verify-otp / register payload. Everything else
   * (user, childProfiles, childProfile, parent) is handled by the Redux thunk that called this —
   * it goes straight into store state, never into any browser storage.
   * @param {Object} data - { token, user, childProfiles?, childProfile?, parent? }
   */
  persistSession: (data) => {
    if (!data) return;
    if (data.token) {
      setAccessToken(data.token);
    }
  },

  /**
   * Login user
   * @param {String} email - User's email
   * @param {String} password - User's password
   * @returns {Promise} API response – either session data or { requiresOtp, email } for admins
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      // Admin OTP challenge: do not persist a session yet
      if (response.data.data?.requiresOtp) {
        return response.data;
      }

      authService.persistSession(response.data.data);

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Verify admin login OTP and establish session.
   * @param {String} email
   * @param {String} code - 6-digit code
   * @returns {Promise} API response with user data and token
   */
  verifyLoginOtp: async (email, code) => {
    try {
      const response = await api.post('/auth/verify-login-otp', {
        email: email.trim(),
        code: String(code).replace(/\D/g, '').slice(0, 6),
      });

      authService.persistSession(response.data.data);

      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Resend admin login OTP email.
   * @param {String} email
   * @returns {Promise} API response
   */
  resendLoginOtp: async (email) => {
    try {
      const response = await api.post('/auth/resend-login-otp', {
        email: email.trim(),
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get current authenticated user. Caller (the Redux thunk) puts the result in store state —
   * nothing here touches browser storage.
   * @returns {Promise} API response with current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Silently re-establish a session from the httpOnly refresh cookie — called once at app boot
   * (hard reload / new tab / reopened tab), since nothing about the session survives in memory
   * across those. Never throws: a visitor with no valid refresh cookie is a normal, expected
   * outcome (not logged in yet), not an error.
   * @returns {Promise<{ authenticated: boolean, user?: object, childProfiles?: object[] }>}
   */
  bootstrapSession: async () => {
    try {
      const refreshRes = await api.post('/auth/refresh');
      const newToken = refreshRes.data?.data?.token;
      if (!newToken) return { authenticated: false };
      setAccessToken(newToken);

      const meRes = await api.get('/auth/me');
      return {
        authenticated: true,
        user: meRes.data?.data?.user ?? null,
        childProfiles: meRes.data?.data?.childProfiles ?? null,
      };
    } catch (error) {
      clearAccessToken();
      return { authenticated: false };
    }
  },

  /**
   * Logout user
   * @returns {Promise} API response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      clearAccessToken();
      return response.data;
    } catch (error) {
      // Even if the API call fails, clear the in-memory token — the UI treats the user as
      // logged out either way.
      clearAccessToken();
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} API response with updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/update-profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Change password
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise} API response
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Request parent account deletion (revokes access immediately).
   * @param {{ password: string, confirmText: string }} payload
   */
  deleteAccount: async ({ password, confirmText }) => {
    try {
      const response = await api.post('/auth/delete-account', {
        password,
        confirmText,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get Terms & Conditions content (public).
   * Used by TermsConditionServicesModal to display terms text.
   * @returns {Promise<{ content: string }>} API response data with content
   */
  getTermsContent: async () => {
    const response = await api.get('/auth/terms');
    return response.data?.data ?? { content: '' };
  },

  /**
   * Soft logout - clears only the child-selection context (session/user stay intact — they're
   * held in memory/Redux, not sessionStorage, so there's nothing else to clear here).
   * Used when switching from child view to parent dashboard.
   */
  softLogout: () => {
    sessionStorage.removeItem('selectedChildId');
    sessionStorage.removeItem('selectedChild');
  },
};

export default authService;

