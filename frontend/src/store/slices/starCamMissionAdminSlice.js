import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import starCamMissionAdminServices from '../../services/starCamMissionAdminServices';
import {
  STARCAM_MAX_OBJECTS,
  isStarCamObjectCountInRange,
  countIncludedVocab,
  isVocabIncluded,
} from '../../constants/starCamMissionObjects';

export const fetchStarCamCategories = createAsyncThunk(
  'starCamMissionAdmin/fetchCategories',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.listCategories(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch Star Cam categories');
    }
  }
);

export const createStarCamCategory = createAsyncThunk(
  'starCamMissionAdmin/createCategory',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.createCategory(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to create Star Cam category');
    }
  }
);

export const fetchStarCamMissions = createAsyncThunk(
  'starCamMissionAdmin/fetchMissions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.listMissions(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch Star Cam missions');
    }
  }
);

export const createStarCamMission = createAsyncThunk(
  'starCamMissionAdmin/createMission',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.createMission(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to create Star Cam mission');
    }
  }
);

export const fetchStarCamMissionById = createAsyncThunk(
  'starCamMissionAdmin/fetchMissionById',
  async (missionId, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.getMission(missionId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch Star Cam mission');
    }
  }
);

export const updateStarCamMission = createAsyncThunk(
  'starCamMissionAdmin/updateMission',
  async ({ missionId, payload }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.updateMission(missionId, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to update Star Cam mission');
    }
  }
);

export const updateStarCamMissionItem = createAsyncThunk(
  'starCamMissionAdmin/updateMissionItem',
  async ({ missionId, sortOrder, payload }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.updateMissionItem(missionId, sortOrder, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to update Star Cam mission item');
    }
  }
);

export const deleteStarCamMissionItem = createAsyncThunk(
  'starCamMissionAdmin/deleteMissionItem',
  async ({ missionId, sortOrder }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.deleteMissionItem(missionId, sortOrder);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete Star Cam mission item');
    }
  }
);

export const addStarCamMissionVocabulary = createAsyncThunk(
  'starCamMissionAdmin/addMissionVocabulary',
  async ({ missionId, payload }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.addVocabulary(missionId, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to add Star Cam vocabulary');
    }
  }
);

export const updateStarCamMissionVocabulary = createAsyncThunk(
  'starCamMissionAdmin/updateMissionVocabulary',
  async ({ missionId, sortOrder, payload }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.updateVocabulary(missionId, sortOrder, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to update Star Cam vocabulary');
    }
  }
);

export const updateStarCamMissionVocabularyInclusion = createAsyncThunk(
  'starCamMissionAdmin/updateMissionVocabularyInclusion',
  async ({ missionId, sortOrder, isIncluded }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.updateVocabularyInclusion(missionId, sortOrder, isIncluded);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to update vocabulary inclusion');
    }
  }
);

export const deleteStarCamMissionVocabulary = createAsyncThunk(
  'starCamMissionAdmin/deleteMissionVocabulary',
  async ({ missionId, sortOrder }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.deleteVocabulary(missionId, sortOrder);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete Star Cam vocabulary');
    }
  }
);

export const uploadStarCamMissionImage = createAsyncThunk(
  'starCamMissionAdmin/uploadMissionImage',
  async ({ missionId, imageFile }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.uploadMissionImage(missionId, imageFile);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to upload mission image');
    }
  }
);

export const uploadStarCamMissionMedia = createAsyncThunk(
  'starCamMissionAdmin/uploadMissionMedia',
  async ({ missionId, shortVideoFile, missionIntroAudioFile, rewardAudioFile, rewardVideoFile }, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.uploadMissionMedia(missionId, {
        shortVideoFile,
        missionIntroAudioFile,
        rewardAudioFile,
        rewardVideoFile,
      });
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to upload mission media');
    }
  }
);

export const publishStarCamMission = createAsyncThunk(
  'starCamMissionAdmin/publishMission',
  async (missionId, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.publishMission(missionId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to publish Star Cam mission');
    }
  }
);

export const unpublishStarCamMission = createAsyncThunk(
  'starCamMissionAdmin/unpublishMission',
  async (missionId, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.unpublishMission(missionId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to unpublish Star Cam mission');
    }
  }
);

export const archiveStarCamMission = createAsyncThunk(
  'starCamMissionAdmin/archiveMission',
  async (missionId, { rejectWithValue }) => {
    try {
      const response = await starCamMissionAdminServices.archiveMission(missionId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive Star Cam mission');
    }
  }
);

const initialState = {
  categories: [],
  missions: [],
  currentMission: null,
  pagination: {
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    status: '',
    search: '',
    categoryId: '',
    page: 1,
    limit: 5,
  },
  loading: {
    categories: false,
    missions: false,
    missionDetails: false,
    mutating: false,
    inclusionTogglingSortOrder: null,
  },
  error: null,
  lastAction: null,
};

const setError = (state, action) => {
  state.error = action.payload || action.error?.message || 'Request failed';
};

const normalizeTarget = (value) => String(value || '').trim().toLowerCase();

const findVocabForItem = (vocab = [], item = {}) => {
  const target = normalizeTarget(item.target);
  if (!target) return null;
  return vocab.find((entry) => normalizeTarget(entry?.target) === target) || null;
};

const getDefaultQuestionText = (item = {}, vocab = null) => {
  const explicitQuestion = item.questionText || item.prompt || '';
  if (String(explicitQuestion).trim()) return explicitQuestion;
  const label = vocab?.displayText || vocab?.word || item.target || '';
  return label ? `Is this a ${label}?` : '';
};

const normalizeMissionItem = (item = {}, vocab = []) => {
  const matchingVocab = findVocabForItem(vocab, item);
  const questionText = getDefaultQuestionText(item, matchingVocab);
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

const hasVocabScanAudioSet = (vocab = []) => {
  const included = (vocab || []).filter((entry) => entry?.isIncluded !== false);
  return (
    Array.isArray(included) &&
    isStarCamObjectCountInRange(included.length) &&
    included.every((entry) => Boolean(entry?.target && (entry?.introAudio || entry?.audio) && entry?.tryAgainAudio && entry?.successAudio))
  );
};

const normalizeMission = (mission) => {
  if (!mission || typeof mission !== 'object') return mission;
  const vocab = Array.isArray(mission.vocab) ? mission.vocab : [];
  const vocabCount = Number(mission.vocabCount ?? vocab.length ?? 0);
  const includedCount = countIncludedVocab(vocab);
  const items = Array.isArray(mission.items)
    ? mission.items.map((item) => normalizeMissionItem(item, vocab))
    : mission.items;
  const hasMissionShortVideo = Boolean(mission.missionShortVideo?._id || mission.missionShortVideo);
  const hasMissionIntroAudio = Boolean(mission.missionIntroAudio?._id || mission.missionIntroAudio);
  const hasRewardAudio = Boolean(mission.rewardAudio?._id || mission.rewardAudio);
  const hasRewardVideo = Boolean(mission.rewardVideo?._id || mission.rewardVideo);
  const hasScanQuestionSet =
    (Array.isArray(items) &&
      items.length === includedCount &&
      isStarCamObjectCountInRange(includedCount) &&
      items.every((item) =>
        Boolean(item?.target && item?.questionText && item?.questionAudioUrl && item?.tryAgainText && item?.tryAgainAudioUrl && item?.successText && item?.successAudioUrl)
      )) ||
    hasVocabScanAudioSet(vocab);
  const scanCount = Array.isArray(items) && items.length > 0 ? items.length : includedCount;
  return {
    ...mission,
    items,
    includedCount,
    vocabCount,
    missionImageUrl: mission.missionImageUrl || mission.missionImage?.url || null,
    missionShortVideoUrl: mission.missionShortVideoUrl || mission.missionShortVideo?.url || null,
    missionIntroAudioUrl: mission.missionIntroAudioUrl || mission.missionIntroAudio?.url || null,
    rewardAudioUrl: mission.rewardAudioUrl || mission.rewardAudio?.url || null,
    rewardVideoUrl: mission.rewardVideoUrl || mission.rewardVideo?.url || null,
    mediaCompleteness: {
      hasMissionShortVideo,
      hasMissionIntroAudio,
      hasRewardAudio,
      hasRewardVideo,
      hasVocabSet: isStarCamObjectCountInRange(includedCount),
      hasScanQuestionSet,
      scanCount,
      includedCount,
      vocabCount,
    },
  };
};

const upsertMission = (state, mission) => {
  if (!mission || !mission._id) return;
  const idx = state.missions.findIndex((m) => m._id === mission._id);
  if (idx >= 0) {
    state.missions[idx] = normalizeMission(mission);
  } else {
    state.missions.unshift(normalizeMission(mission));
  }
};

const starCamMissionAdminSlice = createSlice({
  name: 'starCamMissionAdmin',
  initialState,
  reducers: {
    clearStarCamMissionAdminError: (state) => {
      state.error = null;
    },
    clearCurrentStarCamMission: (state) => {
      state.currentMission = null;
    },
    setStarCamMissionAdminFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetStarCamMissionAdminState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStarCamCategories.pending, (state) => {
        state.loading.categories = true;
        state.error = null;
      })
      .addCase(fetchStarCamCategories.fulfilled, (state, action) => {
        state.loading.categories = false;
        state.categories = action.payload?.data?.items || [];
        state.lastAction = 'fetchCategories';
      })
      .addCase(fetchStarCamCategories.rejected, (state, action) => {
        state.loading.categories = false;
        setError(state, action);
      })

      .addCase(createStarCamCategory.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createStarCamCategory.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const created = action.payload?.data;
        if (created?._id) state.categories.push(created);
        state.lastAction = 'createCategory';
      })
      .addCase(createStarCamCategory.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(fetchStarCamMissions.pending, (state) => {
        state.loading.missions = true;
        state.error = null;
      })
      .addCase(fetchStarCamMissions.fulfilled, (state, action) => {
        state.loading.missions = false;
        state.missions = (action.payload?.data?.items || []).map(normalizeMission);
        state.pagination = action.payload?.data?.pagination || initialState.pagination;
        state.lastAction = 'fetchMissions';
      })
      .addCase(fetchStarCamMissions.rejected, (state, action) => {
        state.loading.missions = false;
        setError(state, action);
      })

      .addCase(createStarCamMission.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createStarCamMission.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const created = action.payload?.data;
        if (created) upsertMission(state, created);
        state.currentMission = created || state.currentMission;
        state.lastAction = 'createMission';
      })
      .addCase(createStarCamMission.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(fetchStarCamMissionById.pending, (state) => {
        state.loading.missionDetails = true;
        state.error = null;
      })
      .addCase(fetchStarCamMissionById.fulfilled, (state, action) => {
        state.loading.missionDetails = false;
        const mission = normalizeMission(action.payload?.data) || null;
        state.currentMission = mission;
        if (mission) upsertMission(state, mission);
        state.lastAction = 'fetchMissionById';
      })
      .addCase(fetchStarCamMissionById.rejected, (state, action) => {
        state.loading.missionDetails = false;
        setError(state, action);
      })

      .addCase(updateStarCamMission.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateStarCamMission.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'updateMission';
      })
      .addCase(updateStarCamMission.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(updateStarCamMissionItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateStarCamMissionItem.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'updateMissionItem';
      })
      .addCase(updateStarCamMissionItem.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(deleteStarCamMissionItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteStarCamMissionItem.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'deleteMissionItem';
      })
      .addCase(deleteStarCamMissionItem.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(addStarCamMissionVocabulary.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(addStarCamMissionVocabulary.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = action.payload?.data;
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'addMissionVocabulary';
      })
      .addCase(addStarCamMissionVocabulary.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(updateStarCamMissionVocabulary.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateStarCamMissionVocabulary.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'updateMissionVocabulary';
      })
      .addCase(updateStarCamMissionVocabulary.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(updateStarCamMissionVocabularyInclusion.pending, (state, action) => {
        state.loading.inclusionTogglingSortOrder = action.meta?.arg?.sortOrder ?? null;
        state.error = null;
      })
      .addCase(updateStarCamMissionVocabularyInclusion.fulfilled, (state, action) => {
        state.loading.inclusionTogglingSortOrder = null;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'updateMissionVocabularyInclusion';
      })
      .addCase(updateStarCamMissionVocabularyInclusion.rejected, (state, action) => {
        state.loading.inclusionTogglingSortOrder = null;
        setError(state, action);
      })

      .addCase(deleteStarCamMissionVocabulary.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteStarCamMissionVocabulary.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'deleteMissionVocabulary';
      })
      .addCase(deleteStarCamMissionVocabulary.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(uploadStarCamMissionImage.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(uploadStarCamMissionImage.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'uploadMissionImage';
      })
      .addCase(uploadStarCamMissionImage.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(uploadStarCamMissionMedia.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(uploadStarCamMissionMedia.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = normalizeMission(action.payload?.data);
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'uploadMissionMedia';
      })
      .addCase(uploadStarCamMissionMedia.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(publishStarCamMission.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(publishStarCamMission.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = action.payload?.data;
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'publishMission';
      })
      .addCase(publishStarCamMission.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(unpublishStarCamMission.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(unpublishStarCamMission.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = action.payload?.data;
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'unpublishMission';
      })
      .addCase(unpublishStarCamMission.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })

      .addCase(archiveStarCamMission.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(archiveStarCamMission.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const mission = action.payload?.data;
        if (mission) {
          state.currentMission = mission;
          upsertMission(state, mission);
        }
        state.lastAction = 'archiveMission';
      })
      .addCase(archiveStarCamMission.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      });
  },
});

export const {
  clearStarCamMissionAdminError,
  clearCurrentStarCamMission,
  setStarCamMissionAdminFilters,
  resetStarCamMissionAdminState,
} = starCamMissionAdminSlice.actions;

export const selectStarCamMissionAdmin = (state) => state.starCamMissionAdmin;
export const selectStarCamMissionCategories = (state) => state.starCamMissionAdmin.categories;
export const selectStarCamMissions = (state) => state.starCamMissionAdmin.missions;
export const selectStarCamCurrentMission = (state) => state.starCamMissionAdmin.currentMission;
export const selectStarCamMissionPagination = (state) => state.starCamMissionAdmin.pagination;
export const selectStarCamMissionLoading = (state) => state.starCamMissionAdmin.loading;
export const selectStarCamMissionError = (state) => state.starCamMissionAdmin.error;

export default starCamMissionAdminSlice.reducer;

