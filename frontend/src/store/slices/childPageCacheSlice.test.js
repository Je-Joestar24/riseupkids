import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import childPageCacheReducer, { cacheStored, selectCacheEntry } from './childPageCacheSlice';
import { logoutUser } from './userSlice';

const makeStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });

describe('childPageCacheSlice — session cache for Home, Explore and Kids Wall', () => {
  it('stores data under a key, with when it was stored', () => {
    const store = makeStore();

    store.dispatch(cacheStored({ key: 'kid1:home:child', data: { name: 'Alex' }, at: 1000 }));

    expect(selectCacheEntry(store.getState(), 'kid1:home:child')).toEqual({ data: { name: 'Alex' }, at: 1000 });
  });

  it('keeps each key apart, so one child never sees another child’s data', () => {
    const store = makeStore();

    store.dispatch(cacheStored({ key: 'kid1:home:child', data: 'one', at: 1 }));
    store.dispatch(cacheStored({ key: 'kid2:home:child', data: 'two', at: 2 }));

    expect(selectCacheEntry(store.getState(), 'kid1:home:child').data).toBe('one');
    expect(selectCacheEntry(store.getState(), 'kid2:home:child').data).toBe('two');
    expect(selectCacheEntry(store.getState(), 'kid3:home:child')).toBeUndefined();
  });

  it('replaces the data when the same key is stored again', () => {
    const store = makeStore();

    store.dispatch(cacheStored({ key: 'k', data: [1], at: 1 }));
    store.dispatch(cacheStored({ key: 'k', data: [1, 2], at: 2 }));

    expect(selectCacheEntry(store.getState(), 'k')).toEqual({ data: [1, 2], at: 2 });
  });

  it('keeps empty answers (an empty list is an answer, not “nothing yet”)', () => {
    const store = makeStore();

    store.dispatch(cacheStored({ key: 'k', data: [], at: 1 }));
    store.dispatch(cacheStored({ key: 'z', data: 0, at: 1 }));

    expect(selectCacheEntry(store.getState(), 'k')).toBeDefined();
    expect(selectCacheEntry(store.getState(), 'z').data).toBe(0);
  });

  it('answers undefined for no key, without reading the cache', () => {
    expect(selectCacheEntry({}, null)).toBeUndefined();
    expect(selectCacheEntry({}, undefined)).toBeUndefined();
  });

  it.each([['fulfilled'], ['rejected']])('is emptied when logout is %s', (outcome) => {
    const store = makeStore();
    store.dispatch(cacheStored({ key: 'k', data: 1, at: 1 }));

    store.dispatch({ type: logoutUser[outcome].type });

    expect(store.getState().childPageCache).toEqual({ entries: {} });
  });
});
