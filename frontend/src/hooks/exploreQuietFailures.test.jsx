/**
 * The explore hooks used by the cached child pages: a refresh behind content that is already on
 * screen must be able to fail without a popup, and the numbers must be able to say they failed
 * instead of quietly turning into zeros.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import exploreReducer from '../store/slices/exploreSlice';
import uiReducer from '../store/slices/uiSlice';
import exploreService from '../services/exploreServices';
import exploreVideoWatchService from '../services/exploreVideoWatchService';
import { useExplore } from './exploreHook';
import { useExploreVideoWatch } from './exploreVideoWatchHook';

vi.mock('../services/exploreServices', () => ({
  default: { getAllExploreContent: vi.fn(), getExploreContentByType: vi.fn() },
}));
vi.mock('../services/exploreVideoWatchService', () => ({
  default: { getTotalStarsForVideoType: vi.fn(), getVideoTypeProgress: vi.fn() },
}));

const makeStore = () => configureStore({ reducer: { explore: exploreReducer, ui: uiReducer } });
const wrapperFor = (store) => ({ children }) => <Provider store={store}>{children}</Provider>;
const popup = (store) => store.getState().ui.notification.open;

describe('useExplore — popups for failed loads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchExploreContent shows a popup by default', async () => {
    exploreService.getAllExploreContent.mockRejectedValue('Server error');
    const store = makeStore();
    const { result } = renderHook(() => useExplore(), { wrapper: wrapperFor(store) });

    await act(async () => {
      await expect(result.current.fetchExploreContent({ videoType: 'cooking' })).rejects.toBeDefined();
    });

    expect(popup(store)).toBe(true);
  });

  it('fetchExploreContent with silent: still rejects, but shows no popup', async () => {
    exploreService.getAllExploreContent.mockRejectedValue('Server error');
    const store = makeStore();
    const { result } = renderHook(() => useExplore(), { wrapper: wrapperFor(store) });

    await act(async () => {
      await expect(
        result.current.fetchExploreContent({ videoType: 'cooking' }, { silent: true })
      ).rejects.toBeDefined();
    });

    expect(popup(store)).toBeFalsy();
  });

  it('fetchContentByType shows a popup by default, and none with silent', async () => {
    exploreService.getExploreContentByType.mockRejectedValue('Server error');
    const store = makeStore();
    const { result } = renderHook(() => useExplore(), { wrapper: wrapperFor(store) });

    await act(async () => {
      await expect(result.current.fetchContentByType('video', {}, { silent: true })).rejects.toBeDefined();
    });
    expect(popup(store)).toBeFalsy();

    await act(async () => {
      await expect(result.current.fetchContentByType('video', {})).rejects.toBeDefined();
    });
    expect(popup(store)).toBe(true);
  });
});

describe('useExploreVideoWatch — numbers that can say they failed', () => {
  let logged;
  beforeEach(() => {
    vi.clearAllMocks();
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  const hook = () => renderHook(() => useExploreVideoWatch('kid1'), { wrapper: wrapperFor(makeStore()) }).result;

  it('total stars: 0 by default when the request fails, a failure when strict', async () => {
    exploreVideoWatchService.getTotalStarsForVideoType.mockRejectedValue(new Error('down'));
    const result = hook();

    expect(await result.current.getTotalStarsForVideoType('cooking')).toBe(0);
    await expect(result.current.getTotalStarsForVideoType('cooking', { strict: true })).rejects.toThrow('down');
  });

  it('total stars: the real number when it works, strict or not', async () => {
    exploreVideoWatchService.getTotalStarsForVideoType.mockResolvedValue({
      success: true,
      data: { totalStars: 30 },
    });
    const result = hook();

    expect(await result.current.getTotalStarsForVideoType('cooking')).toBe(30);
    expect(await result.current.getTotalStarsForVideoType('cooking', { strict: true })).toBe(30);
  });

  it('progress: zeros by default when the request fails, a failure when strict', async () => {
    exploreVideoWatchService.getVideoTypeProgress.mockRejectedValue(new Error('down'));
    const result = hook();

    expect(await result.current.getVideoTypeProgress('cooking')).toEqual({ totalVideos: 0, viewedVideos: 0 });
    await expect(result.current.getVideoTypeProgress('cooking', { strict: true })).rejects.toThrow('down');
  });

  it('progress: the real numbers when it works, strict or not', async () => {
    exploreVideoWatchService.getVideoTypeProgress.mockResolvedValue({
      success: true,
      data: { totalVideos: 5, viewedVideos: 2 },
    });
    const result = hook();

    expect(await result.current.getVideoTypeProgress('cooking', { strict: true })).toEqual({
      totalVideos: 5,
      viewedVideos: 2,
    });
  });
});
