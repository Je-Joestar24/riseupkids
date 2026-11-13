/**
 * useChildExperiences: first load, cached later visits, quiet failed refreshes, retry, and children never
 * sharing a cache.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childPageCacheReducer from '../store/slices/childPageCacheSlice';
import experienceChildService from '../services/experienceChildService';
import { useChildExperiences, useChildExperience } from './experienceChildHook';
import { EXPERIENCE_NOT_FOUND_MESSAGE } from '../utils/experienceChildFormat';

vi.mock('../services/experienceChildService', () => ({
  default: { getPublishedExperiences: vi.fn(), getPublishedExperience: vi.fn() },
}));

const card = (n) => ({ uuid: `uuid-${n}`, title: `Experience ${n}`, description: '', coverImage: null, videoCount: n });
const makeStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });
const wrapperFor = (store) => ({ children }) => <Provider store={store}>{children}</Provider>;
const settle = () => act(async () => {});
const get = experienceChildService.getPublishedExperiences;

beforeEach(() => vi.clearAllMocks());

describe('first visit', () => {
  it('is loading with an empty list until the answer arrives, then shows it', async () => {
    let resolve;
    get.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(result.current).toMatchObject({ experiences: [], loading: true, error: null });

    await act(async () => resolve([card(1), card(2)]));
    expect(result.current.loading).toBe(false);
    expect(result.current.experiences.map((e) => e.uuid)).toEqual(['uuid-1', 'uuid-2']);
  });

  it('an empty answer is "loaded, nothing there", not loading', async () => {
    get.mockResolvedValue([]);
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(result.current).toMatchObject({ experiences: [], loading: false, error: null });
  });

  it('asks the server once', async () => {
    get.mockResolvedValue([card(1)]);
    renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('keeps the order the server gave', async () => {
    get.mockResolvedValue([card(3), card(1), card(2)]);
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(result.current.experiences.map((e) => e.uuid)).toEqual(['uuid-3', 'uuid-1', 'uuid-2']);
  });

  it('a failure with nothing cached is an error (and no longer loading), with the readable message', async () => {
    get.mockRejectedValue('Network Error');
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(result.current).toMatchObject({ experiences: [], loading: false, error: 'Network Error' });
  });

  it('Try again loads again and recovers', async () => {
    get.mockRejectedValueOnce('Network Error').mockResolvedValueOnce([card(1)]);
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(result.current.error).toBe('Network Error');

    await act(async () => result.current.retry());
    expect(result.current).toMatchObject({ error: null, loading: false });
    expect(result.current.experiences).toHaveLength(1);
  });

  it('Try again that fails again keeps the error and never throws out of the click', async () => {
    get.mockRejectedValue('Network Error');
    const { result } = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(makeStore()) });
    await settle();
    await act(async () => {
      expect(() => result.current.retry()).not.toThrow();
    });
    expect(result.current.error).toBe('Network Error');
  });
});

describe('later visits', () => {
  it('draw the last answer at once (no loading) and replace it quietly', async () => {
    const store = makeStore();
    get.mockResolvedValue([card(1)]);
    const first = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) });
    await settle();
    first.unmount();

    let resolve;
    get.mockReturnValue(new Promise((r) => { resolve = r; }));
    const second = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) });
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.experiences.map((e) => e.uuid)).toEqual(['uuid-1']);

    await act(async () => resolve([card(1), card(2)]));
    expect(second.result.current.experiences.map((e) => e.uuid)).toEqual(['uuid-1', 'uuid-2']);
  });

  it('a failed refresh behind real content stays silent and keeps the content', async () => {
    const store = makeStore();
    get.mockResolvedValue([card(1)]);
    renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) }).unmount();
    await settle();

    get.mockRejectedValue('Network Error');
    const second = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) });
    await settle();
    expect(second.result.current).toMatchObject({ loading: false, error: null });
    expect(second.result.current.experiences).toHaveLength(1);
  });

  it('an experience the admin removed disappears on the next quiet refresh', async () => {
    const store = makeStore();
    get.mockResolvedValue([card(1), card(2)]);
    renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) }).unmount();
    await settle();

    get.mockResolvedValue([card(2)]);
    const second = renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) });
    await settle();
    expect(second.result.current.experiences.map((e) => e.uuid)).toEqual(['uuid-2']);
  });
});

describe('children', () => {
  it('never share a cache: another child starts from the placeholder', async () => {
    const store = makeStore();
    get.mockResolvedValue([card(1)]);
    renderHook(() => useChildExperiences('kid1'), { wrapper: wrapperFor(store) }).unmount();
    await settle();

    get.mockReturnValue(new Promise(() => {}));
    const other = renderHook(() => useChildExperiences('kid2'), { wrapper: wrapperFor(store) });
    expect(other.result.current).toMatchObject({ experiences: [], loading: true });
  });

  it('without a child id nothing is requested and nothing is "loading"', async () => {
    const { result } = renderHook(() => useChildExperiences(undefined), { wrapper: wrapperFor(makeStore()) });
    await settle();
    expect(get).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ experiences: [], loading: false, error: null });
  });
});

describe('useChildExperience (one experience)', () => {
  const getOne = experienceChildService.getPublishedExperience;
  const one = (uuid, title = `Title ${uuid}`) => ({ uuid, title, description: '', coverImage: null, videos: [], printable: null });
  const useOne = (store, child = 'kid1', uuid = 'u1') =>
    renderHook(({ c, u }) => useChildExperience(c, u), { wrapper: wrapperFor(store), initialProps: { c: child, u: uuid } });

  it('is loading with nothing until the answer arrives, then shows it', async () => {
    let resolve;
    getOne.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result } = useOne(makeStore());
    await settle();
    expect(result.current).toMatchObject({ experience: null, loading: true, error: null, notFound: false });

    await act(async () => resolve(one('u1')));
    expect(result.current).toMatchObject({ loading: false, error: null, notFound: false });
    expect(result.current.experience.title).toBe('Title u1');
  });

  it('asks the server once, for that id', async () => {
    getOne.mockResolvedValue(one('u1'));
    useOne(makeStore());
    await settle();
    expect(getOne).toHaveBeenCalledTimes(1);
    expect(getOne).toHaveBeenCalledWith('u1');
  });

  it('a failure with nothing cached is an error with the readable message (not "not found")', async () => {
    getOne.mockRejectedValue('Network Error');
    const { result } = useOne(makeStore());
    await settle();
    expect(result.current).toMatchObject({ experience: null, loading: false, error: 'Network Error', notFound: false });
  });

  it('the "not available" answer is notFound, with no error text to show and nothing to retry', async () => {
    getOne.mockRejectedValue(EXPERIENCE_NOT_FOUND_MESSAGE);
    const { result } = useOne(makeStore());
    await settle();
    expect(result.current).toMatchObject({ experience: null, loading: false, error: null, notFound: true });
  });

  it('Try again loads again and recovers', async () => {
    getOne.mockRejectedValueOnce('Network Error').mockResolvedValueOnce(one('u1'));
    const { result } = useOne(makeStore());
    await settle();
    expect(result.current.error).toBe('Network Error');

    await act(async () => result.current.retry());
    expect(result.current).toMatchObject({ error: null, loading: false });
    expect(result.current.experience.uuid).toBe('u1');
  });

  it('Try again that fails again keeps the error and never throws out of the click', async () => {
    getOne.mockRejectedValue('Network Error');
    const { result } = useOne(makeStore());
    await settle();
    await act(async () => {
      expect(() => result.current.retry()).not.toThrow();
    });
    expect(result.current.error).toBe('Network Error');
  });

  it('a later visit draws the last answer at once (no loading) and replaces it quietly', async () => {
    const store = makeStore();
    getOne.mockResolvedValue(one('u1', 'Old'));
    useOne(store).unmount();
    await settle();

    let resolve;
    getOne.mockReturnValue(new Promise((r) => { resolve = r; }));
    const second = useOne(store);
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.experience.title).toBe('Old');

    await act(async () => resolve(one('u1', 'New')));
    expect(second.result.current.experience.title).toBe('New');
  });

  it('a failed refresh behind real content stays silent and keeps the content', async () => {
    const store = makeStore();
    getOne.mockResolvedValue(one('u1', 'Kept'));
    useOne(store).unmount();
    await settle();

    getOne.mockRejectedValue('Network Error');
    const second = useOne(store);
    await settle();
    expect(second.result.current).toMatchObject({ loading: false, error: null, notFound: false });
    expect(second.result.current.experience.title).toBe('Kept');
  });

  it('keeps one answer per experience', async () => {
    const store = makeStore();
    getOne.mockImplementation(async (uuid) => one(uuid));
    const first = useOne(store, 'kid1', 'u1');
    await settle();
    first.rerender({ c: 'kid1', u: 'u2' });
    await settle();
    expect(first.result.current.experience.uuid).toBe('u2');
    first.rerender({ c: 'kid1', u: 'u1' });
    expect(first.result.current.experience.uuid).toBe('u1');
    expect(first.result.current.loading).toBe(false);
  });

  it('never shares a cache between children: another child starts from the placeholder', async () => {
    const store = makeStore();
    getOne.mockResolvedValue(one('u1'));
    useOne(store, 'kid1').unmount();
    await settle();

    getOne.mockReturnValue(new Promise(() => {}));
    const other = useOne(store, 'kid2');
    expect(other.result.current).toMatchObject({ experience: null, loading: true });
  });

  it.each([
    ['child id', null, 'u1'],
    ['child id (empty)', '', 'u1'],
    ['experience id', 'kid1', null],
    ['experience id (empty)', 'kid1', ''],
  ])('without a %s nothing is requested and nothing is "loading"', async (_name, child, uuid) => {
    const { result } = useOne(makeStore(), child, uuid);
    await settle();
    expect(getOne).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ experience: null, loading: false, error: null, notFound: false });
  });
});
