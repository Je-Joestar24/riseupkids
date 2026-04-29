import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import cmsBookPlayerService from '../../services/cmsBookPlayerService';

export const fetchPlayableCmsBooks = createAsyncThunk(
  'cmsBookPlayer/fetchPlayableBooks',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await cmsBookPlayerService.listPlayableBooks(params);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch playable books');
    }
  }
);

export const fetchPlayableCmsBookById = createAsyncThunk(
  'cmsBookPlayer/fetchPlayableBookById',
  async (bookId, { rejectWithValue }) => {
    try {
      return await cmsBookPlayerService.getPlayableBookById(bookId);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch playable book');
    }
  }
);

export const preloadPlayableCmsBookMedia = createAsyncThunk(
  'cmsBookPlayer/preloadPlayableBookMedia',
  async ({ bookId, pages = [] } = {}, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setCmsBookPlayerPreloadProgress(0));
      const result = await cmsBookPlayerService.preloadBookMedia({
        pages,
        onProgress: ({ progress }) => {
          dispatch(setCmsBookPlayerPreloadProgress(progress));
        },
      });

      return {
        ...result,
        bookId: bookId || null,
      };
    } catch (error) {
      return rejectWithValue(error || 'Failed to preload playable book media');
    }
  }
);

const initialState = {
  books: [],
  currentBook: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    search: '',
    language: '',
    page: 1,
    limit: 10,
  },
  loading: {
    list: false,
    details: false,
    preload: false,
  },
  preloadProgress: 0,
  preloadSummary: null,
  error: null,
  lastAction: null,
};

const setError = (state, action) => {
  state.error = action.payload || action.error?.message || 'Request failed';
};

const cmsBookPlayerSlice = createSlice({
  name: 'cmsBookPlayer',
  initialState,
  reducers: {
    clearCmsBookPlayerError: (state) => {
      state.error = null;
    },
    clearCurrentPlayableCmsBook: (state) => {
      state.currentBook = null;
    },
    setCmsBookPlayerFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setCmsBookPlayerPreloadProgress: (state, action) => {
      state.preloadProgress = Number(action.payload) || 0;
    },
    clearCmsBookPreloadState: (state) => {
      state.loading.preload = false;
      state.preloadProgress = 0;
      state.preloadSummary = null;
    },
    resetCmsBookPlayerState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayableCmsBooks.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchPlayableCmsBooks.fulfilled, (state, action) => {
        state.loading.list = false;
        state.books = action.payload?.data?.items || [];
        state.pagination = action.payload?.data?.pagination || initialState.pagination;
        state.lastAction = 'fetchPlayableBooks';
      })
      .addCase(fetchPlayableCmsBooks.rejected, (state, action) => {
        state.loading.list = false;
        setError(state, action);
      })
      .addCase(fetchPlayableCmsBookById.pending, (state) => {
        state.loading.details = true;
        state.error = null;
      })
      .addCase(fetchPlayableCmsBookById.fulfilled, (state, action) => {
        state.loading.details = false;
        state.currentBook = action.payload?.data || null;
        state.lastAction = 'fetchPlayableBookById';
      })
      .addCase(fetchPlayableCmsBookById.rejected, (state, action) => {
        state.loading.details = false;
        setError(state, action);
      })
      .addCase(preloadPlayableCmsBookMedia.pending, (state) => {
        state.loading.preload = true;
        state.preloadProgress = 0;
        state.preloadSummary = null;
        state.error = null;
      })
      .addCase(preloadPlayableCmsBookMedia.fulfilled, (state, action) => {
        state.loading.preload = false;
        state.preloadProgress = 100;
        state.preloadSummary = action.payload || null;
        state.lastAction = 'preloadPlayableBookMedia';
      })
      .addCase(preloadPlayableCmsBookMedia.rejected, (state, action) => {
        state.loading.preload = false;
        setError(state, action);
      });
  },
});

export const {
  clearCmsBookPlayerError,
  clearCurrentPlayableCmsBook,
  setCmsBookPlayerFilters,
  setCmsBookPlayerPreloadProgress,
  clearCmsBookPreloadState,
  resetCmsBookPlayerState,
} = cmsBookPlayerSlice.actions;

export const selectCmsBookPlayer = (state) => state.cmsBookPlayer;
export const selectPlayableCmsBooks = (state) => state.cmsBookPlayer.books;
export const selectCurrentPlayableCmsBook = (state) => state.cmsBookPlayer.currentBook;
export const selectCmsBookPlayerPagination = (state) => state.cmsBookPlayer.pagination;
export const selectCmsBookPlayerLoading = (state) => state.cmsBookPlayer.loading;
export const selectCmsBookPlayerError = (state) => state.cmsBookPlayer.error;

export default cmsBookPlayerSlice.reducer;
