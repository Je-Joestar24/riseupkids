import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childPageCacheReducer, { cacheStored } from '../store/slices/childPageCacheSlice';
import { useCachedLoad } from './useCachedLoad';

const makeStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });
const wrapperFor = (store) => ({ children }) => <Provider store={store}>{children}</Provider>;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => act(async () => {});

describe('useCachedLoad', () => {
  describe('first visit', () => {
    it('is not loaded until the answer arrives, then holds it', async () => {
      const store = makeStore();
      const pending = deferred();
      const load = vi.fn(() => pending.promise);

      const { result } = renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(store) });
      await flush();

      expect(result.current).toMatchObject({ loaded: false, data: undefined, error: null });

      pending.resolve({ stars: 5 });
      await flush();

      expect(result.current).toMatchObject({ loaded: true, data: { stars: 5 }, error: null });
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('tells the loader nothing is on screen yet', async () => {
      const load = vi.fn().mockResolvedValue(1);

      renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(makeStore()) });
      await flush();

      expect(load).toHaveBeenCalledWith({ quiet: false, previous: undefined });
    });

    it('keeps a falsy answer as an answer (an empty list, a zero)', async () => {
      const { result } = renderHook(() => useCachedLoad('kid1:a', () => Promise.resolve(0)), {
        wrapper: wrapperFor(makeStore()),
      });
      await flush();

      expect(result.current).toMatchObject({ loaded: true, data: 0 });
    });
  });

  describe('coming back', () => {
    it('has the cached answer from the very first render, and refreshes it quietly', async () => {
      const store = makeStore();
      store.dispatch(cacheStored({ key: 'kid1:a', data: 'old', at: 1 }));
      const pending = deferred();
      const load = vi.fn(() => pending.promise);

      const { result } = renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(store) });

      // Before any effect or request has finished
      expect(result.current).toMatchObject({ loaded: true, data: 'old' });
      await flush();
      expect(result.current).toMatchObject({ loaded: true, data: 'old' });
      expect(load).toHaveBeenCalledWith({ quiet: true, previous: 'old' });

      pending.resolve('new');
      await flush();
      expect(result.current.data).toBe('new');
    });

    it('a second page using the same store sees what the first one loaded', async () => {
      const store = makeStore();
      const first = renderHook(() => useCachedLoad('kid1:a', () => Promise.resolve('answer')), {
        wrapper: wrapperFor(store),
      });
      await flush();
      first.unmount();

      const second = renderHook(() => useCachedLoad('kid1:a', () => new Promise(() => {})), {
        wrapper: wrapperFor(store),
      });

      expect(second.result.current).toMatchObject({ loaded: true, data: 'answer' });
    });

    it('does not show another key’s data', async () => {
      const store = makeStore();
      store.dispatch(cacheStored({ key: 'kid1:a', data: 'kid one', at: 1 }));

      const { result } = renderHook(() => useCachedLoad('kid2:a', () => new Promise(() => {})), {
        wrapper: wrapperFor(store),
      });

      expect(result.current).toMatchObject({ loaded: false, data: undefined });
    });
  });

  describe('failures', () => {
    it('reports the message while nothing is cached', async () => {
      const { result } = renderHook(
        () => useCachedLoad('kid1:a', () => Promise.reject(new Error('Server error'))),
        { wrapper: wrapperFor(makeStore()) }
      );
      await flush();

      expect(result.current).toMatchObject({ loaded: false, error: 'Server error' });
    });

    it('accepts a plain string as the message', async () => {
      const { result } = renderHook(() => useCachedLoad('kid1:a', () => Promise.reject('Network down')), {
        wrapper: wrapperFor(makeStore()),
      });
      await flush();

      expect(result.current.error).toBe('Network down');
    });

    it('stays silent, and keeps the cached answer, when a refresh fails', async () => {
      const store = makeStore();
      store.dispatch(cacheStored({ key: 'kid1:a', data: 'old', at: 1 }));

      const { result } = renderHook(() => useCachedLoad('kid1:a', () => Promise.reject('Server error')), {
        wrapper: wrapperFor(store),
      });
      await flush();

      expect(result.current).toMatchObject({ loaded: true, data: 'old', error: null });
    });

    it('Try again clears the message while it loads, then shows the answer', async () => {
      const store = makeStore();
      const load = vi.fn().mockRejectedValueOnce('Network down');
      const { result } = renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(store) });
      await flush();
      expect(result.current.error).toBe('Network down');

      const retry = deferred();
      load.mockReturnValueOnce(retry.promise);
      let attempt;
      act(() => {
        attempt = result.current.refresh();
      });
      expect(result.current.error).toBeNull();

      retry.resolve('fine');
      await act(async () => attempt);
      expect(result.current).toMatchObject({ loaded: true, data: 'fine', error: null });
    });

    it('drops an earlier message once something is cached for that key', async () => {
      const { result } = renderHook(
        () => useCachedLoad('kid1:a', () => Promise.reject(new Error('Server error'))),
        { wrapper: wrapperFor(makeStore()) }
      );
      await flush();
      expect(result.current.error).toBe('Server error');

      act(() => result.current.setData(['from another part of the page']));

      expect(result.current).toMatchObject({ loaded: true, error: null });
    });

    it('refresh rejects when the request fails, so a caller can react', async () => {
      const load = vi.fn().mockResolvedValueOnce('ok').mockRejectedValueOnce(new Error('boom'));
      const { result } = renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(makeStore()) });
      await flush();

      await expect(result.current.refresh()).rejects.toThrow('boom');
    });

    it('does not carry one key’s message over to another key', async () => {
      const store = makeStore();
      const { result, rerender } = renderHook(
        ({ cacheKey }) =>
          useCachedLoad(cacheKey, () =>
            cacheKey === 'kid1:a' ? Promise.reject('first failed') : new Promise(() => {})
          ),
        { wrapper: wrapperFor(store), initialProps: { cacheKey: 'kid1:a' } }
      );
      await flush();
      expect(result.current.error).toBe('first failed');

      rerender({ cacheKey: 'kid1:b' });
      await flush();

      expect(result.current.error).toBeNull();
    });
  });

  describe('requests', () => {
    it('two parts of a page asking for the same thing share one request', async () => {
      const store = makeStore();
      const pending = deferred();
      const load = vi.fn(() => pending.promise);

      renderHook(
        () => {
          useCachedLoad('kid1:a', load);
          useCachedLoad('kid1:a', load);
        },
        { wrapper: wrapperFor(store) }
      );
      await flush();

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('different stores never share a request', async () => {
      const load = vi.fn(() => new Promise(() => {}));

      renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(makeStore()) });
      renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(makeStore()) });
      await flush();

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('can ask again once the first request has finished', async () => {
      const load = vi.fn().mockResolvedValue('x');
      const { result } = renderHook(() => useCachedLoad('kid1:a', load), { wrapper: wrapperFor(makeStore()) });
      await flush();

      await act(async () => {
        await result.current.refresh();
      });

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('uses the latest loader, not the one from the first render', async () => {
      const store = makeStore();
      const first = vi.fn().mockResolvedValue('first');
      const second = vi.fn().mockResolvedValue('second');
      const { result, rerender } = renderHook(({ load }) => useCachedLoad('kid1:a', load), {
        wrapper: wrapperFor(store),
        initialProps: { load: first },
      });
      await flush();

      rerender({ load: second });
      await act(async () => {
        await result.current.refresh();
      });

      expect(second).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe('second');
    });
  });

  describe('not loading', () => {
    it('does nothing without a key', async () => {
      const load = vi.fn();

      const { result } = renderHook(() => useCachedLoad(null, load), { wrapper: wrapperFor(makeStore()) });
      await flush();

      expect(load).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ loaded: false, data: undefined, error: null });
      await expect(result.current.refresh()).resolves.toBeUndefined();
    });

    it('does not load on mount when disabled, but still reads the cache and loads on refresh', async () => {
      const store = makeStore();
      store.dispatch(cacheStored({ key: 'kid1:a', data: 'cached', at: 1 }));
      const load = vi.fn().mockResolvedValue('fresh');

      const { result } = renderHook(() => useCachedLoad('kid1:a', load, { enabled: false }), {
        wrapper: wrapperFor(store),
      });
      await flush();

      expect(load).not.toHaveBeenCalled();
      expect(result.current.data).toBe('cached');

      await act(async () => {
        await result.current.refresh();
      });
      expect(result.current.data).toBe('fresh');
    });
  });

  describe('setData', () => {
    it('changes the cached answer with a function of the current one', async () => {
      const store = makeStore();
      store.dispatch(cacheStored({ key: 'kid1:a', data: [1, 2], at: 1 }));
      const { result } = renderHook(() => useCachedLoad('kid1:a', null, { enabled: false }), {
        wrapper: wrapperFor(store),
      });

      act(() => result.current.setData((list) => [...list, 3]));

      expect(result.current.data).toEqual([1, 2, 3]);
    });

    it('starts from nothing when nothing is cached yet, and accepts a plain value', async () => {
      const store = makeStore();
      const { result } = renderHook(() => useCachedLoad('kid1:a', null, { enabled: false }), {
        wrapper: wrapperFor(store),
      });

      act(() => result.current.setData((current) => ({ ...current, a: 1 })));
      act(() => result.current.setData((current) => ({ ...current, b: 2 })));
      expect(result.current.data).toEqual({ a: 1, b: 2 });

      act(() => result.current.setData('plain'));
      expect(result.current.data).toBe('plain');
      expect(result.current.loaded).toBe(true);
    });

    it('does nothing without a key', () => {
      const store = makeStore();
      const { result } = renderHook(() => useCachedLoad(null, null, { enabled: false }), {
        wrapper: wrapperFor(store),
      });

      act(() => result.current.setData('x'));

      expect(store.getState().childPageCache.entries).toEqual({});
    });
  });
});
