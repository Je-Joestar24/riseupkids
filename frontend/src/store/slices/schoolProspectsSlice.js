import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import schoolProspectService from '../../services/schoolProspectService';

export const fetchSchoolProspects = createAsyncThunk(
  'schoolProspects/fetchSchoolProspects',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await schoolProspectService.getSchoolProspects(params);
      return response;
    } catch (error) {
      const message =
        (typeof error === 'object' && error?.message) ||
        (typeof error === 'string' ? error : 'Failed to fetch school prospects');
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  items: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
  filters: {
    q: '',
    page: 1,
    limit: 20,
    language: '',
    role: '',
    flodeskStatus: '',
    cityCountry: '',
  },
  loading: false,
  error: null,
};

const schoolProspectsSlice = createSlice({
  name: 'schoolProspects',
  initialState,
  reducers: {
    setSchoolProspectFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSchoolProspectPage: (state, action) => {
      state.filters.page = action.payload;
    },
    clearSchoolProspectsError: (state) => {
      state.error = null;
    },
    resetSchoolProspects: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchoolProspects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchoolProspects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data?.items || [];
        state.meta = action.payload?.data?.meta || initialState.meta;
      })
      .addCase(fetchSchoolProspects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch school prospects';
        state.items = [];
      });
  },
});

export const {
  setSchoolProspectFilters,
  setSchoolProspectPage,
  clearSchoolProspectsError,
  resetSchoolProspects,
} = schoolProspectsSlice.actions;

export default schoolProspectsSlice.reducer;
