import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminUsersService from '../../services/adminUsersService';
import { USER_ROLES } from '../../config/constants';

/**
 * Async thunk for getting all parents
 */
export const fetchAllParents = createAsyncThunk(
  'parents/fetchAllParents',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.getUsers(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const fetchParentById = createAsyncThunk(
  'parents/fetchParentById',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.getUserById(userId, role);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch user');
    }
  }
);

export const createParent = createAsyncThunk(
  'parents/createParent',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.createUser(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create user');
    }
  }
);

export const updateParent = createAsyncThunk(
  'parents/updateParent',
  async ({ parentId, role, updateData }, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.updateUser(parentId, role, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update user');
    }
  }
);

export const archiveParent = createAsyncThunk(
  'parents/archiveParent',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.archiveUser(userId, role);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to archive user');
    }
  }
);

export const restoreParent = createAsyncThunk(
  'parents/restoreParent',
  async ({ userId, role }, { rejectWithValue }) => {
    try {
      const response = await adminUsersService.restoreUser(userId, role);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to restore user');
    }
  }
);

// Initial state
const initialState = {
  parents: [],
  currentParent: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  },
  filters: {
    role: USER_ROLES.PARENT,
    search: '',
    isActive: undefined,
    subscriptionStatus: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  },
  loading: false,
  error: null,
};

// Parents slice
const parentsSlice = createSlice({
  name: 'parents',
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
    clearCurrentParent: (state) => {
      state.currentParent = null;
    },
    resetParentsState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Parents
    builder
      .addCase(fetchAllParents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllParents.fulfilled, (state, action) => {
        state.loading = false;
        state.parents = action.payload.data || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
      })
      .addCase(fetchAllParents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Parent By ID
    builder
      .addCase(fetchParentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentParent = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchParentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Parent
    builder
      .addCase(createParent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createParent.fulfilled, (state, action) => {
        state.loading = false;
        // Add new parent to the list
        if (action.payload.data) {
          state.parents.unshift(action.payload.data);
          state.pagination.totalItems += 1;
        }
        state.error = null;
      })
      .addCase(createParent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Parent
    builder
      .addCase(updateParent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateParent.fulfilled, (state, action) => {
        state.loading = false;
        const updatedParent = action.payload.data;
        if (updatedParent) {
          // Update in parents list
          const index = state.parents.findIndex(
            (p) => p._id === updatedParent._id
          );
          if (index !== -1) {
            state.parents[index] = updatedParent;
          }
          // Update current parent if it's the same
          if (state.currentParent?._id === updatedParent._id) {
            state.currentParent = updatedParent;
          }
        }
        state.error = null;
      })
      .addCase(updateParent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Archive Parent
    builder
      .addCase(archiveParent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(archiveParent.fulfilled, (state, action) => {
        state.loading = false;
        const archivedParent = action.payload.data;
        if (archivedParent) {
          // Update in parents list
          const index = state.parents.findIndex(
            (p) => p._id === archivedParent._id
          );
          if (index !== -1) {
            state.parents[index] = archivedParent;
          }
          // Clear current parent if it's the same
          if (state.currentParent?._id === archivedParent._id) {
            state.currentParent = null;
          }
        }
        state.error = null;
      })
      .addCase(archiveParent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Parent
    builder
      .addCase(restoreParent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreParent.fulfilled, (state, action) => {
        state.loading = false;
        const restoredParent = action.payload.data;
        if (restoredParent) {
          // Update in parents list
          const index = state.parents.findIndex(
            (p) => p._id === restoredParent._id
          );
          if (index !== -1) {
            state.parents[index] = restoredParent;
          }
          // Update current parent if it's the same
          if (state.currentParent?._id === restoredParent._id) {
            state.currentParent = restoredParent;
          }
        }
        state.error = null;
      })
      .addCase(restoreParent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentParent,
  resetParentsState,
} = parentsSlice.actions;
export default parentsSlice.reducer;

