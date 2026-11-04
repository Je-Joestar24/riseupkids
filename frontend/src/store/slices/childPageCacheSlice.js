import { createSlice } from '@reduxjs/toolkit';
import { logoutUser } from './userSlice';

/**
 * Session cache for the child pages that load a list or a record once per visit (Home, Explore,
 * Kids Wall). One entry per key; a key always starts with the child's id, so children never see
 * each other's data. See hooks/useCachedLoad.js for how pages use it.
 *
 * Stale-while-revalidate: a page draws the cached data at once and refreshes it quietly, so only a
 * first visit shows placeholders. Memory only (gone on reload) and emptied on logout.
 */

const initialState = {
  entries: {},
};

const childPageCacheSlice = createSlice({
  name: 'childPageCache',
  initialState,
  reducers: {
    cacheStored: (state, { payload: { key, data, at } }) => {
      state.entries[key] = { data, at };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState);
  },
});

export const { cacheStored } = childPageCacheSlice.actions;

export const selectCacheEntry = (state, key) => (key ? state.childPageCache.entries[key] : undefined);

export default childPageCacheSlice.reducer;
