import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer, { fetchChildJourney, prefetchChildJourney } from './childJourneySlice';
import { logoutUser } from './userSlice';
import courseProgressService from '../../services/courseProgressService';
import { prefetchImages } from '../../utils/remoteImage';

vi.mock('../../services/courseProgressService', () => ({
  default: { getChildCourses: vi.fn() },
}));
vi.mock('../../utils/remoteImage', () => ({ prefetchImages: vi.fn() }));

const getCourses = courseProgressService.getChildCourses;
const ok = (data) => ({ success: true, data });
const makeStore = () => configureStore({ reducer: { childJourney: childJourneyReducer } });
const journey = (store) => store.getState().childJourney;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('childJourneySlice — session cache for My Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('stores the courses per child and returns them', async () => {
    const store = makeStore();
    getCourses.mockResolvedValue(ok([{ course: { _id: 'c1' } }]));

    const list = await store.dispatch(fetchChildJourney('kid1'));

    expect(list).toEqual([{ course: { _id: 'c1' } }]);
    expect(journey(store).coursesByChildId.kid1).toEqual(list);
    expect(journey(store).coursesByChildId.kid2).toBeUndefined();
    expect(journey(store).errorByChildId.kid1).toBeNull();
  });

  it('keeps each child’s list separate', async () => {
    const store = makeStore();
    getCourses.mockResolvedValueOnce(ok([{ course: { _id: 'a' } }]));
    getCourses.mockResolvedValueOnce(ok([{ course: { _id: 'b' } }]));

    await store.dispatch(fetchChildJourney('kid1'));
    await store.dispatch(fetchChildJourney('kid2'));

    expect(journey(store).coursesByChildId.kid1[0].course._id).toBe('a');
    expect(journey(store).coursesByChildId.kid2[0].course._id).toBe('b');
  });

  it('shares one request between callers asking at the same moment', async () => {
    const store = makeStore();
    const pending = deferred();
    getCourses.mockReturnValue(pending.promise);

    const first = store.dispatch(fetchChildJourney('kid1'));
    const second = store.dispatch(fetchChildJourney('kid1'));
    pending.resolve(ok([{ course: { _id: 'c1' } }]));

    expect(await first).toEqual(await second);
    expect(getCourses).toHaveBeenCalledTimes(1);
  });

  it('can ask again once the first request has finished', async () => {
    const store = makeStore();
    getCourses.mockResolvedValue(ok([]));

    await store.dispatch(fetchChildJourney('kid1'));
    await store.dispatch(fetchChildJourney('kid1'));

    expect(getCourses).toHaveBeenCalledTimes(2);
  });

  describe('minAgeMs — quiet refresh when coming back to the tab', () => {
    it('reuses a list fetched more recently, with no request', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([{ course: { _id: 'c1' } }]));
      await store.dispatch(fetchChildJourney('kid1'));

      vi.advanceTimersByTime(10_000);
      const list = await store.dispatch(fetchChildJourney('kid1', { minAgeMs: 30_000 }));

      expect(getCourses).toHaveBeenCalledTimes(1);
      expect(list).toEqual([{ course: { _id: 'c1' } }]);
    });

    it('fetches again once the list is older than the limit', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([]));
      await store.dispatch(fetchChildJourney('kid1'));

      vi.advanceTimersByTime(30_001);
      await store.dispatch(fetchChildJourney('kid1', { minAgeMs: 30_000 }));

      expect(getCourses).toHaveBeenCalledTimes(2);
    });

    it('always fetches when nothing is cached, whatever the limit', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([]));

      await store.dispatch(fetchChildJourney('kid1', { minAgeMs: 30_000 }));

      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('without a limit always refreshes (opening the page)', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([]));
      await store.dispatch(fetchChildJourney('kid1'));

      await store.dispatch(fetchChildJourney('kid1'));

      expect(getCourses).toHaveBeenCalledTimes(2);
    });
  });

  describe('failures', () => {
    it('records the error when there is nothing cached, and rejects', async () => {
      const store = makeStore();
      getCourses.mockRejectedValue('Network down');

      await expect(store.dispatch(fetchChildJourney('kid1'))).rejects.toBe('Network down');

      expect(journey(store).errorByChildId.kid1).toBe('Network down');
      expect(journey(store).coursesByChildId.kid1).toBeUndefined();
    });

    it('leaves the cached list in place when a refresh fails', async () => {
      const store = makeStore();
      getCourses.mockResolvedValueOnce(ok([{ course: { _id: 'c1' } }]));
      await store.dispatch(fetchChildJourney('kid1'));

      getCourses.mockRejectedValueOnce(new Error('Server error'));
      await expect(store.dispatch(fetchChildJourney('kid1'))).rejects.toThrow('Server error');

      expect(journey(store).coursesByChildId.kid1).toEqual([{ course: { _id: 'c1' } }]);
      expect(journey(store).errorByChildId.kid1).toBe('Server error');
    });

    it('treats an unsuccessful response as a failure', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue({ success: false, message: 'Not allowed' });

      await expect(store.dispatch(fetchChildJourney('kid1'))).rejects.toThrow('Not allowed');

      expect(journey(store).errorByChildId.kid1).toBe('Not allowed');
    });

    it('clears the error when the next request starts, and after it succeeds', async () => {
      const store = makeStore();
      getCourses.mockRejectedValueOnce('boom');
      await expect(store.dispatch(fetchChildJourney('kid1'))).rejects.toBe('boom');

      const retry = deferred();
      getCourses.mockReturnValueOnce(retry.promise);
      const pending = store.dispatch(fetchChildJourney('kid1'));
      expect(journey(store).errorByChildId.kid1).toBeNull();

      retry.resolve(ok([]));
      await pending;
      expect(journey(store).coursesByChildId.kid1).toEqual([]);
    });

    it('can ask again after a failure (a failed request is not kept as in progress)', async () => {
      const store = makeStore();
      getCourses.mockRejectedValueOnce('boom');
      await expect(store.dispatch(fetchChildJourney('kid1'))).rejects.toBe('boom');

      getCourses.mockResolvedValueOnce(ok([{ course: { _id: 'c1' } }]));
      await store.dispatch(fetchChildJourney('kid1'));

      expect(getCourses).toHaveBeenCalledTimes(2);
    });
  });

  describe('covers', () => {
    const withCover = (id, coverImage) => ({ course: { _id: id, coverImage } });

    it('starts loading the covers, in list order, when the list arrives', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(
        ok([withCover('a', '/uploads/a.png'), withCover('b', 'https://cdn.example/b.png'), withCover('c')])
      );

      await store.dispatch(fetchChildJourney('coverKid'));

      expect(prefetchImages).toHaveBeenCalledTimes(1);
      const urls = prefetchImages.mock.calls[0][0];
      expect(urls[0]).toMatch(/\/uploads\/a\.png$/);
      expect(urls[1]).toBe('https://cdn.example/b.png');
      expect(urls[2]).toBeNull();
    });

    it('loads no covers when the request fails', async () => {
      const store = makeStore();
      getCourses.mockRejectedValue('Network down');

      await expect(store.dispatch(fetchChildJourney('coverKid2'))).rejects.toBe('Network down');

      expect(prefetchImages).not.toHaveBeenCalled();
    });
  });

  describe('prefetchChildJourney — started from Home', () => {
    it('loads the list into the cache', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([{ course: { _id: 'c1' } }]));

      store.dispatch(prefetchChildJourney('preJourneyA'));
      await vi.advanceTimersByTimeAsync(0);

      expect(journey(store).coursesByChildId.preJourneyA).toEqual([{ course: { _id: 'c1' } }]);
    });

    it('does nothing without a child', () => {
      const store = makeStore();

      store.dispatch(prefetchChildJourney(''));
      store.dispatch(prefetchChildJourney(undefined));

      expect(getCourses).not.toHaveBeenCalled();
    });

    it('does nothing when a list is already cached (the page refreshes it itself)', async () => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([]));
      await store.dispatch(fetchChildJourney('preJourneyB'));

      store.dispatch(prefetchChildJourney('preJourneyB'));

      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('does not repeat a request that is already under way', () => {
      const store = makeStore();
      getCourses.mockReturnValue(new Promise(() => {}));

      store.dispatch(prefetchChildJourney('preJourneyC'));
      store.dispatch(prefetchChildJourney('preJourneyC'));

      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('never rejects: a failure is recorded, for the page to show only if it also fails', async () => {
      const store = makeStore();
      getCourses.mockRejectedValue('Network down');

      store.dispatch(prefetchChildJourney('preJourneyD'));
      await vi.advanceTimersByTimeAsync(0);

      expect(journey(store).coursesByChildId.preJourneyD).toBeUndefined();
      expect(journey(store).errorByChildId.preJourneyD).toBe('Network down');
    });
  });

  describe('logout', () => {
    it.each([['fulfilled'], ['rejected']])('empties the cache when logout is %s', async (outcome) => {
      const store = makeStore();
      getCourses.mockResolvedValue(ok([{ course: { _id: 'c1' } }]));
      await store.dispatch(fetchChildJourney('kid1'));

      store.dispatch({ type: logoutUser[outcome].type });

      expect(journey(store)).toEqual({
        coursesByChildId: {},
        errorByChildId: {},
        fetchedAtByChildId: {},
      });
    });
  });
});
