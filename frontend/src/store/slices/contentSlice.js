import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contentService, { CONTENT_TYPES } from '../../services/contentService';

/**
 * Async thunk for getting all content items
 */
export const fetchAllContent = createAsyncThunk(
  'content/fetchAllContent',
  async ({ contentType, params = {} }, { rejectWithValue }) => {
    try {
      const response = await contentService.getAllContent(contentType, params);
      return { contentType, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch content');
    }
  }
);

/**
 * Async thunk for creating content
 */
export const createContent = createAsyncThunk(
  'content/createContent',
  async ({ contentType, formData }, { rejectWithValue }) => {
    try {
      const response = await contentService.createContent(contentType, formData);
      return { contentType, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to create content');
    }
  }
);

/**
 * Async thunk for getting single content item by ID
 */
export const fetchContentById = createAsyncThunk(
  'content/fetchContentById',
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const response = await contentService.getContentById(contentType, contentId);
      return { contentType, contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch content');
    }
  }
);

/**
 * Async thunk for updating content
 */
export const updateContent = createAsyncThunk(
  'content/updateContent',
  async ({ contentType, contentId, formData }, { rejectWithValue }) => {
    try {
      const response = await contentService.updateContent(contentType, contentId, formData);
      return { contentType, contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update content');
    }
  }
);

/**
 * Async thunk for deleting content
 */
export const deleteContent = createAsyncThunk(
  'content/deleteContent',
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const response = await contentService.deleteContent(contentType, contentId);
      return { contentType, contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete content');
    }
  }
);

/**
 * Async thunk for restoring archived content (activities only)
 */
export const restoreContent = createAsyncThunk(
  'content/restoreContent',
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const response = await contentService.restoreContent(contentType, contentId);
      return { contentType, contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to restore content');
    }
  }
);

// Initial state
const initialState = {
  // Unified content items (all types mixed)
  contentItems: [],
  // Current content item being viewed/edited
  currentContent: null,
  // Current content type filter
  currentContentType: CONTENT_TYPES.ACTIVITY,
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    contentType: CONTENT_TYPES.ACTIVITY, // Filter by content type
    isPublished: undefined,
    isArchived: undefined, // For activities only
    search: '',
    page: 1,
    limit: 10,
    // Type-specific filters
    typeSpecific: {
      // Books
      language: undefined,
      readingLevel: undefined,
      // Videos
      isActive: undefined,
      // Audio Assignments
      isStarAssignment: undefined,
    },
  },
  loading: false,
  error: null,
};

// Content slice
const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Update currentContentType when contentType filter changes
      if (action.payload.contentType) {
        state.currentContentType = action.payload.contentType;
      }
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.currentContentType = initialState.currentContentType;
    },
    clearCurrentContent: (state) => {
      state.currentContent = null;
    },
    setContentType: (state, action) => {
      state.currentContentType = action.payload;
      state.filters.contentType = action.payload;
    },
    resetContentState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Content
    builder
      .addCase(fetchAllContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, response } = action.payload;
        
        // Extract data based on content type
        let items = [];
        if (contentType === CONTENT_TYPES.ACTIVITY) {
          items = response.data || [];
        } else if (contentType === CONTENT_TYPES.BOOK) {
          items = response.data || [];
        } else if (contentType === CONTENT_TYPES.VIDEO) {
          // Transform videos: map thumbnail to coverImage for consistency
          items = (response.data || []).map(video => ({
            ...video,
            coverImage: video.thumbnail || video.coverImage, // Use thumbnail as coverImage
          }));
        } else if (contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT) {
          items = response.data || [];
        } else if (contentType === CONTENT_TYPES.CHANT) {
          items = response.data || [];
        }
        
        // Add contentType to each item for identification
        items = items.map(item => ({ ...item, _contentType: contentType }));
        
        state.contentItems = items;
        state.pagination = response.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Content
    builder
      .addCase(createContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, response } = action.payload;
        
        // Add new content to the list
        if (response.data) {
          let newItem = { ...response.data, _contentType: contentType };
          // Transform videos: map thumbnail to coverImage
          if (contentType === CONTENT_TYPES.VIDEO) {
            newItem = { ...newItem, coverImage: newItem.thumbnail || newItem.coverImage };
          }
          state.contentItems.unshift(newItem);
          state.pagination.total += 1;
        }
        state.error = null;
      })
      .addCase(createContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Content By ID
    builder
      .addCase(fetchContentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContentById.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, response } = action.payload;
        
        if (response.data) {
          state.currentContent = { ...response.data, _contentType: contentType };
        }
        state.error = null;
      })
      .addCase(fetchContentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Content
    builder
      .addCase(updateContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, contentId, response } = action.payload;
        let updatedContent = response.data;
        // Transform videos: map thumbnail to coverImage
        if (contentType === CONTENT_TYPES.VIDEO && updatedContent) {
          updatedContent = { ...updatedContent, coverImage: updatedContent.thumbnail || updatedContent.coverImage };
        }
        
        if (updatedContent) {
          const updatedItem = { ...updatedContent, _contentType: contentType };
          
          // Update in content items list
          const index = state.contentItems.findIndex(
            (item) => item._id === contentId && item._contentType === contentType
          );
          if (index !== -1) {
            state.contentItems[index] = updatedItem;
          }
          
          // Update current content if it's the same
          if (state.currentContent?._id === contentId && state.currentContent?._contentType === contentType) {
            state.currentContent = updatedItem;
          }
        }
        state.error = null;
      })
      .addCase(updateContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Content
    builder
      .addCase(deleteContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, contentId } = action.payload;
        
        // Remove from content items list
        state.contentItems = state.contentItems.filter(
          (item) => !(item._id === contentId && item._contentType === contentType)
        );
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        
        // Clear current content if it's the same
        if (state.currentContent?._id === contentId && state.currentContent?._contentType === contentType) {
          state.currentContent = null;
        }
        state.error = null;
      })
      .addCase(deleteContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Content (activities only)
    builder
      .addCase(restoreContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, contentId } = action.payload;
        
        // Remove from content items list (restored items are filtered out if viewing archived)
        state.contentItems = state.contentItems.filter(
          (item) => !(item._id === contentId && item._contentType === contentType)
        );
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        
        // Clear current content if it's the same
        if (state.currentContent?._id === contentId && state.currentContent?._contentType === contentType) {
          state.currentContent = null;
        }
        state.error = null;
      })
      .addCase(restoreContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentContent,
  setContentType,
  resetContentState,
} = contentSlice.actions;
export default contentSlice.reducer;

