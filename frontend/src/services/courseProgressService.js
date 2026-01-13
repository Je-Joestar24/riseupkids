import api from '../api/axios';

/**
 * Course Progress Service
 * 
 * Service for managing child course progress:
 * - Get all courses with progress for a child
 * - Get specific course progress
 * - Check course access
 * - Update content progress
 * - Mark course as completed
 */

const courseProgressService = {
  /**
   * Get all courses with progress for a child
   * @param {String} childId - Child's ID
   * @param {Object} params - Optional query parameters (status, isDefault)
   * @returns {Promise} API response with courses data
   */
  getChildCourses: async (childId, params = {}) => {
    try {
      const response = await api.get(`/course-progress/child/${childId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get course progress for a specific child and course
   * @param {String} courseId - Course's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with course progress data
   */
  getCourseProgress: async (courseId, childId) => {
    try {
      const response = await api.get(`/course-progress/${courseId}/child/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Check if child can access a course
   * @param {String} courseId - Course's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with access information
   */
  checkCourseAccess: async (courseId, childId) => {
    try {
      const response = await api.get(`/course-progress/${courseId}/access/${childId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Update course progress when content is completed
   * @param {String} courseId - Course's ID
   * @param {String} childId - Child's ID
   * @param {String} contentId - Content item's ID
   * @param {String} contentType - Content type ('activity', 'book', 'video', 'audioAssignment', 'chant')
   * @returns {Promise} API response with updated progress
   */
  updateContentProgress: async (courseId, childId, contentId, contentType) => {
    try {
      const response = await api.patch(`/course-progress/${courseId}/child/${childId}/content`, {
        contentId,
        contentType,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Mark course as completed manually
   * @param {String} courseId - Course's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with updated progress
   */
  markCourseCompleted: async (courseId, childId) => {
    try {
      const response = await api.post(`/course-progress/${courseId}/child/${childId}/complete`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },

  /**
   * Get course details with populated contents and child profile
   * @param {String} courseId - Course's ID
   * @param {String} childId - Child's ID
   * @returns {Promise} API response with course details, contents, child profile, and progress
   */
  getCourseDetailsForChild: async (courseId, childId) => {
    try {
      const response = await api.get(`/course-progress/${courseId}/child/${childId}/details`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  },
};

// Re-export videoWatchService methods for convenience
// Import videoWatchService separately for video watch operations

export default courseProgressService;
