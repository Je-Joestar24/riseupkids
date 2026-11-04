import React, { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  lazyChunk,
  lazyModal,
  handleChunkError,
  isChunkLoadError,
  whenIdle,
  preloadInSequence,
  saveDataEnabled,
  CHUNK_RELOAD_KEY,
  CHUNK_RELOAD_WINDOW_MS,
} from './lazyChunk';

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js');

/** A factory whose result the test settles by hand. */
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete navigator.connection;
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
});

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: /a.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /a.css',
    'Loading chunk 12 failed.',
  ])('recognises "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('recognises the ChunkLoadError name', () => {
    expect(isChunkLoadError(Object.assign(new Error('x'), { name: 'ChunkLoadError' }))).toBe(true);
  });

  it('does not treat other errors as chunk errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('handleChunkError', () => {
  it('rethrows an error that is not about a missing chunk, without reloading', () => {
    const reload = vi.fn();
    expect(() => handleChunkError(new Error('boom'), { reload })).toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads once for a missing chunk and never settles, so no error flashes meanwhile', async () => {
    const reload = vi.fn();
    const result = handleChunkError(chunkError(), { reload, now: () => 1000 });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe('1000');

    let settled = false;
    result.then(() => (settled = true), () => (settled = true));
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it('shows the error instead of reloading again when it already reloaded a moment ago', () => {
    const reload = vi.fn();
    handleChunkError(chunkError(), { reload, now: () => 1000 });
    reload.mockClear();

    expect(() => handleChunkError(chunkError(), { reload, now: () => 1000 + CHUNK_RELOAD_WINDOW_MS - 1 })).toThrow(
      'Failed to fetch dynamically imported module'
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('may reload again once the window has passed', () => {
    const reload = vi.fn();
    handleChunkError(chunkError(), { reload, now: () => 1000 });
    handleChunkError(chunkError(), { reload, now: () => 1000 + CHUNK_RELOAD_WINDOW_MS + 1 });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload when the browser cannot remember that it did (it could loop forever)', () => {
    const reload = vi.fn();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => handleChunkError(chunkError(), { reload })).toThrow();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload when it cannot record the reload', () => {
    const reload = vi.fn();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => handleChunkError(chunkError(), { reload })).toThrow();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('lazyChunk', () => {
  it('draws the page once its code has arrived, with the fallback until then', async () => {
    const gate = deferred();
    const Page = lazyChunk(() => gate.promise);

    render(
      <Suspense fallback={<p>waiting</p>}>
        <Page label="hello" />
      </Suspense>
    );
    expect(screen.getByText('waiting')).toBeInTheDocument();

    await act(async () => {
      gate.resolve({ default: ({ label }) => <p>page {label}</p> });
    });
    expect(screen.getByText('page hello')).toBeInTheDocument();
    expect(screen.queryByText('waiting')).not.toBeInTheDocument();
  });

  it('downloads the code only once, however many times it is drawn or preloaded', async () => {
    const factory = vi.fn(() => Promise.resolve({ default: () => <p>page</p> }));
    const Page = lazyChunk(factory);

    await Page.preload();
    await Page.preload();
    const first = render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
    first.unmount();
    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('shares a download that is already under way with the first draw', async () => {
    const gate = deferred();
    const factory = vi.fn(() => gate.promise);
    const Page = lazyChunk(factory);

    Page.preload();
    render(
      <Suspense fallback={<p>waiting</p>}>
        <Page />
      </Suspense>
    );
    expect(factory).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ default: () => <p>page</p> });
    });
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('draws a preloaded page on the very first render, with no fallback frame', async () => {
    const Page = lazyChunk(() => Promise.resolve({ default: () => <p>page</p> }));
    await Page.preload();

    render(
      <Suspense fallback={<p>waiting</p>}>
        <Page />
      </Suspense>
    );

    // No await: the content is there synchronously.
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.queryByText('waiting')).not.toBeInTheDocument();
  });

  it('keeps the page mounted (and its state) when the parent redraws after the code arrived', async () => {
    const gate = deferred();
    let mounts = 0;
    const Inner = () => {
      React.useEffect(() => {
        mounts += 1;
      }, []);
      const [count, setCount] = React.useState(0);
      return (
        <button type="button" onClick={() => setCount(count + 1)}>
          count {count}
        </button>
      );
    };
    const Page = lazyChunk(() => gate.promise);
    const App = ({ tick }) => (
      <Suspense fallback={<p>waiting</p>}>
        <p>tick {tick}</p>
        <Page />
      </Suspense>
    );

    const view = render(<App tick={1} />);
    await act(async () => {
      gate.resolve({ default: Inner });
    });
    await act(async () => {
      screen.getByRole('button').click();
    });
    expect(screen.getByText('count 1')).toBeInTheDocument();

    view.rerender(<App tick={2} />);
    expect(screen.getByText('count 1')).toBeInTheDocument();
    expect(mounts).toBe(1);
  });

  it('preload never throws, and a failed download is tried again next time', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ default: () => <p>page</p> });
    const Page = lazyChunk(factory);

    await expect(Page.preload()).resolves.toBeUndefined();
    expect(factory).toHaveBeenCalledTimes(1);

    await Page.preload();
    expect(factory).toHaveBeenCalledTimes(2);

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('reloads the page once when the code is missing after a release', async () => {
    const reload = vi.fn();
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
    const Page = lazyChunk(() => Promise.reject(chunkError()));

    render(
      <Suspense fallback={<p>waiting</p>}>
        <Page />
      </Suspense>
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    Object.defineProperty(window, 'location', original);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText('waiting')).toBeInTheDocument();
  });
});

describe('lazyModal', () => {
  it('draws nothing (or the given fallback) while the code downloads, then the pop-up', async () => {
    const gate = deferred();
    const Modal = lazyModal(() => gate.promise, <p>spinner</p>);

    render(<Modal title="video" />);
    expect(screen.getByText('spinner')).toBeInTheDocument();

    await act(async () => {
      gate.resolve({ default: ({ title }) => <p>open {title}</p> });
    });
    expect(screen.getByText('open video')).toBeInTheDocument();
    expect(screen.queryByText('spinner')).not.toBeInTheDocument();
  });

  it('exposes preload', async () => {
    const factory = vi.fn(() => Promise.resolve({ default: () => null }));
    const Modal = lazyModal(factory);
    await Modal.preload();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('whenIdle', () => {
  it('uses the browser idle callback when there is one, and can cancel it', () => {
    const request = vi.fn(() => 7);
    const cancel = vi.fn();
    window.requestIdleCallback = request;
    window.cancelIdleCallback = cancel;
    const task = vi.fn();

    const stop = whenIdle(task, { timeout: 1234 });
    expect(request).toHaveBeenCalledWith(task, { timeout: 1234 });
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('falls back to a short timer without it, and can cancel it', () => {
    vi.useFakeTimers();
    const task = vi.fn();

    const stop = whenIdle(task, { timeout: 5000 });
    vi.advanceTimersByTime(499);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    const stopSecond = whenIdle(second);
    stopSecond();
    vi.advanceTimersByTime(5000);
    expect(second).not.toHaveBeenCalled();
    stop();
  });
});

describe('saveDataEnabled', () => {
  it('is off normally', () => {
    expect(saveDataEnabled()).toBe(false);
  });

  it.each([
    [{ saveData: true }],
    [{ effectiveType: '2g' }],
    [{ effectiveType: 'slow-2g' }],
  ])('is on for %o', (connection) => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    expect(saveDataEnabled()).toBe(true);
  });

  it('stays off for 4g', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { effectiveType: '4g' } });
    expect(saveDataEnabled()).toBe(false);
  });
});

describe('preloadInSequence', () => {
  const component = (gate) => {
    const preload = vi.fn(() => gate.promise);
    return { preload };
  };

  it('downloads one at a time, the next only after the previous finished', async () => {
    vi.useFakeTimers();
    const a = deferred();
    const b = deferred();
    const c = deferred();
    const [A, B, C] = [component(a), component(b), component(c)];

    preloadInSequence([A, B, C]);
    await vi.advanceTimersByTimeAsync(600);
    expect(A.preload).toHaveBeenCalledTimes(1);
    expect(B.preload).not.toHaveBeenCalled();

    // However long the first one takes, the second never starts beside it.
    await vi.advanceTimersByTimeAsync(10000);
    expect(B.preload).not.toHaveBeenCalled();

    a.resolve();
    await vi.advanceTimersByTimeAsync(600);
    expect(B.preload).toHaveBeenCalledTimes(1);
    expect(C.preload).not.toHaveBeenCalled();

    b.resolve();
    await vi.advanceTimersByTimeAsync(600);
    expect(C.preload).toHaveBeenCalledTimes(1);
  });

  it('stops when cancelled', async () => {
    vi.useFakeTimers();
    const a = deferred();
    const A = component(a);
    const B = component(deferred());

    const stop = preloadInSequence([A, B]);
    await vi.advanceTimersByTimeAsync(600);
    stop();
    a.resolve();
    await vi.advanceTimersByTimeAsync(5000);

    expect(B.preload).not.toHaveBeenCalled();
  });

  it('does not even start when cancelled before the first idle moment', async () => {
    vi.useFakeTimers();
    const A = component(deferred());
    const stop = preloadInSequence([A]);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(A.preload).not.toHaveBeenCalled();
  });

  it('does nothing on a save-data connection', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const A = component(deferred());

    preloadInSequence([A]);
    await vi.advanceTimersByTimeAsync(5000);

    expect(A.preload).not.toHaveBeenCalled();
  });

  it('skips items without preload and carries on', async () => {
    vi.useFakeTimers();
    const B = component({ promise: Promise.resolve() });
    preloadInSequence([{}, B]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(B.preload).toHaveBeenCalledTimes(1);
  });
});
