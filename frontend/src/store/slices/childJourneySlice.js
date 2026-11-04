import { createSlice } from '@reduxjs/toolkit';
import courseProgressService from '../../services/courseProgressService';
import { getCoverImageUrl } from '../../utils/coverImageUrl';
import { prefetchImages } from '../../utils/remoteImage';
import { logoutUser } from './userSlice';

/**
 * Session cache for My Journey courses-with-progress, keyed by childId.
 *
 * Stale-while-revalidate: a cached list renders at once and a refresh leaves it on screen, so the
 * page is not blanked. A page shows its skeleton only while nothing is cached and no error is set.
 * Memory only (gone on reload) and emptied on logout.
 */

/** A page that comes back into view re-fetches the list only if it is older than this. */
export const JOURNEY_REFRESH_MIN_AGE_MS = 30 * 1000;

const initialState = {
  coursesByChildId: {},
  errorByChildId: {},
  fetchedAtByChildId: {},
};

const childJourneySlice = createSlice({
  name: 'childJourney',
  initialState,
  reducers: {
    journeyRequested: (state, { payload: { childId } }) => {
      state.errorByChildId[childId] = null;
    },
    journeyReceived: (state, { payload: { childId, courses, at } }) => {
      state.coursesByChildId[childId] = courses;
      state.fetchedAtByChildId[childId] = at;
      state.errorByChildId[childId] = null;
    },
    journeyFailed: (state, { payload: { childId, error } }) => {
      state.errorByChildId[childId] = error;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(logoutUser.rejected, () => initialState);
  },
});

export const { journeyRequested, journeyReceived, journeyFailed } = childJourneySlice.actions;

const inflightByChildId = new Map();

const errorMessage = (err) =>
  (typeof err === 'string' ? err : err?.message) || 'Failed to fetch child courses';

/**
 * Load (or refresh) a child's courses. Requests for the same child at the same moment share one
 * call. With `minAgeMs`, a list fetched more recently than that is returned without a request.
 * Resolves to the list; rejects on failure (the cached list, if any, is left in place).
 */
export const fetchChildJourney = (childId, { minAgeMs = 0 } = {}) => (dispatch, getState) => {
  const { coursesByChildId, fetchedAtByChildId } = getState().childJourney;
  const cached = coursesByChildId[childId];

  if (cached !== undefined && minAgeMs > 0 && Date.now() - fetchedAtByChildId[childId] < minAgeMs) {
    return Promise.resolve(cached);
  }
  if (inflightByChildId.has(childId)) return inflightByChildId.get(childId);

  dispatch(journeyRequested({ childId }));

  const request = courseProgressService
    .getChildCourses(childId)
    .then((response) => {
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Failed to fetch courses');
      }
      dispatch(journeyReceived({ childId, courses: response.data, at: Date.now() }));
      // Only the covers at the top; the rest load as their cards are shown.
      prefetchImages(response.data.map((item) => getCoverImageUrl(item.course?.coverImage)));
      return response.data;
    })
    .catch((err) => {
      dispatch(journeyFailed({ childId, error: errorMessage(err) }));
      throw err;
    })
    .finally(() => {
      inflightByChildId.delete(childId);
    });

  inflightByChildId.set(childId, request);
  return request;
};

/**
 * Start loading the list ahead of the page that shows it (Home does this, so My Journey opens
 * already filled). Does nothing if a list is cached or being loaded. Never rejects: if it
 * fails, My Journey asks again when it opens.
 */
export const prefetchChildJourney = (childId) => (dispatch, getState) => {
  if (!childId) return;
  if (getState().childJourney.coursesByChildId[childId] !== undefined) return;
  if (inflightByChildId.has(childId)) return;
  dispatch(fetchChildJourney(childId)).catch(() => {});
};

export const selectChildJourney = (state) => state.childJourney;

export default childJourneySlice.reducer;
