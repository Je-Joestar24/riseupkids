import api from '../api/axios';

/**
 * Activity Service
 * 
 * Handles all activity-related API calls
 * For admin use only
 */

const activityService = {
  /**
   * Get all activities with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {String} params.type - Filter by activity type
   * @param {Boolean} params.isPublished - Filter by published status
   * @param {String} params.search - Search in title/description
   * @param {Number} params.page - Page number
   * @param {Number} params.limit - Items per page
   * @returns {Promise} API response with activities data
   */
  getAllActivities: async (params = {}) => {
    try {
      const response = await api.get('/activities', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create new activity with file uploads
   * @param {FormData} formData - Activity data with files
   * @returns {Promise} API response with created activity data
   */
  createActivity: async (formData) => {
    try {
      const response = await api.post('/activities', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default activityService;

