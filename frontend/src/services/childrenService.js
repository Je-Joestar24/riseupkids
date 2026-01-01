import api from '../api/axios';

/**
 * Children Service
 * 
 * Handles all children-related API calls
 * For parent use only
 */

const childrenService = {
  /**
   * Get all children of logged-in parent
   * @param {Object} params - Query parameters
   * @param {Boolean} params.isActive - Filter by active status
   * @returns {Promise} API response with children data
   */
  getAllChildren: async (params = {}) => {
    try {
      const response = await api.get('/children', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get single child by ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with child data
   */
  getChildById: async (childId) => {
    try {
      const response = await api.get(`/children/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create new child profile
   * @param {Object} childData - Child data
   * @param {String} childData.displayName - Child's display name (required)
   * @param {Number} [childData.age] - Child's age (0-18)
   * @param {String} [childData.avatar] - Avatar file path or URL
   * @param {String} [childData.currentJourney] - Current journey ID
   * @param {String} [childData.currentLesson] - Current lesson ID
   * @param {Object} [childData.preferences] - Child preferences
   * @returns {Promise} API response with created child data
   */
  createChild: async (childData) => {
    try {
      const response = await api.post('/children', childData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update child profile
   * @param {String} childId - Child's ID
   * @param {Object} updateData - Data to update
   * @param {String} [updateData.displayName] - Child's display name
   * @param {Number} [updateData.age] - Child's age (0-18)
   * @param {String} [updateData.avatar] - Avatar file path or URL
   * @param {String} [updateData.currentJourney] - Current journey ID
   * @param {String} [updateData.currentLesson] - Current lesson ID
   * @param {Object} [updateData.preferences] - Child preferences
   * @param {Boolean} [updateData.isActive] - Active status
   * @returns {Promise} API response with updated child data
   */
  updateChild: async (childId, updateData) => {
    try {
      const response = await api.put(`/children/${childId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Delete child profile (soft delete)
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with deleted child data
   */
  deleteChild: async (childId) => {
    try {
      const response = await api.delete(`/children/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Restore archived child profile
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with restored child data
   */
  restoreChild: async (childId) => {
    try {
      const response = await api.put(`/children/${childId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default childrenService;

