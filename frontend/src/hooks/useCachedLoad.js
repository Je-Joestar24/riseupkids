import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { cacheStored, selectCacheEntry } from '../store/slices/childPageCacheSlice';

// Requests under way, per store and key: two parts of a page asking for the same thing share one call.
const inflightByStore = new WeakMap();

const errorText = (error, fallback) =>
  (typeof error === 'string' ? error : error?.message) || fallback;

/**
 * Loads something for a child page once, keeps it in the session cache, and refreshes it quietly
 * every time the page opens.
 *
 *   const { data, loaded, error, refresh, setData } = useCachedLoad(key, load);
 *
 * - `key`: starts with the child's id. No key (or `enabled: false`) means nothing is loaded.
 * - `load({ quiet, previous })`: returns the data. `quiet` is true when something is already on
 *   screen (`previous` is that), so the loader can skip any popup for a failure the child did not
 *   ask about, and keep a number it could not read again. Throw to keep what is on screen.
 * - `data` is the cached value as soon as there is one; `loaded` says whether there is one. A page
 *   shows its placeholder while `!loaded && !error`.
 * - `error` is only set while nothing is cached: a failed refresh behind real content stays silent.
 * - `refresh()` loads again (also for a Try again button) and rejects on failure.
 * - `setData(updater)` changes the cached value (a like, a deleted post) without a request.
 */
export function useCachedLoad(key, load, { enabled = true } = {}) {
  const dispatch = useDispatch();
  const store = useStore();
  const entry = useSelector((state) => selectCacheEntry(state, key));
  const [failure, setFailure] = useState(null);

  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(() => {
    if (!key) return Promise.resolve(undefined);

    let inflight = inflightByStore.get(store);
    if (!inflight) {
      inflight = new Map();
      inflightByStore.set(store, inflight);
    }
    if (inflight.has(key)) return inflight.get(key);

    const previous = selectCacheEntry(store.getState(), key)?.data;
    const quiet = previous !== undefined;
    // Try again: the message gives way to the placeholder while the new request is under way.
    if (!quiet) setFailure((current) => (current?.key === key ? null : current));
    const request = Promise.resolve()
      .then(() => loadRef.current({ quiet, previous }))
      .then((data) => {
        dispatch(cacheStored({ key, data, at: Date.now() }));
        setFailure((current) => (current?.key === key ? null : current));
        return data;
      })
      .catch((error) => {
        if (!quiet) setFailure({ key, message: errorText(error, 'Something went wrong') });
        throw error;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, request);
    return request;
  }, [key, dispatch, store]);

  useEffect(() => {
    if (!enabled || !key) return;
    refresh().catch(() => {});
  }, [enabled, key, refresh]);

  const setData = useCallback(
    (updater) => {
      if (!key) return;
      const current = selectCacheEntry(store.getState(), key)?.data;
      const data = typeof updater === 'function' ? updater(current) : updater;
      dispatch(cacheStored({ key, data, at: Date.now() }));
    },
    [key, dispatch, store]
  );

  return {
    data: entry?.data,
    loaded: entry !== undefined,
    error: entry === undefined && failure?.key === key ? failure.message : null,
    refresh,
    setData,
  };
}

export default useCachedLoad;
