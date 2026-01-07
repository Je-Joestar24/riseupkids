import api from '../api/axios';

/**
 * Course Service
 * 
 * Service for managing Course/Content Collection resources:
 * - Create courses with mixed content types (Activities, Books, Videos, Audio Assignments)
 * - List courses with pagination, search, and filters
 * - Get course by ID with populated contents
 * - Update course (title, description, coverImage, isPublished, tags, contents reordering)
 * - Delete course
 * 
 * All methods handle multipart/form-data for file uploads (cover images)
 */

const courseService = {
  /**
   * Get all courses with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {Boolean} params.isPublished - Filter by published status
   * @param {Boolean} params.isArchived - Filter by archived status (default: false - excludes archived)
   * @param {String} params.search - Search in title/description
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @returns {Promise} API response with courses data and pagination
   */
  getAllCourses: async (params = {}) => {
    try {
      const response = await api.get('/courses', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Create new course with optional cover image and contents
   * @param {FormData} formData - Course data with files
   * @returns {Promise} API response with created course data
   */
  createCourse: async (formData) => {
    try {
      const response = await api.post('/courses', formData, {
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
   * Get single course by ID with populated contents
   * @param {String} courseId - Course's ID
   * @returns {Promise} API response with course data
   */
  getCourseById: async (courseId) => {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update course
   * @param {String} courseId - Course's ID
   * @param {FormData} formData - Course data with optional files
   * @returns {Promise} API response with updated course data
   */
  updateCourse: async (courseId, formData) => {
    try {
      const response = await api.put(`/courses/${courseId}`, formData, {
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
   * Archive course (soft delete)
   * @param {String} courseId - Course's ID
   * @returns {Promise} API response
   */
  archiveCourse: async (courseId) => {
    try {
      const response = await api.patch(`/courses/${courseId}/archive`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Unarchive course (restore)
   * @param {String} courseId - Course's ID
   * @returns {Promise} API response
   */
  unarchiveCourse: async (courseId) => {
    try {
      const response = await api.patch(`/courses/${courseId}/unarchive`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Delete course (permanent hard delete)
   * @param {String} courseId - Course's ID
   * @returns {Promise} API response
   */
  deleteCourse: async (courseId) => {
    try {
      const response = await api.delete(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

export default courseService;

