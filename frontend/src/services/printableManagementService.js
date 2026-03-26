import api from '../api/axios';

/**
 * Printable Management Service (Admin)
 *
 * Handles backend calls for program materials admin management.
 */
const printableManagementService = {
  /**
   * Get paginated/searchable module list with printable summary.
   */
  getModules: async (params = {}) => {
    try {
      const response = await api.get('/admin/program-materials/modules', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to load modules';
    }
  },

  /**
   * Get printable items inside a module/course.
   */
  getCoursePrintables: async (courseId, params = {}) => {
    try {
      const response = await api.get(`/admin/program-materials/modules/${courseId}/printables`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to load printable materials';
    }
  },

  /**
   * Add printable material to a module/course.
   * Expects:
   * - title (required)
   * - description (optional)
   * - pdfFile (required, File)
   * - coverImage (optional, File)
   */
  addCoursePrintable: async (courseId, { title, description, pdfFile, coverImage }) => {
    const formData = new FormData();
    formData.append('title', title || '');
    if (description) formData.append('description', description);
    if (pdfFile) formData.append('pdfFile', pdfFile);
    if (coverImage) formData.append('coverImage', coverImage);

    try {
      const response = await api.post(
        `/admin/program-materials/modules/${courseId}/printables`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to add printable material';
    }
  },
};

export default printableManagementService;

