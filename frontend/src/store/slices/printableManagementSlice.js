import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import printableManagementService from '../../services/printableManagementService';

export const fetchPrintableModules = createAsyncThunk(
  'printableManagement/fetchPrintableModules',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await printableManagementService.getModules(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch printable modules');
    }
  }
);

export const fetchCoursePrintables = createAsyncThunk(
  'printableManagement/fetchCoursePrintables',
  async ({ courseId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await printableManagementService.getCoursePrintables(courseId, params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch course printables');
    }
  }
);

export const addCoursePrintable = createAsyncThunk(
  'printableManagement/addCoursePrintable',
  async ({ courseId, payload }, { rejectWithValue }) => {
    try {
      const response = await printableManagementService.addCoursePrintable(courseId, payload);
      return { response, courseId };
    } catch (error) {
      return rejectWithValue(error || 'Failed to add printable material');
    }
  }
);

const initialState = {
  modules: [],
  modulesPagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  course: null,
  coursePrintables: [],
  coursePrintablesPagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  loadingModules: false,
  loadingCoursePrintables: false,
  addingPrintable: false,
  error: null,
};

const printableManagementSlice = createSlice({
  name: 'printableManagement',
  initialState,
  reducers: {
    clearPrintableManagementError: (state) => {
      state.error = null;
    },
    clearCoursePrintablesState: (state) => {
      state.course = null;
      state.coursePrintables = [];
      state.coursePrintablesPagination = { ...initialState.coursePrintablesPagination };
    },
    resetPrintableManagementState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrintableModules.pending, (state) => {
        state.loadingModules = true;
        state.error = null;
      })
      .addCase(fetchPrintableModules.fulfilled, (state, action) => {
        state.loadingModules = false;
        state.modules = action.payload?.data?.courses || [];
        state.modulesPagination = action.payload?.data?.pagination || initialState.modulesPagination;
        state.error = null;
      })
      .addCase(fetchPrintableModules.rejected, (state, action) => {
        state.loadingModules = false;
        state.error = action.payload;
      })
      .addCase(fetchCoursePrintables.pending, (state) => {
        state.loadingCoursePrintables = true;
        state.error = null;
      })
      .addCase(fetchCoursePrintables.fulfilled, (state, action) => {
        state.loadingCoursePrintables = false;
        state.course = action.payload?.data?.course || null;
        state.coursePrintables = action.payload?.data?.printables || [];
        state.coursePrintablesPagination =
          action.payload?.data?.pagination || initialState.coursePrintablesPagination;
        state.error = null;
      })
      .addCase(fetchCoursePrintables.rejected, (state, action) => {
        state.loadingCoursePrintables = false;
        state.error = action.payload;
      })
      .addCase(addCoursePrintable.pending, (state) => {
        state.addingPrintable = true;
        state.error = null;
      })
      .addCase(addCoursePrintable.fulfilled, (state) => {
        state.addingPrintable = false;
        state.error = null;
      })
      .addCase(addCoursePrintable.rejected, (state, action) => {
        state.addingPrintable = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearPrintableManagementError,
  clearCoursePrintablesState,
  resetPrintableManagementState,
} = printableManagementSlice.actions;

export default printableManagementSlice.reducer;

