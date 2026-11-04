import React, { lazy, Suspense } from 'react';

/**
 * Code splitting helpers.
 *
 * `lazyChunk(() => import('./Page'))` is React.lazy with three additions:
 *  - `.preload()` starts the download early (and shares it with the first render);
 *  - once the chunk has arrived the component renders straight away, with no extra suspended frame;
 *  - a chunk that cannot be fetched (after a new deploy the old hashed file is gone) reloads the page
 *    once to pick up the new files, instead of leaving a blank screen.
 */

export const CHUNK_RELOAD_KEY = 'ruk:chunk-reload-at';
/** A second chunk failure inside this window is shown as an error instead of reloading again. */
export const CHUNK_RELOAD_WINDOW_MS = 30000;

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading chunk .* failed|ChunkLoadError/i;

export const isChunkLoadError = (error) =>
  error?.name === 'ChunkLoadError' || CHUNK_ERROR_PATTERN.test(String(error?.message || error || ''));

const readReloadStamp = () => {
  try {
    return Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
  } catch {
    return null; // storage unavailable: we could not tell whether we already reloaded
  }
};

const writeReloadStamp = (value) => {
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Called when an import fails. A chunk error reloads the page once per window; any other error, a
 * second chunk error, or a browser that cannot remember the reload is rethrown for the error boundary.
 */
export const handleChunkError = (error, { reload = () => window.location.reload(), now = Date.now } = {}) => {
  if (!isChunkLoadError(error)) throw error;

  const last = readReloadStamp();
  const time = now();
  if (last === null || (last && time - last < CHUNK_RELOAD_WINDOW_MS)) throw error;
  if (!writeReloadStamp(time)) throw error;

  reload();
  // The page is being replaced; never settle, so nothing flashes an error meanwhile.
  return new Promise(() => {});
};

export function lazyChunk(factory) {
  let pending = null;
  let Loaded = null;

  const load = () => {
    if (!pending) {
      pending = factory().then(
        (module) => {
          Loaded = module.default;
          return module;
        },
        (error) => {
          pending = null; // a later attempt may succeed
          throw error;
        }
      );
    }
    return pending;
  };

  const Inner = lazy(() => load().catch((error) => handleChunkError(error)));

  const Component = (props) => {
    // A chunk that already arrived is drawn directly; only a first-ever draw goes through React.lazy.
    const Picked = Loaded || Inner;
    return <Picked {...props} />;
  };

  Component.preload = () => load().then(() => undefined, () => undefined);
  Component.displayName = 'LazyChunk';
  return Component;
}

/**
 * A lazy component that is drawn only when asked for (modals). It renders nothing while its chunk
 * downloads, so use it for things that are mounted when they open.
 */
export function lazyModal(factory, fallback = null) {
  const Lazy = lazyChunk(factory);
  const Modal = (props) => (
    <Suspense fallback={fallback}>
      <Lazy {...props} />
    </Suspense>
  );
  Modal.preload = Lazy.preload;
  Modal.displayName = 'LazyModal';
  return Modal;
}

/**
 * Runs `task` when the browser is idle (or after `timeout` ms at the latest) and returns a cancel
 * function. Used to warm chunks without competing with what is on screen.
 */
export const whenIdle = (task, { timeout = 2000 } = {}) => {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = setTimeout(task, Math.min(timeout, 500));
  return () => clearTimeout(id);
};

/** True on connections where extra background downloads are unwelcome. */
export const saveDataEnabled = () => {
  if (typeof navigator === 'undefined') return false;
  const connection = navigator.connection;
  return Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
};

/**
 * Preloads the given lazy components one after another (never all at once) when idle.
 * Returns a cancel function. Does nothing on save-data / 2g connections.
 */
export const preloadInSequence = (components, options) => {
  if (saveDataEnabled()) return () => {};
  let cancelled = false;
  let cancelIdle = () => {};

  const step = (index) => {
    if (cancelled || index >= components.length) return;
    cancelIdle = whenIdle(async () => {
      if (cancelled) return;
      await components[index].preload?.();
      step(index + 1);
    }, options);
  };

  step(0);
  return () => {
    cancelled = true;
    cancelIdle();
  };
};
