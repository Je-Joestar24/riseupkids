import React, { Suspense, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate, matchPath, useLocation, useParams } from 'react-router-dom';
import { bootstrapSession } from '../store/slices/userSlice';
import AuthedAccess from './access/AuthedAccess';
import UnAuthed from './access/UnAuthed';
import { RouteErrorBoundary, RouteFallback } from '../components/common/RouteLoading';
import { preloadInSequence } from '../utils/lazyChunk';
import { SITE_ROUTES, CHILD_AREA_PATH, CHILD_PAGES, CHILD_ROLES } from './routeTable';
import { ROUTE_COMPONENTS } from './routeComponents';

/**
 * Starts the download of the given pages and layouts while the route is still being drawn, so a layout
 * and the page inside it download side by side instead of one after the other. `idle` ones are warmed
 * later, in the background. Does nothing for visitors the guard turns away (it sits inside the guard).
 */
const WarmUp = ({ now = [], idle = [], children }) => {
  now.forEach((component) => component.preload?.());

  useEffect(() => (idle.length ? preloadInSequence(idle) : undefined), []); // eslint-disable-line react-hooks/exhaustive-deps

  return children;
};

const GuardedRoute = ({ route }) => {
  const Page = ROUTE_COMPONENTS[route.page];
  const Layout = route.layout ? ROUTE_COMPONENTS[route.layout] : null;
  const idle = (route.warmWhenIdle || []).map((name) => ROUTE_COMPONENTS[name]);

  return (
    <AuthedAccess allowedRoles={route.roles}>
      <WarmUp now={Layout ? [Layout, Page] : [Page]} idle={idle}>
        {Layout ? (
          // The page waits inside the layout, so the menu and header stay on screen while its code downloads.
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <Page />
            </Suspense>
          </Layout>
        ) : (
          <Page />
        )}
      </WarmUp>
    </AuthedAccess>
  );
};

/** Receives the child's id from the address and hands it to the page, as the old wrapper did. */
const ChildPage = ({ Page }) => {
  const { id } = useParams();
  return <Page childId={id} />;
};

/**
 * Entry to the child area. It starts the page's code at the same moment as the frame's, so the two
 * download side by side (the page is otherwise only asked for once the frame has appeared).
 */
const ChildArea = () => {
  const { pathname } = useLocation();
  const Shell = ROUTE_COMPONENTS.ChildShell;

  const current = CHILD_PAGES.find((route) => matchPath(`${CHILD_AREA_PATH}/${route.path}`, pathname));
  if (current) ROUTE_COMPONENTS[current.page].preload();

  return <Shell />;
};

const routeElement = (route) => {
  switch (route.kind) {
    case 'public': {
      const Page = ROUTE_COMPONENTS[route.page];
      return (
        <UnAuthed>
          <Page />
        </UnAuthed>
      );
    }
    case 'open': {
      const Page = ROUTE_COMPONENTS[route.page];
      return <Page />;
    }
    case 'redirect':
      return <Navigate to={route.to} replace />;
    default:
      return <GuardedRoute route={route} />;
  }
};

/** Boundary and loading screen for the whole site; they reset whenever the address changes. */
const SiteFrame = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundary resetKey={pathname}>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
};

const AppRouter = () => {
  const dispatch = useDispatch();

  // Chunk 9 (RUK-SEC-012(b)): fires exactly once per real page load (hard reload / new tab /
  // reopened tab / a deep link opened fresh) — NOT on in-app client-side navigation, since this
  // component never unmounts for that. This is what silently re-establishes a session from the
  // httpOnly refresh cookie before any protected route renders (state.user.loading starts true
  // specifically so AuthedAccess/UnAuthed wait for this instead of racing it).
  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <SiteFrame>
        <Routes>
          {SITE_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={routeElement(route)} />
          ))}

          {/* Child area: one frame (header + bottom navigation) above every child page */}
          <Route
            path={CHILD_AREA_PATH}
            element={
              <AuthedAccess allowedRoles={CHILD_ROLES}>
                <ChildArea />
              </AuthedAccess>
            }
          >
            {CHILD_PAGES.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<ChildPage Page={ROUTE_COMPONENTS[route.page]} />}
              />
            ))}
          </Route>
        </Routes>
      </SiteFrame>
    </BrowserRouter>
  );
};

export default AppRouter;
