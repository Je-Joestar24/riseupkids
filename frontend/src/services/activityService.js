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

  /**
   * Get single activity by ID
   * @param {String} activityId - Activity's ID
   * @returns {Promise} API response with activity data
   */
  getActivityById: async (activityId) => {
    try {
      const response = await api.get(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update activity
   * @param {String} activityId - Activity's ID
   * @param {FormData} formData - Activity data with optional cover image
   * @returns {Promise} API response with updated activity data
   */
  updateActivity: async (activityId, formData) => {
    try {
      const response = await api.put(`/activities/${activityId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Archive activity
   * @param {String} activityId - Activity's ID
   * @returns {Promise} API response with archived activity data
   */
  archiveActivity: async (activityId) => {
    try {
      const response = await api.delete(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Restore archived activity
   * @param {String} activityId - Activity's ID
   * @returns {Promise} API response with restored activity data
   */
  restoreActivity: async (activityId) => {
    try {
      const response = await api.patch(`/activities/${activityId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default activityService;

