import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import meetingService from '../../services/meetingService';

/**
 * Async thunk for getting all meetings
 */
export const fetchAllMeetings = createAsyncThunk(
  'meeting/fetchAllMeetings',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await meetingService.getAllMeetings(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch meetings');
    }
  }
);

/**
 * Async thunk for getting single meeting by ID
 */
export const fetchMeetingById = createAsyncThunk(
  'meeting/fetchMeetingById',
  async (meetingId, { rejectWithValue }) => {
    try {
      const response = await meetingService.getMeetingById(meetingId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch meeting');
    }
  }
);

/**
 * Async thunk for updating a meeting
 */
export const updateMeeting = createAsyncThunk(
  'meeting/updateMeeting',
  async ({ meetingId, updates }, { rejectWithValue }) => {
    try {
      const response = await meetingService.updateMeeting(meetingId, updates);
      return { meetingId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update meeting');
    }
  }
);

/**
 * Async thunk for archiving a meeting
 */
export const archiveMeeting = createAsyncThunk(
  'meeting/archiveMeeting',
  async (meetingId, { rejectWithValue }) => {
    try {
      const response = await meetingService.archiveMeeting(meetingId);
      return { meetingId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive meeting');
    }
  }
);

/**
 * Async thunk for restoring an archived meeting
 */
export const restoreMeeting = createAsyncThunk(
  'meeting/restoreMeeting',
  async (meetingId, { rejectWithValue }) => {
    try {
      const response = await meetingService.restoreMeeting(meetingId);
      return { meetingId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to restore meeting');
    }
  }
);

/**
 * Async thunk for cancelling a meeting
 */
export const cancelMeeting = createAsyncThunk(
  'meeting/cancelMeeting',
  async (meetingId, { rejectWithValue }) => {
    try {
      const response = await meetingService.cancelMeeting(meetingId);
      return { meetingId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to cancel meeting');
    }
  }
);

/**
 * Async thunk for deleting a meeting (permanent)
 */
export const deleteMeeting = createAsyncThunk(
  'meeting/deleteMeeting',
  async (meetingId, { rejectWithValue }) => {
    try {
      const response = await meetingService.deleteMeeting(meetingId);
      return { meetingId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete meeting');
    }
  }
);

// Initial state
const initialState = {
  // List of meetings
  meetings: [],
  // Current meeting being viewed/edited
  currentMeeting: null,
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    status: undefined,
    isArchived: false, // Default: exclude archived meetings
    search: '',
    startDate: undefined,
    endDate: undefined,
    relatedCourse: undefined,
    relatedLesson: undefined,
    createdBy: undefined,
    sortBy: 'startTime', // Default: sort by startTime descending
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  },
  loading: false,
  error: null,
};

// Meeting slice
const meetingSlice = createSlice({
  name: 'meeting',
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
    setCurrentMeeting: (state, action) => {
      state.currentMeeting = action.payload;
    },
    clearCurrentMeeting: (state) => {
      state.currentMeeting = null;
    },
    resetMeetingState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Meetings
    builder
      .addCase(fetchAllMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllMeetings.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        state.meetings = response.data || [];
        state.pagination = response.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Meeting By ID
    builder
      .addCase(fetchMeetingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetingById.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.data) {
          state.currentMeeting = response.data;
        }
        state.error = null;
      })
      .addCase(fetchMeetingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Meeting
    builder
      .addCase(updateMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const { meetingId, response } = action.payload;
        const updatedMeeting = response.data;
        
        if (updatedMeeting) {
          // Update in meetings list
          const index = state.meetings.findIndex(
            (meeting) => meeting._id === meetingId
          );
          if (index !== -1) {
            state.meetings[index] = updatedMeeting;
          }
          
          // Update current meeting if it's the same
          if (state.currentMeeting?._id === meetingId) {
            state.currentMeeting = updatedMeeting;
          }
        }
        state.error = null;
      })
      .addCase(updateMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive Meeting
    builder
      .addCase(archiveMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const { meetingId } = action.payload;
        
        // Update meeting in list to mark as archived
        const index = state.meetings.findIndex(
          (meeting) => meeting._id === meetingId
        );
        if (index !== -1) {
          state.meetings[index].isArchived = true;
          // Remove from list if not showing archived meetings
          if (!state.filters.isArchived) {
            state.meetings = state.meetings.filter(
              (meeting) => meeting._id !== meetingId
            );
            state.pagination.total = Math.max(0, state.pagination.total - 1);
          }
        }
        
        // Update current meeting if it's the same
        if (state.currentMeeting?._id === meetingId) {
          state.currentMeeting.isArchived = true;
        }
        state.error = null;
      })
      .addCase(archiveMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Meeting
    builder
      .addCase(restoreMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const { meetingId } = action.payload;
        
        // Update meeting in list to mark as unarchived
        const index = state.meetings.findIndex(
          (meeting) => meeting._id === meetingId
        );
        if (index !== -1) {
          state.meetings[index].isArchived = false;
        }
        
        // Update current meeting if it's the same
        if (state.currentMeeting?._id === meetingId) {
          state.currentMeeting.isArchived = false;
        }
        state.error = null;
      })
      .addCase(restoreMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Cancel Meeting
    builder
      .addCase(cancelMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const { meetingId, response } = action.payload;
        const cancelledMeeting = response.data;
        
        if (cancelledMeeting) {
          // Update in meetings list
          const index = state.meetings.findIndex(
            (meeting) => meeting._id === meetingId
          );
          if (index !== -1) {
            state.meetings[index] = cancelledMeeting;
          }
          
          // Update current meeting if it's the same
          if (state.currentMeeting?._id === meetingId) {
            state.currentMeeting = cancelledMeeting;
          }
        }
        state.error = null;
      })
      .addCase(cancelMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Meeting
    builder
      .addCase(deleteMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const { meetingId } = action.payload;
        
        // Remove from meetings list
        state.meetings = state.meetings.filter(
          (meeting) => meeting._id !== meetingId
        );
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        
        // Clear current meeting if it's the same
        if (state.currentMeeting?._id === meetingId) {
          state.currentMeeting = null;
        }
        state.error = null;
      })
      .addCase(deleteMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentMeeting,
  clearCurrentMeeting,
  resetMeetingState,
} = meetingSlice.actions;
export default meetingSlice.reducer;
