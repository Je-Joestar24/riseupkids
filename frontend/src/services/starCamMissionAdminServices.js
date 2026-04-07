import api from '../api/axios';

const BASE_PATH = '/admin/star-cam/missions';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeMission = (mission) => {
  if (!mission || typeof mission !== 'object') return mission;
  return {
    ...mission,
    missionImageUrl: mission.missionImageUrl || mission.missionImage?.url || null,
  };
};

const starCamMissionAdminServices = {
  listCategories: async (params = {}) => {
    try {
      const response = await api.get(`${BASE_PATH}/categories`, { params });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load Star Cam categories');
    }
  },

  createCategory: async ({ key, name, description, sortOrder, isActive }) => {
    try {
      const response = await api.post(`${BASE_PATH}/categories`, {
        key,
        name,
        description,
        sortOrder,
        isActive,
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to create Star Cam category');
    }
  },

  listMissions: async (params = {}) => {
    try {
      const response = await api.get(BASE_PATH, { params });
      return {
        ...response.data,
        data: {
          ...response.data?.data,
          items: Array.isArray(response.data?.data?.items)
            ? response.data.data.items.map(normalizeMission)
            : [],
        },
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load Star Cam missions');
    }
  },

  createMission: async ({ missionId, title, categoryId }) => {
    try {
      const response = await api.post(BASE_PATH, { missionId, title, categoryId });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to create Star Cam mission');
    }
  },

  getMission: async (id) => {
    try {
      const response = await api.get(`${BASE_PATH}/${id}`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to load Star Cam mission');
    }
  },

  updateMission: async (id, payload = {}) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${id}`, payload);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update Star Cam mission');
    }
  },

  addVocabulary: async (id, { displayText, target, imageFile, audioFile }) => {
    const formData = new FormData();
    formData.append('displayText', displayText || '');
    formData.append('target', target || '');
    if (imageFile) formData.append('image', imageFile);
    if (audioFile) formData.append('audio', audioFile);

    try {
      const response = await api.post(`${BASE_PATH}/${id}/vocab`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to add vocabulary');
    }
  },

  uploadMissionImage: async (id, imageFile) => {
    const formData = new FormData();
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await api.post(`${BASE_PATH}/${id}/mission-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to upload mission image');
    }
  },

  publishMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/publish`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to publish Star Cam mission');
    }
  },

  unpublishMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/unpublish`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to unpublish Star Cam mission');
    }
  },

  archiveMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/archive`);
      return response.data;
    } catch (error) {
      throw getErrorMessage(error, 'Failed to archive Star Cam mission');
    }
  },
};

export default starCamMissionAdminServices;

