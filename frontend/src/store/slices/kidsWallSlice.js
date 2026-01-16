import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import kidsWallService from '../../services/kidsWallService';

/**
 * Async thunk for getting all posts for admin
 */
export const fetchAllPostsForAdmin = createAsyncThunk(
  'kidsWall/fetchAllPostsForAdmin',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await kidsWallService.getAllPostsForAdmin(params);
      return response;
    } catch (error) {
      return rejectWithValue(error || 'Failed to fetch posts');
    }
  }
);

/**
 * Async thunk for approving a post
 */
export const approvePost = createAsyncThunk(
  'kidsWall/approvePost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await kidsWallService.approvePost(postId);
      return { postId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to approve post');
    }
  }
);

/**
 * Async thunk for rejecting a post
 */
export const rejectPost = createAsyncThunk(
  'kidsWall/rejectPost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await kidsWallService.rejectPost(postId);
      return { postId, response };
    } catch (error) {
      return rejectWithValue(error || 'Failed to reject post');
    }
  }
);

// Initial state
const initialState = {
  // List of posts
  posts: [],
  // Pagination
  pagination: {
    page: 1,
    limit: 5,
    total: 0,
    pages: 0,
  },
  // Filters
  filters: {
    isApproved: undefined, // true/false/pending
    childName: '',
    search: '',
    page: 1,
    limit: 5,
  },
  loading: false,
  error: null,
};

// KidsWall slice
const kidsWallSlice = createSlice({
  name: 'kidsWall',
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
    resetKidsWallState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch All Posts For Admin
    builder
      .addCase(fetchAllPostsForAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPostsForAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const response = action.payload;
        
        state.posts = response.data || [];
        state.pagination = response.pagination || initialState.pagination;
        state.error = null;
      })
      .addCase(fetchAllPostsForAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Approve Post
    builder
      .addCase(approvePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approvePost.fulfilled, (state, action) => {
        state.loading = false;
        const { postId, response } = action.payload;
        const approvedPost = response.data;
        
        if (approvedPost) {
          // Update post in the list
          const index = state.posts.findIndex(
            (post) => post._id === postId
          );
          if (index !== -1) {
            state.posts[index] = approvedPost;
          }
        }
        state.error = null;
      })
      .addCase(approvePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reject Post
    builder
      .addCase(rejectPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectPost.fulfilled, (state, action) => {
        state.loading = false;
        const { postId } = action.payload;
        
        // Remove post from the list (soft delete)
        state.posts = state.posts.filter((post) => post._id !== postId);
        // Update pagination total
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
          state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit);
        }
        state.error = null;
      })
      .addCase(rejectPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  resetKidsWallState,
} = kidsWallSlice.actions;

export default kidsWallSlice.reducer;
