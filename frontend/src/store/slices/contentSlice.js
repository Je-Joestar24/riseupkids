import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import contentService, { CONTENT_TYPES, normalizeBookContent } from '../../services/contentService';

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
 * Async thunk for creating content (multipart). Video FormData may include `videoSource` + `embedUrl` for Bunny embed.
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

/**
 * Async thunk for archiving content (activities/books)
 */
export const archiveContent = createAsyncThunk(
  'content/archiveContent',
  async ({ contentType, contentId }, { rejectWithValue }) => {
    try {
      const response = await contentService.archiveContent(contentType, contentId);
      return { contentType, contentId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive content');
    }
  }
);

/**
 * Async thunk for updating one Star Cam mission vocabulary entry
 */
export const updateStarCamVocabularyEntry = createAsyncThunk(
  'content/updateStarCamVocabularyEntry',
  async ({ missionId, sortOrder, payload }, { rejectWithValue }) => {
    try {
      const response = await contentService.updateStarCamVocabulary(missionId, sortOrder, payload);
      return { missionId, sortOrder, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update Star Cam vocabulary');
    }
  }
);

/**
 * Async thunk for deleting one Star Cam mission vocabulary entry
 */
export const deleteStarCamVocabularyEntry = createAsyncThunk(
  'content/deleteStarCamVocabularyEntry',
  async ({ missionId, sortOrder }, { rejectWithValue }) => {
    try {
      const response = await contentService.deleteStarCamVocabulary(missionId, sortOrder);
      return { missionId, sortOrder, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete Star Cam vocabulary');
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
  currentContentType: CONTENT_TYPES.BOOK,
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    contentType: CONTENT_TYPES.BOOK, // Default filter: books
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
      packageType: undefined,
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
          items = (response.data || []).map((book) => normalizeBookContent(book));
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
          if (contentType === CONTENT_TYPES.BOOK) {
            newItem = { ...normalizeBookContent(newItem), _contentType: contentType };
          }
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
          const normalized =
            contentType === CONTENT_TYPES.BOOK
              ? normalizeBookContent(response.data)
              : response.data;
          state.currentContent = { ...normalized, _contentType: contentType };
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
        if (contentType === CONTENT_TYPES.BOOK && updatedContent) {
          updatedContent = normalizeBookContent(updatedContent);
        }
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

    // Restore Content (activities/books)
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

    // Archive Content (activities/books)
    builder
      .addCase(archiveContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveContent.fulfilled, (state, action) => {
        state.loading = false;
        const { contentType, contentId } = action.payload;

        const idx = state.contentItems.findIndex(
          (item) => item._id === contentId && item._contentType === contentType
        );
        if (idx !== -1) {
          state.contentItems[idx].isArchived = true;
          if (!state.filters.isArchived) {
            state.contentItems = state.contentItems.filter(
              (item) => !(item._id === contentId && item._contentType === contentType)
            );
            state.pagination.total = Math.max(0, state.pagination.total - 1);
          }
        }

        if (state.currentContent?._id === contentId && state.currentContent?._contentType === contentType) {
          state.currentContent = {
            ...state.currentContent,
            isArchived: true,
          };
        }
        state.error = null;
      })
      .addCase(archiveContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Star Cam Vocabulary Entry
    builder
      .addCase(updateStarCamVocabularyEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStarCamVocabularyEntry.fulfilled, (state, action) => {
        state.loading = false;
        const mission = action.payload?.response?.data;
        const missionId = action.payload?.missionId;
        if (mission?._id) {
          const missionWithType = { ...mission, _contentType: CONTENT_TYPES.STAR_CAM_MISSION };
          const idx = state.contentItems.findIndex(
            (item) => item._id === missionId && item._contentType === CONTENT_TYPES.STAR_CAM_MISSION
          );
          if (idx !== -1) {
            state.contentItems[idx] = missionWithType;
          } else {
            state.contentItems.unshift(missionWithType);
          }
          if (state.currentContent?._id === missionId) {
            state.currentContent = missionWithType;
          }
        }
        state.error = null;
      })
      .addCase(updateStarCamVocabularyEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Star Cam Vocabulary Entry
    builder
      .addCase(deleteStarCamVocabularyEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteStarCamVocabularyEntry.fulfilled, (state, action) => {
        state.loading = false;
        const mission = action.payload?.response?.data;
        const missionId = action.payload?.missionId;
        if (mission?._id) {
          const missionWithType = { ...mission, _contentType: CONTENT_TYPES.STAR_CAM_MISSION };
          const idx = state.contentItems.findIndex(
            (item) => item._id === missionId && item._contentType === CONTENT_TYPES.STAR_CAM_MISSION
          );
          if (idx !== -1) {
            state.contentItems[idx] = missionWithType;
          } else {
            state.contentItems.unshift(missionWithType);
          }
          if (state.currentContent?._id === missionId) {
            state.currentContent = missionWithType;
          }
        }
        state.error = null;
      })
      .addCase(deleteStarCamVocabularyEntry.rejected, (state, action) => {
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

