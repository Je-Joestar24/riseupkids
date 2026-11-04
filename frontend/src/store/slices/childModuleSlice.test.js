import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import childModuleReducer, {
  MODULE_PREFETCH_MIN_AGE_MS,
  fetchChildModule,
  moduleKey,
  prefetchChildModule,
  selectChildModule,
} from './childModuleSlice';
import { logoutUser } from './userSlice';
import courseProgressService from '../../services/courseProgressService';
import { prefetchImages } from '../../utils/remoteImage';

vi.mock('../../services/courseProgressService', () => ({
  default: { getCourseDetailsForChild: vi.fn() },
}));
vi.mock('../../utils/remoteImage', () => ({ prefetchImages: vi.fn() }));

const getDetails = courseProgressService.getCourseDetailsForChild;
const ok = (data) => ({ success: true, data });
const details = (extra = {}) => ({
  accessible: true,
  course: { _id: 'c1', title: 'First', coverImage: '/uploads/first.png', contents: [] },
  ...extra,
});
const makeStore = () => configureStore({ reducer: { childModule: childModuleReducer } });
const cached = (store, childId, courseId) => selectChildModule(store.getState(), childId, courseId);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('childModuleSlice — session cache for the course page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  describe('fetchChildModule', () => {
    it('stores the course for that child and returns it', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));

      const result = await store.dispatch(fetchChildModule('modKidA', 'c1'));

      expect(result).toEqual(details());
      expect(getDetails).toHaveBeenCalledWith('c1', 'modKidA');
      expect(cached(store, 'modKidA', 'c1')).toEqual(details());
    });

    it('keeps each child’s and each course’s details apart', async () => {
      const store = makeStore();
      getDetails.mockResolvedValueOnce(ok(details({ course: { _id: 'c1', title: 'A' } })));
      getDetails.mockResolvedValueOnce(ok(details({ course: { _id: 'c2', title: 'B' } })));
      getDetails.mockResolvedValueOnce(ok(details({ course: { _id: 'c1', title: 'C' } })));

      await store.dispatch(fetchChildModule('modKidB', 'c1'));
      await store.dispatch(fetchChildModule('modKidB', 'c2'));
      await store.dispatch(fetchChildModule('modKidC', 'c1'));

      expect(cached(store, 'modKidB', 'c1').course.title).toBe('A');
      expect(cached(store, 'modKidB', 'c2').course.title).toBe('B');
      expect(cached(store, 'modKidC', 'c1').course.title).toBe('C');
      expect(cached(store, 'modKidC', 'c2')).toBeUndefined();
    });

    it('shares one request between callers asking at the same moment', async () => {
      const store = makeStore();
      const pending = deferred();
      getDetails.mockReturnValue(pending.promise);

      const first = store.dispatch(fetchChildModule('modKidD', 'c1'));
      const second = store.dispatch(fetchChildModule('modKidD', 'c1'));
      pending.resolve(ok(details()));

      expect(await first).toEqual(await second);
      expect(getDetails).toHaveBeenCalledTimes(1);
    });

    it('asks again each time once the first request has finished (opening the page refreshes it)', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));

      await store.dispatch(fetchChildModule('modKidE', 'c1'));
      await store.dispatch(fetchChildModule('modKidE', 'c1'));

      expect(getDetails).toHaveBeenCalledTimes(2);
    });

    it('starts loading the course cover as soon as the details arrive', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));

      await store.dispatch(fetchChildModule('modKidF', 'c1'));

      expect(prefetchImages).toHaveBeenCalledTimes(1);
      expect(prefetchImages.mock.calls[0][0][0]).toMatch(/\/uploads\/first\.png$/);
    });

    it('does not keep a locked course, and forgets one that was open before', async () => {
      const store = makeStore();
      getDetails.mockResolvedValueOnce(ok(details()));
      await store.dispatch(fetchChildModule('modKidG', 'c1'));
      expect(cached(store, 'modKidG', 'c1')).toBeDefined();

      getDetails.mockResolvedValueOnce(ok(details({ accessible: false })));
      const result = await store.dispatch(fetchChildModule('modKidG', 'c1'));

      expect(result.accessible).toBe(false);
      expect(cached(store, 'modKidG', 'c1')).toBeUndefined();
      expect(store.getState().childModule.fetchedAtByKey[moduleKey('modKidG', 'c1')]).toBeUndefined();
    });

    it('does not load the cover of a locked course', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details({ accessible: false })));

      await store.dispatch(fetchChildModule('modKidH', 'c1'));

      expect(prefetchImages).not.toHaveBeenCalled();
    });

    it('rejects on failure and leaves a cached course in place', async () => {
      const store = makeStore();
      getDetails.mockResolvedValueOnce(ok(details()));
      await store.dispatch(fetchChildModule('modKidI', 'c1'));

      getDetails.mockRejectedValueOnce(new Error('Server error'));
      await expect(store.dispatch(fetchChildModule('modKidI', 'c1'))).rejects.toThrow('Server error');

      expect(cached(store, 'modKidI', 'c1')).toEqual(details());
    });

    it('treats an unsuccessful response as a failure, with the server’s message', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue({ success: false, message: 'Not allowed' });

      await expect(store.dispatch(fetchChildModule('modKidJ', 'c1'))).rejects.toThrow('Not allowed');
      expect(cached(store, 'modKidJ', 'c1')).toBeUndefined();
    });

    it('can ask again after a failure (a failed request is not kept as in progress)', async () => {
      const store = makeStore();
      getDetails.mockRejectedValueOnce('boom');
      await expect(store.dispatch(fetchChildModule('modKidK', 'c1'))).rejects.toBe('boom');

      getDetails.mockResolvedValueOnce(ok(details()));
      await store.dispatch(fetchChildModule('modKidK', 'c1'));

      expect(getDetails).toHaveBeenCalledTimes(2);
      expect(cached(store, 'modKidK', 'c1')).toBeDefined();
    });
  });

  describe('prefetchChildModule — a card was pressed or hovered', () => {
    it('starts the request and fills the cache', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));

      store.dispatch(prefetchChildModule('preKidA', 'c1'));
      await vi.advanceTimersByTimeAsync(0);

      expect(getDetails).toHaveBeenCalledTimes(1);
      expect(cached(store, 'preKidA', 'c1')).toEqual(details());
    });

    it('does nothing without a child or a course', () => {
      const store = makeStore();

      store.dispatch(prefetchChildModule('', 'c1'));
      store.dispatch(prefetchChildModule('preKidB', undefined));

      expect(getDetails).not.toHaveBeenCalled();
    });

    it('does not repeat a request that is already under way', () => {
      const store = makeStore();
      getDetails.mockReturnValue(new Promise(() => {}));

      store.dispatch(prefetchChildModule('preKidC', 'c1'));
      store.dispatch(prefetchChildModule('preKidC', 'c1'));

      expect(getDetails).toHaveBeenCalledTimes(1);
    });

    it('does not repeat a course fetched within the last 30 s, but does after that', async () => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));
      await store.dispatch(fetchChildModule('preKidD', 'c1'));

      vi.advanceTimersByTime(MODULE_PREFETCH_MIN_AGE_MS - 1);
      store.dispatch(prefetchChildModule('preKidD', 'c1'));
      expect(getDetails).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2);
      store.dispatch(prefetchChildModule('preKidD', 'c1'));
      expect(getDetails).toHaveBeenCalledTimes(2);
    });

    it('never rejects: a failed prefetch is silent, and the page asks again when it opens', async () => {
      const store = makeStore();
      getDetails.mockRejectedValueOnce('Network down');

      store.dispatch(prefetchChildModule('preKidE', 'c1'));
      await vi.advanceTimersByTimeAsync(0);

      expect(cached(store, 'preKidE', 'c1')).toBeUndefined();

      getDetails.mockResolvedValueOnce(ok(details()));
      store.dispatch(prefetchChildModule('preKidE', 'c1'));
      await vi.advanceTimersByTimeAsync(0);
      expect(getDetails).toHaveBeenCalledTimes(2);
    });

    it('lets the page join the request instead of asking twice', async () => {
      const store = makeStore();
      const pending = deferred();
      getDetails.mockReturnValue(pending.promise);

      store.dispatch(prefetchChildModule('preKidF', 'c1'));
      const page = store.dispatch(fetchChildModule('preKidF', 'c1'));
      pending.resolve(ok(details()));

      expect(await page).toEqual(details());
      expect(getDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it.each([['fulfilled'], ['rejected']])('empties the cache when logout is %s', async (outcome) => {
      const store = makeStore();
      getDetails.mockResolvedValue(ok(details()));
      await store.dispatch(fetchChildModule('outKid', 'c1'));

      store.dispatch({ type: logoutUser[outcome].type });

      expect(store.getState().childModule).toEqual({ detailsByKey: {}, fetchedAtByKey: {} });
    });
  });
});
