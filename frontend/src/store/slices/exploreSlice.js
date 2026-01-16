import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import exploreService from '../../services/exploreServices';

/**
 * Async thunk for getting all explore content
 */
export const fetchAllExploreContent = createAsyncThunk(
  'explore/fetchAllExploreContent',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await exploreService.getAllExploreContent(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch explore content');
    }
  }
);

/**
 * Async thunk for creating explore content
 */
export const createExploreContent = createAsyncThunk(
  'explore/createExploreContent',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await exploreService.createExploreContent(formData);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to create explore content');
    }
  }
);

/**
 * Async thunk for getting single explore content by ID
 */
export const fetchExploreContentById = createAsyncThunk(
  'explore/fetchExploreContentById',
  async (contentId, { rejectWithValue }) => {
    try {
      const response = await exploreService.getExploreContentById(contentId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch explore content');
    }
  }
);

/**
 * Async thunk for updating explore content
 */
export const updateExploreContent = createAsyncThunk(
  'explore/updateExploreContent',
  async ({ contentId, formData }, { rejectWithValue }) => {
    try {
      const response = await exploreService.updateExploreContent(contentId, formData);
      return { contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update explore content');
    }
  }
);

/**
 * Async thunk for deleting explore content
 */
export const deleteExploreContent = createAsyncThunk(
  'explore/deleteExploreContent',
  async (contentId, { rejectWithValue }) => {
    try {
      const response = await exploreService.deleteExploreContent(contentId);
      return { contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete explore content');
    }
  }
);

/**
 * Async thunk for getting explore content by type
 */
export const fetchExploreContentByType = createAsyncThunk(
  'explore/fetchExploreContentByType',
  async ({ type, params = {} }, { rejectWithValue }) => {
    try {
      const response = await exploreService.getExploreContentByType(type, params);
      return { type, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch explore content by type');
    }
  }
);

/**
 * Async thunk for getting featured explore content
 */
export const fetchFeaturedExploreContent = createAsyncThunk(
  'explore/fetchFeaturedExploreContent',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await exploreService.getFeaturedExploreContent(limit);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch featured explore content');
    }
  }
);

/**
 * Async thunk for reordering explore content within a specific video type
 */
export const reorderExploreContent = createAsyncThunk(
  'explore/reorderExploreContent',
  async ({ contentIds, videoType }, { rejectWithValue }) => {
    try {
      const response = await exploreService.reorderExploreContent(contentIds, videoType);
      return { contentIds, videoType, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to reorder explore content');
    }
  }
);

// Initial state
const initialState = {
  // List of explore content
  exploreContent: [],
  // Current explore content being viewed/edited
  currentExploreContent: null,
  // Featured explore content
  featuredContent: [],
  // Content by type cache
  contentByType: {},
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    type: 'video',
    videoType: 'replay', // Default to 'replay'
    isPublished: undefined,
    isFeatured: undefined,
    search: '',
    page: 1,
    limit: 10,
  },
  loading: false,
  error: null,
};

// Explore slice
const exploreSlice = createSlice({
  name: 'explore',
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
    clearCurrentExploreContent: (state) => {
      state.currentExploreContent = null;
    },
    resetExploreState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Explore Content
    builder
      .addCase(fetchAllExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        state.exploreContent = response.data || [];
        state.pagination = response.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Explore Content
    builder
      .addCase(createExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        // Add new content to the list
        if (response.data) {
          state.exploreContent.unshift(response.data);
          state.pagination.total += 1;
        }
        state.error = null;
      })
      .addCase(createExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Explore Content By ID
    builder
      .addCase(fetchExploreContentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExploreContentById.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.data) {
          state.currentExploreContent = response.data;
        }
        state.error = null;
      })
      .addCase(fetchExploreContentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Explore Content
    builder
      .addCase(updateExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentId, response } = action.payload;
        const updatedContent = response.data;
        
        if (updatedContent) {
          // Update in explore content list
          const index = state.exploreContent.findIndex(
            (content) => content._id === contentId
          );
          if (index !== -1) {
            state.exploreContent[index] = updatedContent;
          }
          
          // Update current content if it's the same
          if (state.currentExploreContent?._id === contentId) {
            state.currentExploreContent = updatedContent;
          }
        }
        state.error = null;
      })
      .addCase(updateExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Explore Content
    builder
      .addCase(deleteExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentId } = action.payload;
        
        // Remove from explore content list
        state.exploreContent = state.exploreContent.filter(
          (content) => content._id !== contentId
        );
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        
        // Clear current content if it's the same
        if (state.currentExploreContent?._id === contentId) {
          state.currentExploreContent = null;
        }
        state.error = null;
      })
      .addCase(deleteExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Explore Content By Type
    builder
      .addCase(fetchExploreContentByType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExploreContentByType.fulfilled, (state, action) => {
        state.loading = false;
        const { type, response } = action.payload;
        
        // Cache content by type
        if (response.data) {
          state.contentByType[type] = response.data;
        }
        state.error = null;
      })
      .addCase(fetchExploreContentByType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Featured Explore Content
    builder
      .addCase(fetchFeaturedExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.data) {
          state.featuredContent = response.data;
        }
        state.error = null;
      })
      .addCase(fetchFeaturedExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reorder Explore Content
    builder
      .addCase(reorderExploreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderExploreContent.fulfilled, (state, action) => {
        state.loading = false;
        // Note: The content list will be refreshed by calling fetchAllExploreContent
        // after successful reorder, so we don't need to update state here
        state.error = null;
      })
      .addCase(reorderExploreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentExploreContent,
  resetExploreState,
} = exploreSlice.actions;
export default exploreSlice.reducer;
