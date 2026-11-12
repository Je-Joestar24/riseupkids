import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import experienceAdminService, { toExperienceApiError } from '../../services/experienceAdminService';

/**
 * Admin Experiences list: the page of experiences, the filters, and which row is busy (publishing,
 * unpublishing or deleting), so a second tap on the same row cannot start a second request.
 *
 * A list that is refreshed keeps showing the old rows until the new ones arrive, and an answer to an
 * older request (typing quickly in the search) is ignored when a newer one is already on its way.
 */

/** What a rejected thunk carries: plain data, so Redux can keep it. */
const failure = (error, fallback) => {
  const { message, code, status, errors } = toExperienceApiError(error, fallback);
  return { message, code, status, errors };
};

export const fetchExperiences = createAsyncThunk(
  'experienceAdmin/fetchExperiences',
  async (filters, { rejectWithValue }) => {
    try {
      return await experienceAdminService.listExperiences(filters);
    } catch (error) {
      return rejectWithValue(failure(error, 'Could not load the experiences.'));
    }
  }
);

export const publishExperience = createAsyncThunk(
  'experienceAdmin/publishExperience',
  async (uuid, { rejectWithValue }) => {
    try {
      return await experienceAdminService.publishExperience(uuid);
    } catch (error) {
      return rejectWithValue(failure(error, 'Could not publish the experience.'));
    }
  }
);

export const unpublishExperience = createAsyncThunk(
  'experienceAdmin/unpublishExperience',
  async (uuid, { rejectWithValue }) => {
    try {
      return await experienceAdminService.unpublishExperience(uuid);
    } catch (error) {
      return rejectWithValue(failure(error, 'Could not unpublish the experience.'));
    }
  }
);

export const deleteExperience = createAsyncThunk(
  'experienceAdmin/deleteExperience',
  async (uuid, { rejectWithValue }) => {
    try {
      return await experienceAdminService.deleteExperience(uuid);
    } catch (error) {
      return rejectWithValue(failure(error, 'Could not delete the experience.'));
    }
  }
);

export const DEFAULT_PAGE_SIZE = 12;

const initialState = {
  items: [],
  pagination: null,
  counts: { all: 0, published: 0, draft: 0 },
  filters: { status: 'all', search: '', page: 1, limit: DEFAULT_PAGE_SIZE },
  loaded: false,
  loading: false,
  error: null,
  activeRequestId: null,
  busy: {},
};

const setBusy = (kind) => (state, action) => {
  state.busy[action.meta.arg] = kind;
};
const clearBusy = (state, action) => {
  delete state.busy[action.meta.arg];
};

const experienceAdminSlice = createSlice({
  name: 'experienceAdmin',
  initialState,
  reducers: {
    /** Changes some filters. Any change other than the page itself goes back to page 1. */
    setExperienceFilters: (state, action) => {
      const next = { ...state.filters, ...action.payload };
      const pageGiven = Object.prototype.hasOwnProperty.call(action.payload, 'page');
      if (!pageGiven) next.page = 1;
      next.page = Number.isInteger(next.page) && next.page >= 1 ? next.page : 1;
      next.limit = Number.isInteger(next.limit) && next.limit >= 1 ? next.limit : DEFAULT_PAGE_SIZE;
      next.search = typeof next.search === 'string' ? next.search : '';
      state.filters = next;
    },
    clearExperienceFilters: (state) => {
      state.filters = { ...initialState.filters, limit: state.filters.limit };
    },
    resetExperienceAdmin: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExperiences.pending, (state, action) => {
        state.loading = true;
        state.activeRequestId = action.meta.requestId;
      })
      .addCase(fetchExperiences.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return; // an older answer
        state.loading = false;
        state.loaded = true;
        state.error = null;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
        state.counts = action.payload.counts;
      })
      .addCase(fetchExperiences.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        state.loading = false;
        state.error = action.payload || { message: 'Could not load the experiences.', code: null, status: null, errors: [] };
      })
      .addCase(publishExperience.pending, setBusy('publishing'))
      .addCase(publishExperience.fulfilled, clearBusy)
      .addCase(publishExperience.rejected, clearBusy)
      .addCase(unpublishExperience.pending, setBusy('unpublishing'))
      .addCase(unpublishExperience.fulfilled, clearBusy)
      .addCase(unpublishExperience.rejected, clearBusy)
      .addCase(deleteExperience.pending, setBusy('deleting'))
      .addCase(deleteExperience.fulfilled, clearBusy)
      .addCase(deleteExperience.rejected, clearBusy);
  },
});

export const { setExperienceFilters, clearExperienceFilters, resetExperienceAdmin } = experienceAdminSlice.actions;

export const selectExperienceAdmin = (state) => state.experienceAdmin;

export default experienceAdminSlice.reducer;
