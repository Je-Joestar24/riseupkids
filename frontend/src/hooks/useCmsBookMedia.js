import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { buildCmsBookMediaPlan } from '../utils/cmsBookMediaPlan';
import { createCmsBookMediaLoader } from '../utils/cmsBookMediaLoader';
import { getDefaultCmsBookMediaStore } from '../utils/cmsBookMediaStore';

const noopSubscribe = () => () => {};
const noopSnapshot = () => 0;

/**
 * Runs the book's downloads while the reader is open: starts them with the book, keeps them in step with the
 * page the child is on, and stops them (freeing every local copy) when the reader closes or the book changes.
 *
 * `enabled` false does nothing at all, which is how the admin preview and tests that supply their own wait behave.
 */
const useCmsBookMedia = ({ enabled = false, book = null, pages = [], focusPageIndex = 0 } = {}) => {
  // Rebuilt only when the book's content really changed (not whenever the caller makes a new wrapper object).
  const plan = useMemo(
    () => (enabled ? buildCmsBookMediaPlan({ book, pages }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, book?.id, book?.contentVersion, book?.mediaManifest, pages]
  );
  const [loader, setLoader] = useState(null);
  const loaderRef = useRef(null);
  loaderRef.current = loader;

  useEffect(() => {
    if (!plan) {
      setLoader(null);
      return undefined;
    }
    // Sound and video kept on the device from earlier visits are used before asking the internet.
    const created = createCmsBookMediaLoader({ plan, pages, store: getDefaultCmsBookMediaStore() });
    setLoader(created);
    created.start();
    return () => {
      created.cancel();
      setLoader(null);
    };
    // `pages` only drives ordering and is what `plan` was built from
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    loader?.setFocus(focusPageIndex);
  }, [loader, focusPageIndex]);

  const version = useSyncExternalStore(
    loader ? loader.subscribe : noopSubscribe,
    loader ? () => loader.getSnapshot().version : noopSnapshot
  );

  const resolve = useCallback((url) => (loaderRef.current ? loaderRef.current.getSrc(url) : url), []);

  // New function identities when something changed, so what depends on a page's readiness re-evaluates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isPageReady = useCallback((index) => (loader ? loader.isPageReady(index) : !plan), [loader, plan, version]);

  return {
    enabled: Boolean(plan),
    /** The first page's files are in (or settled): the book can open. */
    startReady: !plan || Boolean(loader && loader.isPageReady(0)),
    /** 0 to 100, over the first page's files only. */
    startProgress: loader ? loader.getPageProgress(0) : 0,
    isPageReady,
    resolve,
    summary: loader ? loader.summary() : null,
  };
};

export default useCmsBookMedia;
