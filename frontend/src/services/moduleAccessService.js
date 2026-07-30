import api from '../api/axios';

/**
 * Admin Module Access API
 * @see docs/ADMIN_MODULE_ACCESS_CONTROL_PLAN.md
 */
const moduleAccessService = {
  listChildren: async (params = {}) => {
    const response = await api.get('/admin/module-access', { params });
    return response.data;
  },

  getChildDetail: async (childId) => {
    const response = await api.get(`/admin/module-access/children/${childId}`);
    return response.data;
  },

  unlockModule: async (childId, courseId, note = '') => {
    const response = await api.post(
      `/admin/module-access/children/${childId}/courses/${courseId}/unlock`,
      { note }
    );
    return response.data;
  },

  lockModule: async (childId, courseId, note = '') => {
    const response = await api.post(
      `/admin/module-access/children/${childId}/courses/${courseId}/lock`,
      { note }
    );
    return response.data;
  },

  clearOverride: async (childId, courseId, note = '') => {
    const response = await api.post(
      `/admin/module-access/children/${childId}/courses/${courseId}/clear-override`,
      { note }
    );
    return response.data;
  },
};

export default moduleAccessService;
