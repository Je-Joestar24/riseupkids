import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import youtubeService from '../../services/youtubeService';

/**
 * Async thunk: fetch paginated list of YouTube lives
 */
export const fetchLives = createAsyncThunk(
  'youtube/fetchLives',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await youtubeService.getLiveList(params);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || error || 'Failed to fetch lives');
    }
  }
);

/**
 * Async thunk: fetch one YouTube live by id
 */
export const fetchLiveById = createAsyncThunk(
  'youtube/fetchLiveById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await youtubeService.getLiveById(id);
      return response;
    } catch (error) {
      return rejectWithValue(error?.message || error || 'Failed to fetch live');
    }
  }
);

/**
 * Async thunk: archive a YouTube live
 */
export const archiveLive = createAsyncThunk(
  'youtube/archiveLive',
  async (id, { rejectWithValue }) => {
    try {
      const response = await youtubeService.archiveLive(id);
      return { id, response };
    } catch (error) {
      return rejectWithValue(error?.message || error || 'Failed to archive live');
    }
  }
);

/**
 * Async thunk: delete a YouTube live from LMS
 */
export const deleteLive = createAsyncThunk(
  'youtube/deleteLive',
  async (id, { rejectWithValue }) => {
    try {
      await youtubeService.deleteLive(id);
      return { id };
    } catch (error) {
      return rejectWithValue(error?.message || error || 'Failed to delete live');
    }
  }
);

const initialState = {
  lives: [],
  currentLive: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 10,
    search: '',
    isArchived: undefined,
  },
  listLoading: false,
  detailLoading: false,
  actionLoading: false, // archive / delete
  error: null,
};

const youtubeSlice = createSlice({
  name: 'youtube',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentLive: (state, action) => {
      state.currentLive = action.payload;
    },
    clearCurrentLive: (state) => {
      state.currentLive = null;
    },
    resetYoutubeLiveState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch list
    builder
      .addCase(fetchLives.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(fetchLives.fulfilled, (state, action) => {
        state.listLoading = false;
        const payload = action.payload;
        state.lives = payload.data || [];
        state.pagination = payload.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchLives.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      });

    // Fetch by id
    builder
      .addCase(fetchLiveById.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
      })
      .addCase(fetchLiveById.fulfilled, (state, action) => {
        state.detailLoading = false;
        const payload = action.payload;
        if (payload?.data) {
          state.currentLive = payload.data;
        }
        state.error = null;
      })
      .addCase(fetchLiveById.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = action.payload;
      });

    // Archive
    builder
      .addCase(archiveLive.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(archiveLive.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id, response } = action.payload;
        const updated = response?.data;
        const index = state.lives.findIndex((l) => l._id === id || l.id === id);
        if (index !== -1 && updated) {
          state.lives[index] = updated;
        } else if (index !== -1) {
          state.lives[index] = { ...state.lives[index], isArchived: true };
        }
        if (state.currentLive && (state.currentLive._id === id || state.currentLive.id === id)) {
          state.currentLive = updated || { ...state.currentLive, isArchived: true };
        }
        state.error = null;
      })
      .addCase(archiveLive.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });

    // Delete
    builder
      .addCase(deleteLive.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteLive.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id } = action.payload;
        state.lives = state.lives.filter((l) => l._id !== id && l.id !== id);
        state.pagination.total = Math.max(0, (state.pagination.total || 0) - 1);
        if (state.currentLive && (state.currentLive._id === id || state.currentLive.id === id)) {
          state.currentLive = null;
        }
        state.error = null;
      })
      .addCase(deleteLive.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentLive,
  clearCurrentLive,
  resetYoutubeLiveState,
} = youtubeSlice.actions;

export default youtubeSlice.reducer;
