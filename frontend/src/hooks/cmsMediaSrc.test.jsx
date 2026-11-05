/**
 * How a book page finds the local copy of its sound or video, and what happens when that copy will not play.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CmsMediaSrcProvider, useCmsMediaResolver, useCmsMediaSrc } from './cmsMediaSrc';
import { useMediaLoadRecovery, withMediaCacheBust } from '../utils/cmsMediaPlayback';

const withResolver = (resolve) => ({ children }) => <CmsMediaSrcProvider resolve={resolve}>{children}</CmsMediaSrcProvider>;

describe('finding the address to play', () => {
  it('with no reader around (the admin preview), the address is handed back unchanged', () => {
    const { result } = renderHook(() => useCmsMediaSrc('https://cdn.test/a.mp3'));
    expect(result.current).toBe('https://cdn.test/a.mp3');
    expect(renderHook(() => useCmsMediaResolver()).result.current('x')).toBe('x');
  });

  it('inside a reader, it is the local copy when there is one', () => {
    const resolve = (url) => (url === 'https://cdn.test/a.mp3' ? 'blob:local/1' : url);
    const { result } = renderHook(() => useCmsMediaSrc('https://cdn.test/a.mp3'), { wrapper: withResolver(resolve) });
    expect(result.current).toBe('blob:local/1');
  });

  it('is not swapped under a page that is already playing when the copy turns up later', () => {
    let copy = null;
    const resolve = (url) => copy || url;
    const { result, rerender } = renderHook(() => useCmsMediaSrc('https://cdn.test/a.mp3'), { wrapper: withResolver(resolve) });
    expect(result.current).toBe('https://cdn.test/a.mp3'); // started from the internet

    copy = 'blob:local/late';
    rerender();
    rerender();
    expect(result.current).toBe('https://cdn.test/a.mp3'); // still the same: the sound is not restarted
  });

  it('a different address is looked up afresh', () => {
    const resolve = (url) => `blob:for/${url}`;
    const { result, rerender } = renderHook(({ url }) => useCmsMediaSrc(url), {
      wrapper: withResolver(resolve),
      initialProps: { url: 'a' },
    });
    expect(result.current).toBe('blob:for/a');
    rerender({ url: 'b' });
    expect(result.current).toBe('blob:for/b');
  });

  it('no address stays no address (and is not looked up)', () => {
    const asked = [];
    const resolve = (url) => { asked.push(url); return url; };
    const { result } = renderHook(() => useCmsMediaSrc(''), { wrapper: withResolver(resolve) });
    expect(result.current).toBe('');
    expect(asked).toEqual([]);
  });

  it('the resolver keeps its identity across renders (so effects that use it do not restart)', () => {
    const resolve = (url) => url;
    const { result, rerender } = renderHook(() => useCmsMediaResolver(), { wrapper: withResolver(resolve) });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('when the local copy will not play', () => {
  it('falls back to the original internet address, once (a blob address takes no query string)', () => {
    const { result } = renderHook(() => useMediaLoadRecovery('blob:local/1', 'https://cdn.test/a.mp3'));
    expect(result.current.src).toBe('blob:local/1');

    act(() => result.current.onMediaError());
    expect(result.current.src).toBe('https://cdn.test/a.mp3');

    act(() => result.current.onMediaError()); // a second error changes nothing
    expect(result.current.src).toBe('https://cdn.test/a.mp3');
  });

  it('with no original to go back to, a failing copy is left alone', () => {
    const { result } = renderHook(() => useMediaLoadRecovery('blob:local/1'));
    act(() => result.current.onMediaError());
    expect(result.current.src).toBe('blob:local/1');
  });

  it('an ordinary address still gets the one cache-bust retry, as before', () => {
    const { result } = renderHook(() => useMediaLoadRecovery('https://cdn.test/a.mp3'));
    act(() => result.current.onMediaError());
    expect(result.current.src).toMatch(/^https:\/\/cdn\.test\/a\.mp3\?rukcb=\d+$/);
    expect(withMediaCacheBust('https://cdn.test/a.mp3?x=1', 5)).toBe('https://cdn.test/a.mp3?x=1&rukcb=5');
  });

  it('a new address resets the retry', () => {
    const { result, rerender } = renderHook(({ url }) => useMediaLoadRecovery(url, 'orig'), { initialProps: { url: 'blob:1' } });
    act(() => result.current.onMediaError());
    expect(result.current.src).toBe('orig');
    rerender({ url: 'blob:2' });
    expect(result.current.src).toBe('blob:2');
    act(() => result.current.onMediaError());
    expect(result.current.src).toBe('orig');
  });
});
