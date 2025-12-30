import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  updateProfile,
  changePassword,
  clearError,
} from '../store/slices/userSlice';
import { showNotification } from '../store/slices/uiSlice';

/**
 * Custom hook for user authentication
 * 
 * Provides easy access to user state and authentication methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, loading, error, childProfiles, childProfile, parent } = useSelector(
    (state) => state.user
  );

  /**
   * Login user
   * @param {String} email - User email
   * @param {String} password - User password
   * @returns {Promise} Login result
   */
  const login = async (email, password) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      
      // Show success notification
      dispatch(showNotification({
        message: 'Login successful!',
        type: 'success',
      }));
      
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
      
      // Show success notification
      dispatch(showNotification({
        message: 'Password changed successfully!',
        type: 'success',
      }));
      
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
    // Methods
    login,
    register,
    logout,
    fetchCurrentUser,
    updateUserProfile,
    changeUserPassword,
    clearUserError,
  };
};

export default useAuth;

