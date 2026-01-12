import { createSlice } from '@reduxjs/toolkit';

/**
 * KidsWall Slice
 * 
 * Manages KidsWall posts state
 */

const initialState = {
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  filters: {
    isApproved: undefined,
    isActive: true,
  },
};

const kidsWallSlice = createSlice({
  name: 'kidsWall',
  initialState,
  reducers: {
    // Set posts
    setPosts: (state, action) => {
      state.posts = action.payload;
      state.error = null;
    },
    // Set current post
    setCurrentPost: (state, action) => {
      state.currentPost = action.payload;
    },
    // Add new post
    addPost: (state, action) => {
      state.posts.unshift(action.payload); // Add to beginning
    },
    // Update post
    updatePost: (state, action) => {
      const index = state.posts.findIndex(post => post._id === action.payload._id);
      if (index !== -1) {
        state.posts[index] = action.payload;
      }
    },
    // Remove post (soft delete)
    removePost: (state, action) => {
      state.posts = state.posts.filter(post => post._id !== action.payload);
    },
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // Set error
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Set filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Reset state
    reset: (state) => {
      return initialState;
    },
  },
});

export const {
  setPosts,
  setCurrentPost,
  addPost,
  updatePost,
  removePost,
  setLoading,
  setError,
  setFilters,
  clearError,
  reset,
} = kidsWallSlice.actions;

export default kidsWallSlice.reducer;
