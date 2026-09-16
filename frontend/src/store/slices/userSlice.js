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
      // API returns { success, message, data: { user, token, ... } | { requiresOtp, email } }
      return response.data ?? response;
    } catch (error) {
      const message = error?.message || error?.response?.data?.message || 'Login failed';
      return rejectWithValue(typeof message === 'string' ? message : 'Login failed');
    }
  }
);

/**
 * Async thunk for verifying admin login OTP
 */
export const verifyLoginOtpUser = createAsyncThunk(
  'user/verifyLoginOtp',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyLoginOtp(email, code);
      return response.data ?? response;
    } catch (error) {
      const message =
        error?.message || error?.response?.data?.message || 'Invalid or expired verification code';
      return rejectWithValue(typeof message === 'string' ? message : 'Invalid or expired verification code');
    }
  }
);

/**
 * Async thunk for completing login with a TOTP/recovery code (Chunk 10)
 */
export const verifyLoginTwoFactorUser = createAsyncThunk(
  'user/verifyLoginTwoFactor',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const response = await authService.verifyLoginTwoFactor(email, code);
      return response.data ?? response;
    } catch (error) {
      const message = error?.message || error?.response?.data?.message || 'Invalid verification code';
      return rejectWithValue(typeof message === 'string' ? message : 'Invalid verification code');
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
      // Normalize to { user, token, ... } shape
      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Chunk 9: silently re-establish a session from the httpOnly refresh cookie. Dispatched exactly
 * once, at app boot (see router/AppRouter.jsx) — nothing about a session survives a hard reload /
 * new tab / reopened tab in memory, so this is what makes the session actually survive those.
 * Never rejects: no valid cookie just means "not logged in", which is a normal outcome, not an
 * error to show the user.
 */
export const bootstrapSession = createAsyncThunk('user/bootstrapSession', async () => {
  return await authService.bootstrapSession();
});

/**
 * Async thunk for getting current user
 */
export const getCurrentUser = createAsyncThunk(
  'user/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      // API returns { success, message, data: { user, childProfiles, ... } }
      return response?.data ?? response;
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
      // Normalize to { user, ... } shape
      return response?.data ?? response;
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
      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to change password');
    }
  }
);

// Chunk 9 (RUK-SEC-012(b)): nothing here is read from sessionStorage/localStorage anymore — the
// access token lives in memory only (services/tokenStore.js) and user/childProfiles/etc. live
// only in this Redux state. `loading: true` starts the app in a "checking session" state so the
// route guards (AuthedAccess/UnAuthed) wait for bootstrapSession() to resolve instead of briefly
// treating a real session as logged-out on a hard reload.
const initialState = {
  user: null,
  token: null,
  childProfiles: null,
  childProfile: null,
  parent: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  // Chunk 10: null = not applicable (non-admin) / not yet known; true/false once an admin
  // session is established. The router uses this to force an unenrolled admin into 2FA setup.
  twoFactorEnrollmentRequired: null,
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
    // Chunk 9: silent session bootstrap at app boot (see router/AppRouter.jsx)
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.authenticated) {
          state.user = action.payload.user;
          state.childProfiles = action.payload.childProfiles || null;
          state.isAuthenticated = true;
          state.twoFactorEnrollmentRequired = action.payload.twoFactorEnrollmentRequired ?? null;
        } else {
          state.user = null;
          state.childProfiles = null;
          state.childProfile = null;
          state.parent = null;
          state.isAuthenticated = false;
          state.twoFactorEnrollmentRequired = null;
        }
      })
      .addCase(bootstrapSession.rejected, (state) => {
        // authService.bootstrapSession() never throws, but guard against a truly unexpected
        // failure anyway — must not leave the app stuck on the loading spinner forever.
        state.loading = false;
        state.isAuthenticated = false;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        // Admin OTP challenge – credentials OK but no session yet
        if (action.payload?.requiresOtp) {
          state.user = null;
          state.token = null;
          state.childProfiles = null;
          state.childProfile = null;
          state.parent = null;
          state.isAuthenticated = false;
          return;
        }

        // Chunk 10: 2FA challenge (any role, TOTP) – credentials OK but no session yet
        if (action.payload?.requiresTwoFactor) {
          state.user = null;
          state.token = null;
          state.childProfiles = null;
          state.childProfile = null;
          state.parent = null;
          state.isAuthenticated = false;
          return;
        }

        state.user = action.payload.user;
        state.token = action.payload.token;
        state.childProfiles = action.payload.childProfiles || null;
        state.childProfile = action.payload.childProfile || null;
        state.parent = action.payload.parent || null;
        state.isAuthenticated = !!action.payload.token;
        state.twoFactorEnrollmentRequired = action.payload.twoFactorEnrollmentRequired ?? null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Admin login OTP verify (email-OTP fallback, only reached when TOTP isn't enrolled yet)
    builder
      .addCase(verifyLoginOtpUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyLoginOtpUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.childProfiles = action.payload.childProfiles || null;
        state.childProfile = action.payload.childProfile || null;
        state.parent = action.payload.parent || null;
        state.isAuthenticated = !!action.payload.token;
        state.twoFactorEnrollmentRequired = action.payload.twoFactorEnrollmentRequired ?? null;
        state.error = null;
      })
      .addCase(verifyLoginOtpUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Chunk 10: TOTP/recovery-code login verification
    builder
      .addCase(verifyLoginTwoFactorUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyLoginTwoFactorUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.childProfiles = action.payload.childProfiles || null;
        state.childProfile = action.payload.childProfile || null;
        state.parent = action.payload.parent || null;
        state.isAuthenticated = !!action.payload.token;
        state.twoFactorEnrollmentRequired = action.payload.twoFactorEnrollmentRequired ?? null;
        state.error = null;
      })
      .addCase(verifyLoginTwoFactorUser.rejected, (state, action) => {
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
        const payload = action.payload?.data ?? action.payload;
        state.loading = false;
        state.user = payload?.user ?? null;
        state.childProfiles = payload?.childProfiles || null;
        state.childProfile = payload?.childProfile || null;
        state.parent = payload?.parent || null;
        state.twoFactorEnrollmentRequired = payload?.twoFactorEnrollmentRequired ?? null;
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
        const payload = action.payload?.data ?? action.payload;
        state.loading = false;
        state.user = payload?.user ?? state.user;
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

