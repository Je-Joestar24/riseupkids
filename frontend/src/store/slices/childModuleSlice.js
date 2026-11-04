import { createSlice } from '@reduxjs/toolkit';
import courseProgressService from '../../services/courseProgressService';
import { getCoverImageUrl } from '../../utils/coverImageUrl';
import { prefetchImages } from '../../utils/remoteImage';
import { logoutUser } from './userSlice';

/**
 * Session cache for a course's details (the course page), keyed by child and course.
 *
 * Stale-while-revalidate: a cached course renders at once and a refresh leaves it on screen, so
 * opening a course again does not show its skeleton. A card can start the request before the page
 * opens (prefetch); the page then joins that request instead of making its own.
 * Only courses the child can open are kept. Memory only (gone on reload) and emptied on logout.
 */

/** A prefetch does not repeat a request for a course fetched more recently than this. */
export const MODULE_PREFETCH_MIN_AGE_MS = 30 * 1000;

export const moduleKey = (childId, courseId) => `${childId}:${courseId}`;

const initialState = {
  detailsByKey: {},
  fetchedAtByKey: {},
};

const childModuleSlice = createSlice({
  name: 'childModule',
  initialState,
  reducers: {
    moduleReceived: (state, { payload: { key, details, at } }) => {
      state.detailsByKey[key] = details;
      state.fetchedAtByKey[key] = at;
    },
    // A course that turned out to be locked must not be shown from the cache next time.
    moduleDropped: (state, { payload: { key } }) => {
      delete state.detailsByKey[key];
      delete state.fetchedAtByKey[key];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState);
  },
});

export const { moduleReceived, moduleDropped } = childModuleSlice.actions;

const inflightByKey = new Map();

/**
 * Load (or refresh) a course for a child. Requests for the same course at the same moment share
 * one call. Resolves to the details, which may say `accessible: false` (then nothing is kept);
 * rejects on failure (the cached course, if any, is left in place).
 */
export const fetchChildModule = (childId, courseId) => (dispatch) => {
  const key = moduleKey(childId, courseId);
  if (inflightByKey.has(key)) return inflightByKey.get(key);

  const request = courseProgressService
    .getCourseDetailsForChild(courseId, childId)
    .then((response) => {
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Failed to fetch course details');
      }
      const details = response.data;
      if (details.accessible) {
        dispatch(moduleReceived({ key, details, at: Date.now() }));
        prefetchImages([getCoverImageUrl(details.course?.coverImage)]);
      } else {
        dispatch(moduleDropped({ key }));
      }
      return details;
    })
    .finally(() => {
      inflightByKey.delete(key);
    });

  inflightByKey.set(key, request);
  return request;
};

/**
 * Start loading a course the child is about to open (a card was pressed or hovered). Does nothing
 * if the course is already being loaded or was loaded a moment ago. Never rejects: if it fails,
 * the page asks again when it opens.
 */
export const prefetchChildModule = (childId, courseId) => (dispatch, getState) => {
  if (!childId || !courseId) return;
  const key = moduleKey(childId, courseId);
  if (inflightByKey.has(key)) return;
  const fetchedAt = getState().childModule.fetchedAtByKey[key];
  if (fetchedAt !== undefined && Date.now() - fetchedAt < MODULE_PREFETCH_MIN_AGE_MS) return;
  dispatch(fetchChildModule(childId, courseId)).catch(() => {});
};

export const selectChildModule = (state, childId, courseId) =>
  state.childModule.detailsByKey[moduleKey(childId, courseId)];

export default childModuleSlice.reducer;
