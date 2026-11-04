import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import ChildLayout from '../layouts/ChildLayout';
import { RouteErrorBoundary, RouteFallback } from '../components/common/RouteLoading';
import { preloadInSequence } from '../utils/lazyChunk';
import { CHILD_PAGES } from './routeTable';
import { ROUTE_COMPONENTS } from './routeComponents';

/** Warming starts this long after the frame appears, so it never competes with the page's own requests. */
export const CHILD_WARMUP_DELAY_MS = 1500;

/**
 * The frame of every child page: the header and the bottom navigation. It is one route above the pages,
 * so it stays mounted while the child moves between pages and while a page's code downloads (the
 * fallback appears inside the frame, never in place of it). Once the first page is up, the other child
 * pages are downloaded quietly, one at a time, so the next tap does not wait for a download.
 */
const ChildShell = () => {
  const { id } = useParams();
  const { pathname } = useLocation();

  useEffect(() => {
    let stopWarming = () => {};
    const timer = setTimeout(() => {
      stopWarming = preloadInSequence(CHILD_PAGES.map((route) => ROUTE_COMPONENTS[route.page]));
    }, CHILD_WARMUP_DELAY_MS);

    return () => {
      clearTimeout(timer);
      stopWarming();
    };
  }, []);

  return (
    <ChildLayout childId={id}>
      <RouteErrorBoundary resetKey={pathname}>
        <Suspense fallback={<RouteFallback label="Loading page" />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </ChildLayout>
  );
};

export default ChildShell;
