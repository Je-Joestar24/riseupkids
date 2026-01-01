import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import childrenService from '../../services/childrenService';

/**
 * Async thunk for getting all children
 */
export const fetchAllChildren = createAsyncThunk(
  'children/fetchAllChildren',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await childrenService.getAllChildren(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch children');
    }
  }
);

/**
 * Async thunk for getting single child by ID
 */
export const fetchChildById = createAsyncThunk(
  'children/fetchChildById',
  async (childId, { rejectWithValue }) => {
    try {
      const response = await childrenService.getChildById(childId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch child');
    }
  }
);

/**
 * Async thunk for creating child
 */
export const createChild = createAsyncThunk(
  'children/createChild',
  async (childData, { rejectWithValue }) => {
    try {
      const response = await childrenService.createChild(childData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create child');
    }
  }
);

/**
 * Async thunk for updating child
 */
export const updateChild = createAsyncThunk(
  'children/updateChild',
  async ({ childId, updateData }, { rejectWithValue }) => {
    try {
      const response = await childrenService.updateChild(childId, updateData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update child');
    }
  }
);

/**
 * Async thunk for deleting child
 */
export const deleteChild = createAsyncThunk(
  'children/deleteChild',
  async (childId, { rejectWithValue }) => {
    try {
      const response = await childrenService.deleteChild(childId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete child');
    }
  }
);

/**
 * Async thunk for restoring child
 */
export const restoreChild = createAsyncThunk(
  'children/restoreChild',
  async (childId, { rejectWithValue }) => {
    try {
      const response = await childrenService.restoreChild(childId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to restore child');
    }
  }
);

// Initial state
const initialState = {
  children: [],
  currentChild: null,
  filters: {
    isActive: undefined,
  },
  loading: false,
  error: null,
};

// Children slice
const childrenSlice = createSlice({
  name: 'children',
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
    clearCurrentChild: (state) => {
      state.currentChild = null;
    },
    resetChildrenState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Children
    builder
      .addCase(fetchAllChildren.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllChildren.fulfilled, (state, action) => {
        state.loading = false;
        state.children = action.payload.data || [];
        state.error = null;
      })
      .addCase(fetchAllChildren.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Child By ID
    builder
      .addCase(fetchChildById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChildById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChild = action.payload.data || null;
        state.error = null;
      })
      .addCase(fetchChildById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Child
    builder
      .addCase(createChild.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createChild.fulfilled, (state, action) => {
        state.loading = false;
        // Add new child to the list
        if (action.payload.data) {
          state.children.unshift(action.payload.data);
        }
        state.error = null;
      })
      .addCase(createChild.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Child
    builder
      .addCase(updateChild.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateChild.fulfilled, (state, action) => {
        state.loading = false;
        const updatedChild = action.payload.data;
        if (updatedChild) {
          // Update in children list
          const index = state.children.findIndex(
            (c) => c._id === updatedChild._id
          );
          if (index !== -1) {
            state.children[index] = updatedChild;
          }
          // Update current child if it's the same
          if (state.currentChild?._id === updatedChild._id) {
            state.currentChild = updatedChild;
          }
        }
        state.error = null;
      })
      .addCase(updateChild.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Delete Child
    builder
      .addCase(deleteChild.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteChild.fulfilled, (state, action) => {
        state.loading = false;
        const deletedChild = action.payload.data;
        if (deletedChild) {
          // Update in children list
          const index = state.children.findIndex(
            (c) => c._id === deletedChild._id
          );
          if (index !== -1) {
            state.children[index] = deletedChild;
          }
          // Clear current child if it's the same
          if (state.currentChild?._id === deletedChild._id) {
            state.currentChild = null;
          }
        }
        state.error = null;
      })
      .addCase(deleteChild.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Child
    builder
      .addCase(restoreChild.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreChild.fulfilled, (state, action) => {
        state.loading = false;
        const restoredChild = action.payload.data;
        if (restoredChild) {
          // Update in children list
          const index = state.children.findIndex(
            (c) => c._id === restoredChild._id
          );
          if (index !== -1) {
            state.children[index] = restoredChild;
          }
          // Update current child if it's the same
          if (state.currentChild?._id === restoredChild._id) {
            state.currentChild = restoredChild;
          }
        }
        state.error = null;
      })
      .addCase(restoreChild.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearCurrentChild,
  resetChildrenState,
} = childrenSlice.actions;
export default childrenSlice.reducer;

