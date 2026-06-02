import api from '../api/axios';

const lessonPlanManagementService = {
  getModules: async (params = {}) => {
    try {
      const response = await api.get('/admin/program-lesson-plans/modules', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to load modules';
    }
  },

  getCourseLessonPlans: async (courseId, params = {}) => {
    try {
      const response = await api.get(`/admin/program-lesson-plans/modules/${courseId}/lesson-plans`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to load lesson plans';
    }
  },

  addCourseLessonPlan: async (courseId, { title, description, pdfFile, coverImage }) => {
    const formData = new FormData();
    formData.append('title', title || '');
    if (description) formData.append('description', description);
    if (pdfFile) formData.append('pdfFile', pdfFile);
    if (coverImage) formData.append('coverImage', coverImage);

    try {
      const response = await api.post(
        `/admin/program-lesson-plans/modules/${courseId}/lesson-plans`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to add lesson plan';
    }
  },

  getCourseLessonPlanById: async (courseId, lessonPlanId) => {
    try {
      const response = await api.get(`/admin/program-lesson-plans/modules/${courseId}/lesson-plans/${lessonPlanId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to load lesson plan';
    }
  },

  updateCourseLessonPlan: async (courseId, lessonPlanId, { title, description, pdfFile, coverImage }) => {
    const formData = new FormData();
    formData.append('title', title || '');
    if (description !== undefined) formData.append('description', description || '');
    if (pdfFile) formData.append('pdfFile', pdfFile);
    if (coverImage) formData.append('coverImage', coverImage);

    try {
      const response = await api.put(
        `/admin/program-lesson-plans/modules/${courseId}/lesson-plans/${lessonPlanId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to update lesson plan';
    }
  },

  deleteCourseLessonPlan: async (courseId, lessonPlanId) => {
    try {
      const response = await api.delete(`/admin/program-lesson-plans/modules/${courseId}/lesson-plans/${lessonPlanId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Failed to delete lesson plan';
    }
  },
};

export default lessonPlanManagementService;
