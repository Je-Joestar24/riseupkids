import api from '../api/axios';

const BASE_PATH = '/admin/cms-books';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const sanitizePayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {};
  const safe = { ...payload };
  delete safe._id;
  delete safe.createdAt;
  delete safe.updatedAt;
  delete safe.createdBy;
  delete safe.updatedBy;
  return safe;
};

const cmsBookAdminService = {
  listBooks: async (params = {}) => {
    try {
      const response = await api.get(BASE_PATH, { params });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load CMS books');
    }
  },

  getBookById: async (bookId) => {
    try {
      const response = await api.get(`${BASE_PATH}/${bookId}`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load CMS book');
    }
  },

  createBook: async (payload) => {
    try {
      const response = await api.post(BASE_PATH, sanitizePayload(payload));
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to create CMS book');
    }
  },

  uploadBookMedia: async ({ file, mediaType, title, description }) => {
    try {
      if (!file) throw new Error('File is required');
      const formData = new FormData();
      formData.append('file', file);
      if (mediaType) formData.append('mediaType', mediaType);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      const response = await api.post(`${BASE_PATH}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to upload CMS book media');
    }
  },

  updateBook: async (bookId, payload) => {
    try {
      const response = await api.put(`${BASE_PATH}/${bookId}`, sanitizePayload(payload));
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update CMS book');
    }
  },

  publishBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/publish`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to publish CMS book');
    }
  },

  unpublishBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/unpublish`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to unpublish CMS book');
    }
  },

  archiveBook: async (bookId) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${bookId}/archive`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to archive CMS book');
    }
  },

  deleteBook: async (bookId) => {
    try {
      const response = await api.delete(`${BASE_PATH}/${bookId}`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to delete CMS book');
    }
  },
};

export default cmsBookAdminService;
