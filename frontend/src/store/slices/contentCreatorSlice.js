import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contentCreatorService from '../../services/contentCreatorService';

/**
 * Async thunk for getting all ContentCreators
 */
export const fetchAllContentCreators = createAsyncThunk(
  'contentCreators/fetchAllContentCreators',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.getAllContentCreators(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ContentCreators');
    }
  }
);

/**
 * Async thunk for getting single ContentCreator by ID
 */
export const fetchContentCreatorById = createAsyncThunk(
  'contentCreators/fetchContentCreatorById',
  async (ContentCreatorId, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.getContentCreatorById(ContentCreatorId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ContentCreator');
    }
  }
);

/**
 * Async thunk for creating ContentCreator
 */
export const createContentCreator = createAsyncThunk(
  'contentCreators/createContentCreator',
  async (ContentCreatorData, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.createContentCreator(ContentCreatorData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create ContentCreator');
    }
  }
);

/**
 * Async thunk for updating ContentCreator
 */
export const updateContentCreator = createAsyncThunk(
  'contentCreators/updateContentCreator',
  async ({ contentCreatorId, updateData }, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.updateContentCreator(contentCreatorId, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update ContentCreator');
    }
  }
);

/**
 * Async thunk for archiving ContentCreator
 */
export const archiveContentCreator = createAsyncThunk(
  'contentCreators/archiveContentCreator',
  async (ContentCreatorId, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.archiveContentCreator(ContentCreatorId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to archive ContentCreator');
    }
  }
);

/**
 * Async thunk for restoring ContentCreator
 */
export const restoreContentCreator = createAsyncThunk(
  'contentCreators/restoreContentCreator',
  async (ContentCreatorId, { rejectWithValue }) => {
    try {
      const response = await contentCreatorService.restoreContentCreator(ContentCreatorId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to restore ContentCreator');
    }
  }
);

// Initial state
const initialState = {
  contentCreators: [],
  currentContentCreator: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    search: '',
    isActive: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  loading: false,
  error: null,
};

// ContentCreators slice
const ContentCreatorSlice = createSlice({
  name: 'contentCreators',
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
    clearCurrentContentCreator: (state) => {
      state.currentContentCreator = null;
    },
    resetContentCreatorsState: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All ContentCreators
    builder
      .addCase(fetchAllContentCreators.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllContentCreators.fulfilled, (state, action) => {
        state.loading = false;
        state.contentCreators = action.payload.data || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
      })
      .addCase(fetchAllContentCreators.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch ContentCreator By ID
    builder
      .addCase(fetchContentCreatorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentCreatorById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContentCreator = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchContentCreatorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create ContentCreator
    builder
      .addCase(createContentCreator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContentCreator.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.contentCreators.unshift(action.payload.data);
          state.pagination.totalItems += 1;
        }
        state.error = null;
      })
      .addCase(createContentCreator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update ContentCreator
    builder
      .addCase(updateContentCreator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContentCreator.fulfilled, (state, action) => {
        state.loading = false;
        const updatedContentCreator = action.payload.data;
        if (updatedContentCreator) {
          const index = state.contentCreators.findIndex((t) => t._id === updatedContentCreator._id);
          if (index !== -1) {
            state.contentCreators[index] = updatedContentCreator;
          }
          if (state.currentContentCreator?._id === updatedContentCreator._id) {
            state.currentContentCreator = updatedContentCreator;
          }
        }
        state.error = null;
      })
      .addCase(updateContentCreator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive ContentCreator
    builder
      .addCase(archiveContentCreator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveContentCreator.fulfilled, (state, action) => {
        state.loading = false;
        const archivedContentCreator = action.payload.data;
        if (archivedContentCreator) {
          const index = state.contentCreators.findIndex((t) => t._id === archivedContentCreator._id);
          if (index !== -1) {
            state.contentCreators[index] = archivedContentCreator;
          }
          if (state.currentContentCreator?._id === archivedContentCreator._id) {
            state.currentContentCreator = null;
          }
        }
        state.error = null;
      })
      .addCase(archiveContentCreator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore ContentCreator
    builder
      .addCase(restoreContentCreator.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreContentCreator.fulfilled, (state, action) => {
        state.loading = false;
        const restoredContentCreator = action.payload.data;
        if (restoredContentCreator) {
          const index = state.contentCreators.findIndex((t) => t._id === restoredContentCreator._id);
          if (index !== -1) {
            state.contentCreators[index] = restoredContentCreator;
          }
          if (state.currentContentCreator?._id === restoredContentCreator._id) {
            state.currentContentCreator = restoredContentCreator;
          }
        }
        state.error = null;
      })
      .addCase(restoreContentCreator.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentContentCreator,
  resetContentCreatorsState,
} = ContentCreatorSlice.actions;

export default ContentCreatorSlice.reducer;

