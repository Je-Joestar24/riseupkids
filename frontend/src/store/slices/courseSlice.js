import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseService from '../../services/courseService';

/**
 * Async thunk for getting all courses
 */
export const fetchAllCourses = createAsyncThunk(
  'course/fetchAllCourses',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await courseService.getAllCourses(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch courses');
    }
  }
);

/**
 * Async thunk for creating a course
 */
export const createCourse = createAsyncThunk(
  'course/createCourse',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await courseService.createCourse(formData);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to create course');
    }
  }
);

/**
 * Async thunk for getting single course by ID
 */
export const fetchCourseById = createAsyncThunk(
  'course/fetchCourseById',
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await courseService.getCourseById(courseId);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch course');
    }
  }
);

/**
 * Async thunk for updating a course
 */
export const updateCourse = createAsyncThunk(
  'course/updateCourse',
  async ({ courseId, formData }, { rejectWithValue }) => {
    try {
      const response = await courseService.updateCourse(courseId, formData);
      return { courseId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to update course');
    }
  }
);

/**
 * Async thunk for archiving a course
 */
export const archiveCourse = createAsyncThunk(
  'course/archiveCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await courseService.archiveCourse(courseId);
      return { courseId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to archive course');
    }
  }
);

/**
 * Async thunk for unarchiving a course
 */
export const unarchiveCourse = createAsyncThunk(
  'course/unarchiveCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await courseService.unarchiveCourse(courseId);
      return { courseId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to unarchive course');
    }
  }
);

/**
 * Async thunk for deleting a course (permanent)
 */
export const deleteCourse = createAsyncThunk(
  'course/deleteCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      const response = await courseService.deleteCourse(courseId);
      return { courseId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to delete course');
    }
  }
);

/**
 * Async thunk for reordering courses
 */
export const reorderCourses = createAsyncThunk(
  'course/reorderCourses',
  async ({ courseIds, startIndex = 0 }, { rejectWithValue }) => {
    try {
      const response = await courseService.reorderCourses(courseIds, startIndex);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to reorder courses');
    }
  }
);

/**
 * Async thunk for reordering course contents
 */
export const reorderCourseContents = createAsyncThunk(
  'course/reorderCourseContents',
  async ({ courseId, contentType, contentIds }, { rejectWithValue }) => {
    try {
      const response = await courseService.reorderCourseContents(courseId, contentType, contentIds);
      return { courseId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to reorder course contents');
    }
  }
);

// Initial state
const initialState = {
  // List of courses
  courses: [],
  // Current course being viewed/edited
  currentCourse: null,
  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    isPublished: undefined,
    isArchived: false, // Default: exclude archived courses
    search: '',
    sortBy: 'createdAt', // Default: sort by createdAt descending
    page: 1,
    limit: 10,
  },
  // Content creation drawer state
  contentDrawer: {
    open: false,
    contentType: null,
  },
  loading: false,
  error: null,
};

// Course slice
const courseSlice = createSlice({
  name: 'course',
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
    clearCurrentCourse: (state) => {
      state.currentCourse = null;
    },
    // Content drawer management
    openContentDrawer: (state, action) => {
      state.contentDrawer.open = true;
      state.contentDrawer.contentType = action.payload || null;
    },
    closeContentDrawer: (state) => {
      state.contentDrawer.open = false;
      state.contentDrawer.contentType = null;
    },
    resetCourseState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Courses
    builder
      .addCase(fetchAllCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCourses.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        state.courses = response.data || [];
        state.pagination = response.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Course
    builder
      .addCase(createCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        // Add new course to the list
        if (response.data) {
          state.courses.unshift(response.data);
          state.pagination.total += 1;
        }
        state.error = null;
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Course By ID
    builder
      .addCase(fetchCourseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.data) {
          state.currentCourse = response.data;
        }
        state.error = null;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Course
    builder
      .addCase(updateCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.loading = false;
        const { courseId, response } = action.payload;
        const updatedCourse = response.data;
        
        if (updatedCourse) {
          // Update in courses list
          const index = state.courses.findIndex(
            (course) => course._id === courseId
          );
          if (index !== -1) {
            state.courses[index] = updatedCourse;
          }
          
          // Update current course if it's the same
          if (state.currentCourse?._id === courseId) {
            state.currentCourse = updatedCourse;
          }
        }
        state.error = null;
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive Course
    builder
      .addCase(archiveCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveCourse.fulfilled, (state, action) => {
        state.loading = false;
        const { courseId } = action.payload;
        
        // Update course in list to mark as archived
        const index = state.courses.findIndex(
          (course) => course._id === courseId
        );
        if (index !== -1) {
          state.courses[index].isArchived = true;
          // Remove from list if not showing archived courses
          if (!state.filters.isArchived) {
            state.courses = state.courses.filter(
              (course) => course._id !== courseId
            );
            state.pagination.total = Math.max(0, state.pagination.total - 1);
          }
        }
        
        // Update current course if it's the same
        if (state.currentCourse?._id === courseId) {
          state.currentCourse.isArchived = true;
        }
        state.error = null;
      })
      .addCase(archiveCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Unarchive Course
    builder
      .addCase(unarchiveCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unarchiveCourse.fulfilled, (state, action) => {
        state.loading = false;
        const { courseId } = action.payload;
        
        // Update course in list to mark as unarchived
        const index = state.courses.findIndex(
          (course) => course._id === courseId
        );
        if (index !== -1) {
          state.courses[index].isArchived = false;
        }
        
        // Update current course if it's the same
        if (state.currentCourse?._id === courseId) {
          state.currentCourse.isArchived = false;
        }
        state.error = null;
      })
      .addCase(unarchiveCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Course
    builder
      .addCase(deleteCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.loading = false;
        const { courseId } = action.payload;
        
        // Remove from courses list
        state.courses = state.courses.filter(
          (course) => course._id !== courseId
        );
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        
        // Clear current course if it's the same
        if (state.currentCourse?._id === courseId) {
          state.currentCourse = null;
        }
        state.error = null;
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reorder Courses
    builder
      .addCase(reorderCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderCourses.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        if (response.data && response.data.courses) {
          // Update courses in the list with new stepOrder values
          const updatedCourses = response.data.courses;
          const courseMap = new Map();
          
          // Create a map of updated courses
          updatedCourses.forEach((course) => {
            courseMap.set(course._id, course);
          });
          
          // Update courses in the current list
          state.courses = state.courses.map((course) => {
            const updated = courseMap.get(course._id);
            return updated || course;
          });
          
          // Update current course if it was reordered
          if (state.currentCourse) {
            const updatedCurrent = courseMap.get(state.currentCourse._id);
            if (updatedCurrent) {
              state.currentCourse = updatedCurrent;
            }
          }
        }
        
        state.error = null;
      })
      .addCase(reorderCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reorder Course Contents
    builder
      .addCase(reorderCourseContents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reorderCourseContents.fulfilled, (state, action) => {
        state.loading = false;
        const { courseId, response } = action.payload;
        const updatedCourse = response.data?.course;
        
        if (updatedCourse) {
          // Update course in courses list
          const index = state.courses.findIndex(
            (course) => course._id === courseId
          );
          if (index !== -1) {
            state.courses[index] = updatedCourse;
          }
          
          // Update current course if it's the same
          if (state.currentCourse?._id === courseId) {
            state.currentCourse = updatedCourse;
          }
        }
        state.error = null;
      })
      .addCase(reorderCourseContents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentCourse,
  openContentDrawer,
  closeContentDrawer,
  resetCourseState,
} = courseSlice.actions;
export default courseSlice.reducer;

