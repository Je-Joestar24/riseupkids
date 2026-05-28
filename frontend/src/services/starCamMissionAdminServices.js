import api from '../api/axios';

const BASE_PATH = '/admin/star-cam/missions';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const normalizeTarget = (value) => String(value || '').trim().toLowerCase();

const findVocabForItem = (vocab = [], item = {}) => {
  const target = normalizeTarget(item.target);
  if (!target) return null;
  return vocab.find((entry) => normalizeTarget(entry?.target) === target) || null;
};

const buildDefaultQuestionText = (item = {}, vocab = null) => {
  const explicitQuestion = item.questionText || item.prompt || '';
  if (String(explicitQuestion).trim()) return explicitQuestion;
  const label = vocab?.displayText || vocab?.word || item.target || '';
  return label ? `Is this a ${label}?` : '';
};

const normalizeMissionItem = (item = {}, vocab = []) => {
  const matchingVocab = findVocabForItem(vocab, item);
  const questionText = buildDefaultQuestionText(item, matchingVocab);
  const tryAgainText = item.tryAgainText || item.fail || '';
  const successText = item.successText || item.success || '';

  return {
    ...item,
    prompt: item.prompt || questionText,
    questionText,
    questionAudioUrl: item.questionAudio?.url || matchingVocab?.introAudio?.url || matchingVocab?.audio?.url || null,
    fail: item.fail || tryAgainText,
    tryAgainText,
    tryAgainAudioUrl: item.tryAgainAudio?.url || matchingVocab?.tryAgainAudio?.url || null,
    success: item.success || successText,
    successText,
    successAudioUrl: item.successAudio?.url || matchingVocab?.successAudio?.url || null,
  };
};

const hasVocabScanAudioSet = (vocab = []) =>
  Array.isArray(vocab) &&
  vocab.length === 7 &&
  vocab.every((entry) => Boolean(entry?.target && (entry?.introAudio || entry?.audio) && entry?.tryAgainAudio && entry?.successAudio));

const normalizeMission = (mission) => {
  if (!mission || typeof mission !== 'object') return mission;
  const vocab = Array.isArray(mission.vocab) ? mission.vocab : [];
  const items = Array.isArray(mission.items)
    ? mission.items.map((item) => normalizeMissionItem(item, vocab))
    : mission.items;
  const hasScanQuestionSet =
    (Array.isArray(items) &&
      items.length === 7 &&
      items.every((item) =>
        Boolean(item?.target && item?.questionText && item?.questionAudioUrl && item?.tryAgainText && item?.tryAgainAudioUrl && item?.successText && item?.successAudioUrl)
      )) ||
    hasVocabScanAudioSet(vocab);
  const scanCount = Array.isArray(items) && items.length > 0 ? items.length : Math.min(vocab.length, 7);

  return {
    ...mission,
    items,
    missionImageUrl: mission.missionImageUrl || mission.missionImage?.url || null,
    missionShortVideoUrl: mission.missionShortVideo?.url || null,
    rewardAudioUrl: mission.rewardAudio?.url || null,
    rewardVideoUrl: mission.rewardVideo?.url || null,
    mediaCompleteness: {
      ...mission.mediaCompleteness,
      hasScanQuestionSet,
      scanCount,
    },
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

  updateMissionItem: async (id, sortOrder, payload = {}) => {
    try {
      const response = await api.patch(`${BASE_PATH}/${id}/items/${sortOrder}`, {
        ...payload,
        questionText: payload.questionText ?? payload.prompt,
        tryAgainText: payload.tryAgainText ?? payload.fail,
        successText: payload.successText ?? payload.success,
      });
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update mission item');
    }
  },

  deleteMissionItem: async (id, sortOrder) => {
    try {
      const response = await api.delete(`${BASE_PATH}/${id}/items/${sortOrder}`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to delete mission item');
    }
  },

  addVocabulary: async (id, { displayText, target, imageFile, audioFile, introAudioFile, tryAgainAudioFile, successAudioFile, pronunciationVideoFile }) => {
    const formData = new FormData();
    formData.append('displayText', displayText || '');
    formData.append('target', target || '');
    if (imageFile) formData.append('image', imageFile);
    if (audioFile) formData.append('audio', audioFile);
    if (introAudioFile) formData.append('introAudio', introAudioFile);
    if (tryAgainAudioFile) formData.append('tryAgainAudio', tryAgainAudioFile);
    if (successAudioFile) formData.append('successAudio', successAudioFile);
    if (pronunciationVideoFile) formData.append('pronunciationVideo', pronunciationVideoFile);

    try {
      const response = await api.post(`${BASE_PATH}/${id}/vocab`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to add vocabulary');
    }
  },

  updateVocabulary: async (id, sortOrder, { displayText, target, imageFile, audioFile, introAudioFile, tryAgainAudioFile, successAudioFile, pronunciationVideoFile }) => {
    const formData = new FormData();
    if (displayText !== undefined) formData.append('displayText', displayText || '');
    if (target !== undefined) formData.append('target', target || '');
    if (imageFile) formData.append('image', imageFile);
    if (audioFile) formData.append('audio', audioFile);
    if (introAudioFile) formData.append('introAudio', introAudioFile);
    if (tryAgainAudioFile) formData.append('tryAgainAudio', tryAgainAudioFile);
    if (successAudioFile) formData.append('successAudio', successAudioFile);
    if (pronunciationVideoFile) formData.append('pronunciationVideo', pronunciationVideoFile);

    try {
      const response = await api.patch(`${BASE_PATH}/${id}/vocab/${sortOrder}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to update vocabulary');
    }
  },

  deleteVocabulary: async (id, sortOrder) => {
    try {
      const response = await api.delete(`${BASE_PATH}/${id}/vocab/${sortOrder}`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to delete vocabulary');
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

  uploadMissionMedia: async (id, { shortVideoFile, rewardAudioFile, rewardVideoFile }) => {
    const formData = new FormData();
    if (shortVideoFile) formData.append('shortVideo', shortVideoFile);
    if (rewardAudioFile) formData.append('rewardAudio', rewardAudioFile);
    if (rewardVideoFile) formData.append('rewardVideo', rewardVideoFile);
    try {
      const response = await api.post(`${BASE_PATH}/${id}/mission-media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to upload mission media');
    }
  },

  publishMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/publish`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to publish Star Cam mission');
    }
  },

  unpublishMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/unpublish`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to unpublish Star Cam mission');
    }
  },

  archiveMission: async (id) => {
    try {
      const response = await api.post(`${BASE_PATH}/${id}/archive`);
      return {
        ...response.data,
        data: normalizeMission(response.data?.data),
      };
    } catch (error) {
      throw getErrorMessage(error, 'Failed to archive Star Cam mission');
    }
  },
};

export default starCamMissionAdminServices;

