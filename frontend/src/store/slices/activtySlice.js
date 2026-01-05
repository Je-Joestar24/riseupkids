import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import activityService from '../../services/activityService';

/**
 * Async thunk for getting all activities
 */
export const fetchAllActivities = createAsyncThunk(
  'activity/fetchAllActivities',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await activityService.getAllActivities(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch activities');
    }
  }
);

/**
 * Async thunk for creating activity
 */
export const createActivity = createAsyncThunk(
  'activity/createActivity',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await activityService.createActivity(formData);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to create activity');
    }
  }
);

// Initial state
const initialState = {
  activities: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {
    type: '',
    isPublished: undefined,
    search: '',
    page: 1,
    limit: 20,
  },
  loading: false,
  error: null,
};

// Activity slice
const activitySlice = createSlice({
  name: 'activity',
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
    resetActivityState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Activities
    builder
      .addCase(fetchAllActivities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.activities = action.payload.data || [];
        state.pagination = action.payload.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Activity
    builder
      .addCase(createActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createActivity.fulfilled, (state, action) => {
        state.loading = false;
        // Add new activity to the list
        if (action.payload.data) {
          state.activities.unshift(action.payload.data);
          state.pagination.total += 1;
        }
        state.error = null;
      })
      .addCase(createActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  resetActivityState,
} = activitySlice.actions;
export default activitySlice.reducer;

