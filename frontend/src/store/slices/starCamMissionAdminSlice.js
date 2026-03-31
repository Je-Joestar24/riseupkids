import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import starCamMissionAdminServices from '../../services/starCamMissionAdminServices';

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
  },
  error: null,
  lastAction: null,
};

const setError = (state, action) => {
  state.error = action.payload || action.error?.message || 'Request failed';
};

const upsertMission = (state, mission) => {
  if (!mission || !mission._id) return;
  const idx = state.missions.findIndex((m) => m._id === mission._id);
  if (idx >= 0) {
    state.missions[idx] = mission;
  } else {
    state.missions.unshift(mission);
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
        state.missions = action.payload?.data?.items || [];
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
        const mission = action.payload?.data || null;
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
        const mission = action.payload?.data;
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

