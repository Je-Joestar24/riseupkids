import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import lessonPlanManagementService from '../../services/lessonPlanManagementService';

export const fetchLessonPlanModules = createAsyncThunk(
  'lessonPlanManagement/fetchLessonPlanModules',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await lessonPlanManagementService.getModules(params);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch lesson plan modules');
    }
  }
);

export const fetchCourseLessonPlans = createAsyncThunk(
  'lessonPlanManagement/fetchCourseLessonPlans',
  async ({ courseId, params = {} }, { rejectWithValue }) => {
    try {
      return await lessonPlanManagementService.getCourseLessonPlans(courseId, params);
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch lesson plans');
    }
  }
);

export const addCourseLessonPlan = createAsyncThunk(
  'lessonPlanManagement/addCourseLessonPlan',
  async ({ courseId, payload }, { rejectWithValue }) => {
    try {
      const response = await lessonPlanManagementService.addCourseLessonPlan(courseId, payload);
      return { response, courseId };
    } catch (error) {
      return rejectWithValue(error || 'Failed to add lesson plan');
    }
  }
);

export const deleteCourseLessonPlan = createAsyncThunk(
  'lessonPlanManagement/deleteCourseLessonPlan',
  async ({ courseId, lessonPlanId }, { rejectWithValue }) => {
    try {
      const response = await lessonPlanManagementService.deleteCourseLessonPlan(courseId, lessonPlanId);
      return { response, courseId, lessonPlanId };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete lesson plan');
    }
  }
);

export const updateCourseLessonPlan = createAsyncThunk(
  'lessonPlanManagement/updateCourseLessonPlan',
  async ({ courseId, lessonPlanId, payload }, { rejectWithValue }) => {
    try {
      const response = await lessonPlanManagementService.updateCourseLessonPlan(courseId, lessonPlanId, payload);
      return { response, courseId, lessonPlanId };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update lesson plan');
    }
  }
);

const initialState = {
  modules: [],
  modulesPagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  course: null,
  courseLessonPlans: [],
  courseLessonPlansPagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
  loadingModules: false,
  loadingCourseLessonPlans: false,
  addingLessonPlan: false,
  updatingLessonPlan: false,
  deletingLessonPlan: false,
  error: null,
};

const lessonPlanManagementSlice = createSlice({
  name: 'lessonPlanManagement',
  initialState,
  reducers: {
    clearLessonPlanManagementError: (state) => {
      state.error = null;
    },
    clearCourseLessonPlansState: (state) => {
      state.course = null;
      state.courseLessonPlans = [];
      state.courseLessonPlansPagination = { ...initialState.courseLessonPlansPagination };
    },
    resetLessonPlanManagementState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonPlanModules.pending, (state) => {
        state.loadingModules = true;
        state.error = null;
      })
      .addCase(fetchLessonPlanModules.fulfilled, (state, action) => {
        state.loadingModules = false;
        state.modules = action.payload?.data?.courses || [];
        state.modulesPagination = action.payload?.data?.pagination || initialState.modulesPagination;
      })
      .addCase(fetchLessonPlanModules.rejected, (state, action) => {
        state.loadingModules = false;
        state.error = action.payload;
      })
      .addCase(fetchCourseLessonPlans.pending, (state) => {
        state.loadingCourseLessonPlans = true;
        state.error = null;
      })
      .addCase(fetchCourseLessonPlans.fulfilled, (state, action) => {
        state.loadingCourseLessonPlans = false;
        state.course = action.payload?.data?.course || null;
        state.courseLessonPlans = action.payload?.data?.lessonPlans || [];
        state.courseLessonPlansPagination =
          action.payload?.data?.pagination || initialState.courseLessonPlansPagination;
      })
      .addCase(fetchCourseLessonPlans.rejected, (state, action) => {
        state.loadingCourseLessonPlans = false;
        state.error = action.payload;
      })
      .addCase(addCourseLessonPlan.pending, (state) => {
        state.addingLessonPlan = true;
        state.error = null;
      })
      .addCase(addCourseLessonPlan.fulfilled, (state) => {
        state.addingLessonPlan = false;
      })
      .addCase(addCourseLessonPlan.rejected, (state, action) => {
        state.addingLessonPlan = false;
        state.error = action.payload;
      })
      .addCase(updateCourseLessonPlan.pending, (state) => {
        state.updatingLessonPlan = true;
        state.error = null;
      })
      .addCase(updateCourseLessonPlan.fulfilled, (state) => {
        state.updatingLessonPlan = false;
      })
      .addCase(updateCourseLessonPlan.rejected, (state, action) => {
        state.updatingLessonPlan = false;
        state.error = action.payload;
      })
      .addCase(deleteCourseLessonPlan.pending, (state) => {
        state.deletingLessonPlan = true;
        state.error = null;
      })
      .addCase(deleteCourseLessonPlan.fulfilled, (state, action) => {
        state.deletingLessonPlan = false;
        const deletedId = action.payload?.lessonPlanId;
        if (deletedId) {
          state.courseLessonPlans = state.courseLessonPlans.filter((item) => item.id !== deletedId);
          state.courseLessonPlansPagination = {
            ...state.courseLessonPlansPagination,
            total: Math.max((state.courseLessonPlansPagination.total || 0) - 1, 0),
          };
        }
      })
      .addCase(deleteCourseLessonPlan.rejected, (state, action) => {
        state.deletingLessonPlan = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearLessonPlanManagementError,
  clearCourseLessonPlansState,
  resetLessonPlanManagementState,
} = lessonPlanManagementSlice.actions;

export default lessonPlanManagementSlice.reducer;
