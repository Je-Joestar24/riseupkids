import api from '../api/axios';

/**
 * Teachers Service
 *
 * Handles all teachers-related API calls
 * For admin use only
 */

const teacherService = {
  /**
   * Get all teachers with pagination, search, and filtering
   * @param {Object} params - Query parameters
   * @param {Number} params.page - Page number (default: 1)
   * @param {Number} params.limit - Items per page (default: 10)
   * @param {String} params.search - Search term for name/email
   * @param {Boolean} params.isActive - Filter by active status
   * @param {String} params.sortBy - Sort field (default: createdAt)
   * @param {String} params.sortOrder - Sort order (asc/desc, default: desc)
   * @returns {Promise} API response with teachers data and pagination
   */
  getAllTeachers: async (params = {}) => {
    try {
      const response = await api.get('/teachers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Get single teacher by ID
   * @param {String} teacherId - Teacher's ID
   * @returns {Promise} API response with teacher data
   */
  getTeacherById: async (teacherId) => {
    try {
      const response = await api.get(`/teachers/${teacherId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Create new teacher
   * @param {Object} teacherData - Teacher data
   * @param {String} teacherData.name - Teacher name
   * @param {String} teacherData.email - Teacher email
   * @param {String} teacherData.password - Teacher password
   * @returns {Promise} API response with created teacher
   */
  createTeacher: async (teacherData) => {
    try {
      const response = await api.post('/teachers', teacherData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Update teacher
   * @param {String} teacherId - Teacher ID
   * @param {Object} updateData - Data to update
   * @param {String} [updateData.name] - Teacher name
   * @param {String} [updateData.email] - Teacher email
   * @param {Boolean} [updateData.isActive] - Active status
   * @returns {Promise} API response with updated teacher
   */
  updateTeacher: async (teacherId, updateData) => {
    try {
      const response = await api.put(`/teachers/${teacherId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Archive teacher (soft delete)
   * @param {String} teacherId - Teacher ID
   * @returns {Promise} API response with archived teacher
   */
  archiveTeacher: async (teacherId) => {
    try {
      const response = await api.delete(`/teachers/${teacherId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  /**
   * Restore archived teacher
   * @param {String} teacherId - Teacher ID
   * @returns {Promise} API response with restored teacher
   */
  restoreTeacher: async (teacherId) => {
    try {
      const response = await api.put(`/teachers/${teacherId}/restore`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default teacherService;

