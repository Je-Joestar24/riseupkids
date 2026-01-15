import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

/**
 * Async thunk for user login
 */
export const loginUser = createAsyncThunk(
  'user/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Async thunk for user registration
 */
export const registerUser = createAsyncThunk(
  'user/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Async thunk for getting current user
 */
export const getCurrentUser = createAsyncThunk(
  'user/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get user data');
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logoutUser = createAsyncThunk(
  'user/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      return null;
    } catch (error) {
      // Even if API call fails, clear local state
      return null;
    }
  }
);

/**
 * Async thunk for updating profile
 */
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(profileData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

/**
 * Async thunk for changing password
 */
export const changePassword = createAsyncThunk(
  'user/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to change password');
    }
  }
);

// Initial state - try to load from sessionStorage
const initialState = {
  user: authService.getUserFromStorage(),
  token: authService.getTokenFromStorage(),
  childProfiles: null,
  childProfile: null,
  parent: null,
  isAuthenticated: authService.isAuthenticated(),
  loading: false,
  error: null,
};

// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.childProfiles = null;
      state.childProfile = null;
      state.parent = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    /**
     * Update child stats (totalStars, etc.) for a specific child
     * @param {Object} action.payload - { childId, stats: { totalStars, currentStreak, ... } }
     */
    updateChildStats: (state, action) => {
      const { childId, stats } = action.payload;
      
      if (!childId || !stats) return;
      
      // Update childProfiles array
      if (state.childProfiles && Array.isArray(state.childProfiles)) {
        const childIndex = state.childProfiles.findIndex(
          (child) => child._id === childId || child._id?.toString() === childId.toString()
        );
        if (childIndex !== -1) {
          // Update the child's stats
          if (!state.childProfiles[childIndex].stats) {
            state.childProfiles[childIndex].stats = {};
          }
          Object.assign(state.childProfiles[childIndex].stats, stats);
        }
      }
      
      // Update childProfile if it matches
      if (state.childProfile && 
          (state.childProfile._id === childId || state.childProfile._id?.toString() === childId.toString())) {
        if (!state.childProfile.stats) {
          state.childProfile.stats = {};
        }
        Object.assign(state.childProfile.stats, stats);
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.childProfiles = action.payload.childProfiles || null;
        state.childProfile = action.payload.childProfile || null;
        state.parent = action.payload.parent || null;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Get Current User
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.childProfiles = action.payload.childProfiles || null;
        state.childProfile = action.payload.childProfile || null;
        state.parent = action.payload.parent || null;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Don't clear authentication on error, let the app handle it
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.childProfiles = null;
        state.childProfile = null;
        state.parent = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        // Clear state even on error
        state.user = null;
        state.token = null;
        state.childProfiles = null;
        state.childProfile = null;
        state.parent = null;
        state.isAuthenticated = false;
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, setUser, clearUser, updateChildStats } = userSlice.actions;
export default userSlice.reducer;

