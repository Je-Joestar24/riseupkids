import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import cmsBookAdminService from '../../services/cmsBookAdminService';

export const fetchCmsBooks = createAsyncThunk(
  'cmsBookAdmin/fetchBooks',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.listBooks(params);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch CMS books');
    }
  }
);

export const fetchCmsBookById = createAsyncThunk(
  'cmsBookAdmin/fetchBookById',
  async (bookId, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.getBookById(bookId);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch CMS book');
    }
  }
);

export const createCmsBook = createAsyncThunk(
  'cmsBookAdmin/createBook',
  async (payload, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.createBook(payload);
    } catch (error) {
      return rejectWithValue(error || 'Failed to create CMS book');
    }
  }
);

export const updateCmsBook = createAsyncThunk(
  'cmsBookAdmin/updateBook',
  async ({ bookId, payload }, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.updateBook(bookId, payload);
    } catch (error) {
      return rejectWithValue(error || 'Failed to update CMS book');
    }
  }
);

export const publishCmsBook = createAsyncThunk(
  'cmsBookAdmin/publishBook',
  async (bookId, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.publishBook(bookId);
    } catch (error) {
      return rejectWithValue(error || 'Failed to publish CMS book');
    }
  }
);

export const unpublishCmsBook = createAsyncThunk(
  'cmsBookAdmin/unpublishBook',
  async (bookId, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.unpublishBook(bookId);
    } catch (error) {
      return rejectWithValue(error || 'Failed to unpublish CMS book');
    }
  }
);

export const archiveCmsBook = createAsyncThunk(
  'cmsBookAdmin/archiveBook',
  async (bookId, { rejectWithValue }) => {
    try {
      return await cmsBookAdminService.archiveBook(bookId);
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive CMS book');
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
    status: '',
    language: '',
    page: 1,
    limit: 10,
    includeArchived: false,
  },
  loading: {
    list: false,
    details: false,
    mutating: false,
  },
  error: null,
  lastAction: null,
};

const setError = (state, action) => {
  state.error = action.payload || action.error?.message || 'Request failed';
};

const upsertBook = (state, book) => {
  if (!book || !book._id) return;
  const index = state.books.findIndex((item) => item._id === book._id);
  if (index >= 0) {
    state.books[index] = book;
  } else {
    state.books.unshift(book);
  }
};

const cmsBookAdminSlice = createSlice({
  name: 'cmsBookAdmin',
  initialState,
  reducers: {
    clearCmsBookAdminError: (state) => {
      state.error = null;
    },
    clearCurrentCmsBook: (state) => {
      state.currentBook = null;
    },
    setCmsBookAdminFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetCmsBookAdminState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCmsBooks.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchCmsBooks.fulfilled, (state, action) => {
        state.loading.list = false;
        state.books = action.payload?.data?.items || [];
        state.pagination = action.payload?.data?.pagination || initialState.pagination;
        state.lastAction = 'fetchBooks';
      })
      .addCase(fetchCmsBooks.rejected, (state, action) => {
        state.loading.list = false;
        setError(state, action);
      })
      .addCase(fetchCmsBookById.pending, (state) => {
        state.loading.details = true;
        state.error = null;
      })
      .addCase(fetchCmsBookById.fulfilled, (state, action) => {
        state.loading.details = false;
        const book = action.payload?.data || null;
        state.currentBook = book;
        if (book) upsertBook(state, book);
        state.lastAction = 'fetchBookById';
      })
      .addCase(fetchCmsBookById.rejected, (state, action) => {
        state.loading.details = false;
        setError(state, action);
      })
      .addCase(createCmsBook.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(createCmsBook.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const book = action.payload?.data || null;
        if (book) {
          state.currentBook = book;
          upsertBook(state, book);
        }
        state.lastAction = 'createBook';
      })
      .addCase(createCmsBook.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })
      .addCase(updateCmsBook.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(updateCmsBook.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const book = action.payload?.data || null;
        if (book) {
          state.currentBook = book;
          upsertBook(state, book);
        }
        state.lastAction = 'updateBook';
      })
      .addCase(updateCmsBook.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })
      .addCase(publishCmsBook.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(publishCmsBook.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const book = action.payload?.data || null;
        if (book) {
          state.currentBook = book;
          upsertBook(state, book);
        }
        state.lastAction = 'publishBook';
      })
      .addCase(publishCmsBook.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })
      .addCase(unpublishCmsBook.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(unpublishCmsBook.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const book = action.payload?.data || null;
        if (book) {
          state.currentBook = book;
          upsertBook(state, book);
        }
        state.lastAction = 'unpublishBook';
      })
      .addCase(unpublishCmsBook.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      })
      .addCase(archiveCmsBook.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(archiveCmsBook.fulfilled, (state, action) => {
        state.loading.mutating = false;
        const archivedId = action.payload?.data?.id || null;
        if (archivedId && state.currentBook?._id === archivedId) {
          state.currentBook = null;
        }
        if (archivedId) {
          state.books = state.books.filter((item) => item._id !== archivedId);
        }
        state.lastAction = 'archiveBook';
      })
      .addCase(archiveCmsBook.rejected, (state, action) => {
        state.loading.mutating = false;
        setError(state, action);
      });
  },
});

export const {
  clearCmsBookAdminError,
  clearCurrentCmsBook,
  setCmsBookAdminFilters,
  resetCmsBookAdminState,
} = cmsBookAdminSlice.actions;

export const selectCmsBookAdmin = (state) => state.cmsBookAdmin;
export const selectCmsBookAdminBooks = (state) => state.cmsBookAdmin.books;
export const selectCmsBookAdminCurrentBook = (state) => state.cmsBookAdmin.currentBook;
export const selectCmsBookAdminPagination = (state) => state.cmsBookAdmin.pagination;
export const selectCmsBookAdminLoading = (state) => state.cmsBookAdmin.loading;
export const selectCmsBookAdminError = (state) => state.cmsBookAdmin.error;

export default cmsBookAdminSlice.reducer;
