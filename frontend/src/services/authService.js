import api from '../api/axios';

/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls
 * Uses sessionStorage for token and user data
 */

const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {String} userData.name - User's name
   * @param {String} userData.email - User's email
   * @param {String} userData.password - User's password
   * @param {String} userData.role - User's role (admin, parent, child)
   * @param {String} [userData.linkedParent] - Parent ID (required if role is child)
   * @returns {Promise} API response with user data and token
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      // Save token and user to sessionStorage
      if (response.data.data?.token) {
        sessionStorage.setItem('token', response.data.data.token);
      }
      if (response.data.data?.user) {
        sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Login user
   * @param {String} email - User's email
   * @param {String} password - User's password
   * @returns {Promise} API response with user data and token
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Save token and user to sessionStorage
      if (response.data.data?.token) {
        sessionStorage.setItem('token', response.data.data.token);
      }
      if (response.data.data?.user) {
        sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      // Save additional data if available
      if (response.data.data?.childProfiles) {
        sessionStorage.setItem('childProfiles', JSON.stringify(response.data.data.childProfiles));
      }
      if (response.data.data?.childProfile) {
        sessionStorage.setItem('childProfile', JSON.stringify(response.data.data.childProfile));
      }
      if (response.data.data?.parent) {
        sessionStorage.setItem('parent', JSON.stringify(response.data.data.parent));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get current authenticated user
   * @returns {Promise} API response with current user data
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      
      // Update user in sessionStorage
      if (response.data.data?.user) {
        sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      // Update additional data if available
      if (response.data.data?.childProfiles) {
        sessionStorage.setItem('childProfiles', JSON.stringify(response.data.data.childProfiles));
      }
      if (response.data.data?.childProfile) {
        sessionStorage.setItem('childProfile', JSON.stringify(response.data.data.childProfile));
      }
      if (response.data.data?.parent) {
        sessionStorage.setItem('parent', JSON.stringify(response.data.data.parent));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Logout user
   * @returns {Promise} API response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      
      // Clear sessionStorage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('childProfiles');
      sessionStorage.removeItem('childProfile');
      sessionStorage.removeItem('parent');
      
      return response.data;
    } catch (error) {
      // Even if API call fails, clear local storage
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('childProfiles');
      sessionStorage.removeItem('childProfile');
      sessionStorage.removeItem('parent');
      
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
      
      // Update user in sessionStorage
      if (response.data.data?.user) {
        sessionStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
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
   * Get user from sessionStorage
   * @returns {Object|null} User object or null
   */
  getUserFromStorage: () => {
    try {
      const user = sessionStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get token from sessionStorage
   * @returns {String|null} Token or null
   */
  getTokenFromStorage: () => {
    return sessionStorage.getItem('token');
  },

  /**
   * Check if user is authenticated
   * @returns {Boolean} True if token exists
   */
  isAuthenticated: () => {
    return !!sessionStorage.getItem('token');
  },
};

export default authService;

