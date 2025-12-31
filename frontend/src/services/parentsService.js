import api from '../api/axios';

/**
 * Parents Service
 * 
 * Handles all parents-related API calls
 * For admin use only
 */

const parentsService = {
  /**
   * Get all parents with pagination, search, and filtering
   * @param {Object} params - Query parameters
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @param {String} params.search - Search term for name/email
   * @param {Boolean} params.isActive - Filter by active status
   * @param {String} params.subscriptionStatus - Filter by subscription status
   * @param {String} params.sortBy - Sort field (default: createdAt)
   * @param {String} params.sortOrder - Sort order (asc/desc, default: desc)
   * @returns {Promise} API response with parents data and pagination
   */
  getAllParents: async (params = {}) => {
    try {
      const response = await api.get('/parents', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get single parent by ID
   * @param {String} parentId - Parent's ID
   * @returns {Promise} API response with parent data
   */
  getParentById: async (parentId) => {
    try {
      const response = await api.get(`/parents/${parentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create new parent
   * @param {Object} parentData - Parent data
   * @param {String} parentData.name - Parent's name
   * @param {String} parentData.email - Parent's email
   * @param {String} parentData.password - Parent's password
   * @returns {Promise} API response with created parent data
   */
  createParent: async (parentData) => {
    try {
      const response = await api.post('/parents', parentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update parent
   * @param {String} parentId - Parent's ID
   * @param {Object} updateData - Data to update
   * @param {String} [updateData.name] - Parent's name
   * @param {String} [updateData.email] - Parent's email
   * @param {Boolean} [updateData.isActive] - Active status
   * @param {String} [updateData.subscriptionStatus] - Subscription status
   * @returns {Promise} API response with updated parent data
   */
  updateParent: async (parentId, updateData) => {
    try {
      const response = await api.put(`/parents/${parentId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Archive parent (soft delete)
   * @param {String} parentId - Parent's ID
   * @returns {Promise} API response with archived parent data
   */
  archiveParent: async (parentId) => {
    try {
      const response = await api.delete(`/parents/${parentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Restore archived parent
   * @param {String} parentId - Parent's ID
   * @returns {Promise} API response with restored parent data
   */
  restoreParent: async (parentId) => {
    try {
      const response = await api.put(`/parents/${parentId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default parentsService;

