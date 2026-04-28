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
  },
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
      });
  },
});

export const {
  clearCmsBookPlayerError,
  clearCurrentPlayableCmsBook,
  setCmsBookPlayerFilters,
  resetCmsBookPlayerState,
} = cmsBookPlayerSlice.actions;

export const selectCmsBookPlayer = (state) => state.cmsBookPlayer;
export const selectPlayableCmsBooks = (state) => state.cmsBookPlayer.books;
export const selectCurrentPlayableCmsBook = (state) => state.cmsBookPlayer.currentBook;
export const selectCmsBookPlayerPagination = (state) => state.cmsBookPlayer.pagination;
export const selectCmsBookPlayerLoading = (state) => state.cmsBookPlayer.loading;
export const selectCmsBookPlayerError = (state) => state.cmsBookPlayer.error;

export default cmsBookPlayerSlice.reducer;
