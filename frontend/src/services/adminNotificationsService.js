import api from '../api/axios';

const BASE = '/admin/notifications';

const unwrapError = (error, fallback) => {
  const message = error.response?.data?.message || error.message || fallback;
  const err = new Error(message);
  err.status = error.response?.status;
  throw err;
};

const adminNotificationsService = {
  getMeta: async () => {
    try {
      const response = await api.get(`${BASE}/meta`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to load notification settings');
    }
  },

  list: async (params = {}) => {
    try {
      const response = await api.get(BASE, { params });
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to load notification campaigns');
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${BASE}/${id}`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to load notification campaign');
    }
  },

  create: async (payload) => {
    try {
      const response = await api.post(BASE, payload);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to create notification campaign');
    }
  },

  update: async (id, payload) => {
    try {
      const response = await api.patch(`${BASE}/${id}`, payload);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to update notification campaign');
    }
  },

  duplicate: async (id) => {
    try {
      const response = await api.post(`${BASE}/${id}/duplicate`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to duplicate notification campaign');
    }
  },

  preview: async (id, language) => {
    try {
      const response = await api.get(`${BASE}/${id}/preview`, { params: { language } });
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to preview notification campaign');
    }
  },

  getAnalytics: async (id) => {
    try {
      const response = await api.get(`${BASE}/${id}/analytics`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to load notification analytics');
    }
  },

  getDashboard: async (params = {}) => {
    try {
      const response = await api.get(`${BASE}/dashboard`, { params });
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to load notification dashboard');
    }
  },

  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post(`${BASE}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to upload notification image');
    }
  },

  deleteImage: async (mediaId) => {
    try {
      const response = await api.delete(`${BASE}/images/${mediaId}`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to delete notification image');
    }
  },

  schedule: async (id, payload) => {
    try {
      const response = await api.post(`${BASE}/${id}/schedule`, payload);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to schedule notification campaign');
    }
  },

  cancel: async (id) => {
    try {
      const response = await api.post(`${BASE}/${id}/cancel`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to cancel notification campaign');
    }
  },

  sendNow: async (id) => {
    try {
      const response = await api.post(`${BASE}/${id}/send-now`);
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to send notification campaign');
    }
  },

  sendTest: async (id, userId) => {
    try {
      const response = await api.post(`${BASE}/${id}/test`, userId ? { userId } : {});
      return response.data;
    } catch (error) {
      unwrapError(error, 'Failed to send test notification');
    }
  },
};

export default adminNotificationsService;
