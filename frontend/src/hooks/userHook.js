import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginUser,
  verifyLoginOtpUser,
  verifyLoginTwoFactorUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  updateProfile,
  changePassword,
  clearError,
} from '../store/slices/userSlice';
import { showNotification } from '../store/slices/uiSlice';
import authService from '../services/authService';

/**
 * Custom hook for user authentication
 *
 * Provides easy access to user state and authentication methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    childProfiles,
    childProfile,
    parent,
    twoFactorEnrollmentRequired,
  } = useSelector((state) => state.user);
  // Chunk 9: session bootstrap on cold load now happens exactly once, at the router root (see
  // router/AppRouter.jsx's bootstrapSession() dispatch) — no reactive "fetch user if we have a
  // token" effect needed here anymore, since token/user always arrive together now.

  /**
   * Login user
   * @param {String} email - User email
   * @param {String} password - User password
   * @returns {Promise} Login result (may include requiresOtp for admins)
   */
  const login = async (email, password) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();

      // Don't show success notification - user will be redirected immediately
      // Navigation is handled by the component

      return result;
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Login failed. Please check your credentials.',
        type: 'error',
      }));

      throw error;
    }
  };

  /**
   * Verify admin login OTP and establish session
   * @param {String} email
   * @param {String} code
   * @returns {Promise} Session result
   */
  const verifyLoginOtp = async (email, code) => {
    try {
      const result = await dispatch(verifyLoginOtpUser({ email, code })).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Invalid or expired verification code',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Complete login with a TOTP code (or a recovery code) — any role, whenever 2FA is enabled
   * @param {String} email
   * @param {String} code
   * @returns {Promise} Session result
   */
  const verifyLoginTwoFactor = async (email, code) => {
    try {
      const result = await dispatch(verifyLoginTwoFactorUser({ email, code })).unwrap();
      return result;
    } catch (error) {
      dispatch(showNotification({
        message: error || 'Invalid verification code',
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Resend admin login OTP
   * @param {String} email
   * @returns {Promise}
   */
  const resendLoginOtp = async (email) => {
    try {
      const result = await authService.resendLoginOtp(email);
      dispatch(showNotification({
        message: result?.message || 'A new verification code has been sent to your email.',
        type: 'success',
      }));
      return result;
    } catch (error) {
      const message =
        error?.message || (typeof error === 'string' ? error : 'Unable to resend verification code');
      dispatch(showNotification({
        message,
        type: 'error',
      }));
      throw error;
    }
  };

  /**
   * Register user
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration result
   */
  const register = async (userData) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      
      // Show success notification
      dispatch(showNotification({
        message: 'Registration successful!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Registration failed. Please try again.',
        type: 'error',
      }));
      
      throw error;
    }
  };

  /**
   * Logout user
   * @returns {Promise} Logout result
   */
  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      
      // Show success notification
      dispatch(showNotification({
        message: 'Logged out successfully',
        type: 'success',
      }));
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      // Even if API call fails, clear state and navigate
      navigate('/login');
    }
  };

  /**
   * Get current user data
   * @returns {Promise} Current user data
   */
  const fetchCurrentUser = async () => {
    try {
      const result = await dispatch(getCurrentUser()).unwrap();
      return result;
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Failed to load user data',
        type: 'error',
      }));
      
      throw error;
    }
  };

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Update result
   */
  const updateUserProfile = async (profileData) => {
    try {
      const result = await dispatch(updateProfile(profileData)).unwrap();
      
      // Show success notification
      dispatch(showNotification({
        message: 'Profile updated successfully!',
        type: 'success',
      }));
      
      return result;
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Failed to update profile',
        type: 'error',
      }));
      
      throw error;
    }
  };

  /**
   * Change password
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise} Change password result
   */
  const changeUserPassword = async (currentPassword, newPassword) => {
    try {
      const result = await dispatch(changePassword({ currentPassword, newPassword })).unwrap();

      // Chunk 9: the backend now revokes every session (including this one) on a password
      // change, for security — the current access token stops working on its very next use.
      // Clear the local session and send the user back to login here too, so that's a clean,
      // expected redirect rather than a surprise 401 the next time they click something.
      dispatch(showNotification({
        message: result?.message || 'Password changed successfully. Please log in again.',
        type: 'success',
      }));
      await dispatch(logoutUser());
      navigate('/login');

      return result;
    } catch (error) {
      // Show error notification
      dispatch(showNotification({
        message: error || 'Failed to change password',
        type: 'error',
      }));
      
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearUserError = () => {
    dispatch(clearError());
  };

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,
    childProfiles,
    childProfile,
    parent,
    twoFactorEnrollmentRequired,
    // Methods
    login,
    verifyLoginOtp,
    verifyLoginTwoFactor,
    resendLoginOtp,
    register,
    logout,
    fetchCurrentUser,
    updateUserProfile,
    changeUserPassword,
    clearUserError,
  };
};

export default useAuth;

