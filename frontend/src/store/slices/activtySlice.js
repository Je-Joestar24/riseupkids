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

/**
 * Async thunk for getting single activity by ID
 */
export const fetchActivityById = createAsyncThunk(
  'activity/fetchActivityById',
  async (activityId, { rejectWithValue }) => {
    try {
      const response = await activityService.getActivityById(activityId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch activity');
    }
  }
);

/**
 * Async thunk for updating activity
 */
export const updateActivity = createAsyncThunk(
  'activity/updateActivity',
  async ({ activityId, formData }, { rejectWithValue }) => {
    try {
      const response = await activityService.updateActivity(activityId, formData);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to update activity');
    }
  }
);

/**
 * Async thunk for archiving activity
 */
export const archiveActivity = createAsyncThunk(
  'activity/archiveActivity',
  async (activityId, { rejectWithValue }) => {
    try {
      const response = await activityService.archiveActivity(activityId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive activity');
    }
  }
);

/**
 * Async thunk for restoring activity
 */
export const restoreActivity = createAsyncThunk(
  'activity/restoreActivity',
  async (activityId, { rejectWithValue }) => {
    try {
      const response = await activityService.restoreActivity(activityId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to restore activity');
    }
  }
);

// Initial state
const initialState = {
  activities: [],
  currentActivity: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  filters: {
    isPublished: undefined,
    isArchived: undefined,
    search: '',
    page: 1,
    limit: 10,
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
    clearCurrentActivity: (state) => {
      state.currentActivity = null;
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

    // Fetch Activity By ID
    builder
      .addCase(fetchActivityById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActivityById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentActivity = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchActivityById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Activity
    builder
      .addCase(updateActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        state.loading = false;
        const updatedActivity = action.payload.data;
        if (updatedActivity) {
          // Update in activities list
          const index = state.activities.findIndex(
            (a) => a._id === updatedActivity._id
          );
          if (index !== -1) {
            state.activities[index] = updatedActivity;
          }
          // Update current activity if it's the same
          if (state.currentActivity?._id === updatedActivity._id) {
            state.currentActivity = updatedActivity;
          }
        }
        state.error = null;
      })
      .addCase(updateActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive Activity
    builder
      .addCase(archiveActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveActivity.fulfilled, (state, action) => {
        state.loading = false;
        const archivedActivity = action.payload.data;
        if (archivedActivity) {
          // Remove from activities list (archived activities are filtered out)
          state.activities = state.activities.filter(
            (a) => a._id !== archivedActivity._id
          );
          state.pagination.total = Math.max(0, state.pagination.total - 1);
          // Clear current activity if it's the same
          if (state.currentActivity?._id === archivedActivity._id) {
            state.currentActivity = null;
          }
        }
        state.error = null;
      })
      .addCase(archiveActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Activity
    builder
      .addCase(restoreActivity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreActivity.fulfilled, (state, action) => {
        state.loading = false;
        const restoredActivity = action.payload.data;
        if (restoredActivity) {
          // Remove from activities list (restored activities are filtered out if viewing archived)
          state.activities = state.activities.filter(
            (a) => a._id !== restoredActivity._id
          );
          state.pagination.total = Math.max(0, state.pagination.total - 1);
          // Clear current activity if it's the same
          if (state.currentActivity?._id === restoredActivity._id) {
            state.currentActivity = null;
          }
        }
        state.error = null;
      })
      .addCase(restoreActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentActivity,
  resetActivityState,
} = activitySlice.actions;
export default activitySlice.reducer;

