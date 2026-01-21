import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import teacherService from '../../services/teacherService';

/**
 * Async thunk for getting all teachers
 */
export const fetchAllTeachers = createAsyncThunk(
  'teachers/fetchAllTeachers',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await teacherService.getAllTeachers(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch teachers');
    }
  }
);

/**
 * Async thunk for getting single teacher by ID
 */
export const fetchTeacherById = createAsyncThunk(
  'teachers/fetchTeacherById',
  async (teacherId, { rejectWithValue }) => {
    try {
      const response = await teacherService.getTeacherById(teacherId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch teacher');
    }
  }
);

/**
 * Async thunk for creating teacher
 */
export const createTeacher = createAsyncThunk(
  'teachers/createTeacher',
  async (teacherData, { rejectWithValue }) => {
    try {
      const response = await teacherService.createTeacher(teacherData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create teacher');
    }
  }
);

/**
 * Async thunk for updating teacher
 */
export const updateTeacher = createAsyncThunk(
  'teachers/updateTeacher',
  async ({ teacherId, updateData }, { rejectWithValue }) => {
    try {
      const response = await teacherService.updateTeacher(teacherId, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update teacher');
    }
  }
);

/**
 * Async thunk for archiving teacher
 */
export const archiveTeacher = createAsyncThunk(
  'teachers/archiveTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      const response = await teacherService.archiveTeacher(teacherId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to archive teacher');
    }
  }
);

/**
 * Async thunk for restoring teacher
 */
export const restoreTeacher = createAsyncThunk(
  'teachers/restoreTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      const response = await teacherService.restoreTeacher(teacherId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to restore teacher');
    }
  }
);

// Initial state
const initialState = {
  teachers: [],
  currentTeacher: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    search: '',
    isActive: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  loading: false,
  error: null,
};

// Teachers slice
const teacherSlice = createSlice({
  name: 'teachers',
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
    clearCurrentTeacher: (state) => {
      state.currentTeacher = null;
    },
    resetTeachersState: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Teachers
    builder
      .addCase(fetchAllTeachers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllTeachers.fulfilled, (state, action) => {
        state.loading = false;
        state.teachers = action.payload.data || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
      })
      .addCase(fetchAllTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Teacher By ID
    builder
      .addCase(fetchTeacherById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeacherById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTeacher = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchTeacherById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Teacher
    builder
      .addCase(createTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTeacher.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.teachers.unshift(action.payload.data);
          state.pagination.totalItems += 1;
        }
        state.error = null;
      })
      .addCase(createTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Teacher
    builder
      .addCase(updateTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeacher.fulfilled, (state, action) => {
        state.loading = false;
        const updatedTeacher = action.payload.data;
        if (updatedTeacher) {
          const index = state.teachers.findIndex((t) => t._id === updatedTeacher._id);
          if (index !== -1) {
            state.teachers[index] = updatedTeacher;
          }
          if (state.currentTeacher?._id === updatedTeacher._id) {
            state.currentTeacher = updatedTeacher;
          }
        }
        state.error = null;
      })
      .addCase(updateTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive Teacher
    builder
      .addCase(archiveTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveTeacher.fulfilled, (state, action) => {
        state.loading = false;
        const archivedTeacher = action.payload.data;
        if (archivedTeacher) {
          const index = state.teachers.findIndex((t) => t._id === archivedTeacher._id);
          if (index !== -1) {
            state.teachers[index] = archivedTeacher;
          }
          if (state.currentTeacher?._id === archivedTeacher._id) {
            state.currentTeacher = null;
          }
        }
        state.error = null;
      })
      .addCase(archiveTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Teacher
    builder
      .addCase(restoreTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreTeacher.fulfilled, (state, action) => {
        state.loading = false;
        const restoredTeacher = action.payload.data;
        if (restoredTeacher) {
          const index = state.teachers.findIndex((t) => t._id === restoredTeacher._id);
          if (index !== -1) {
            state.teachers[index] = restoredTeacher;
          }
          if (state.currentTeacher?._id === restoredTeacher._id) {
            state.currentTeacher = restoredTeacher;
          }
        }
        state.error = null;
      })
      .addCase(restoreTeacher.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentTeacher,
  resetTeachersState,
} = teacherSlice.actions;

export default teacherSlice.reducer;

