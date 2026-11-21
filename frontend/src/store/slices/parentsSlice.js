import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminUsersService from '../../services/adminUsersService';
import { USER_ROLES } from '../../config/constants';

// What a rejected access call carries: the sentence to show, plus the server's code and status.
const toRejection = (error, fallback) => ({
  message: error?.message || fallback,
  code: error?.code || null,
  status: error?.status ?? null,
});

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
      return rejectWithValue(toRejection(error, 'Failed to create user'));
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
      return rejectWithValue(toRejection(error, 'Failed to update user'));
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

/**
 * Access areas for content creators (the checkboxes the admin form draws). Fetched once: asking again while it is
 * loaded or loading does nothing.
 */
export const fetchAccessAreas = createAsyncThunk(
  'parents/fetchAccessAreas',
  async (_arg, { rejectWithValue }) => {
    try {
      return await adminUsersService.getAccessAreas();
    } catch (error) {
      return rejectWithValue(toRejection(error, 'Failed to load the access areas'));
    }
  },
  {
    condition: (_arg, { getState }) => {
      const { accessAreas } = getState().parents;
      return !accessAreas.loaded && !accessAreas.loading;
    },
  }
);

/** Manage access for one creator. A refusal is rejected with { message, code, status } so the dialog can show it. */
export const setCreatorAccess = createAsyncThunk(
  'parents/setCreatorAccess',
  async ({ userId, accessAreas }, { rejectWithValue }) => {
    try {
      return await adminUsersService.setCreatorAccess(userId, accessAreas);
    } catch (error) {
      return rejectWithValue(toRejection(error, 'Failed to update access'));
    }
  }
);

/** Bulk manage access: the same list for every chosen creator. */
export const setCreatorAccessBulk = createAsyncThunk(
  'parents/setCreatorAccessBulk',
  async ({ ids, accessAreas }, { rejectWithValue }) => {
    try {
      return await adminUsersService.setCreatorAccessBulk(ids, accessAreas);
    } catch (error) {
      return rejectWithValue(toRejection(error, 'Failed to update access'));
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
  // The access checkboxes, loaded once
  accessAreas: { areas: [], legacyAreas: [], loaded: false, loading: false, error: null },
  // True while a manage-access save is running (kept apart from `loading` so the table does not flicker)
  accessSaving: false,
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
        // `error` stays a plain sentence; the code and status travel in the rejection for the dialog
        state.error = action.payload?.message || action.payload || null;
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
        state.error = action.payload?.message || action.payload || null;
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

    // Access areas (the checkboxes)
    builder
      .addCase(fetchAccessAreas.pending, (state) => {
        state.accessAreas.loading = true;
        state.accessAreas.error = null;
      })
      .addCase(fetchAccessAreas.fulfilled, (state, action) => {
        state.accessAreas = {
          areas: Array.isArray(action.payload?.areas) ? action.payload.areas : [],
          legacyAreas: Array.isArray(action.payload?.legacyAreas) ? action.payload.legacyAreas : [],
          loaded: true,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchAccessAreas.rejected, (state, action) => {
        state.accessAreas.loading = false;
        state.accessAreas.error = action.payload?.message || 'Failed to load the access areas';
      });

    // Manage access: one creator
    builder
      .addCase(setCreatorAccess.pending, (state) => {
        state.accessSaving = true;
      })
      .addCase(setCreatorAccess.fulfilled, (state, action) => {
        state.accessSaving = false;
        const updated = action.payload?.data;
        if (updated) {
          const index = state.parents.findIndex((p) => p._id === updated._id);
          if (index !== -1) state.parents[index] = updated;
          if (state.currentParent?._id === updated._id) state.currentParent = updated;
        }
      })
      .addCase(setCreatorAccess.rejected, (state) => {
        state.accessSaving = false;
      });

    // Manage access: several creators at once. Only their access list changes in the rows.
    builder
      .addCase(setCreatorAccessBulk.pending, (state) => {
        state.accessSaving = true;
      })
      .addCase(setCreatorAccessBulk.fulfilled, (state, action) => {
        state.accessSaving = false;
        const results = Array.isArray(action.payload?.data) ? action.payload.data : [];
        results.forEach((result) => {
          const row = state.parents.find((p) => p._id === result.id);
          if (row) row.accessAreas = result.accessAreas;
          if (state.currentParent?._id === result.id) state.currentParent.accessAreas = result.accessAreas;
        });
      })
      .addCase(setCreatorAccessBulk.rejected, (state) => {
        state.accessSaving = false;
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

