import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { CHILD_PAGES } from './routeTable';
import { lazyChunk } from '../utils/lazyChunk';
import ChildShell, { CHILD_WARMUP_DELAY_MS } from './ChildShell';

// The real pages are not under test: every page name gets a stand-in whose download the test controls.
const stubs = vi.hoisted(() => ({ components: {} }));
vi.mock('./routeComponents', () => ({ ROUTE_COMPONENTS: stubs.components }));

let frameMounts = 0;
vi.mock('../layouts/ChildLayout', async () => {
  const React = await import('react');
  return {
    default: ({ childId, children }) => {
      React.useEffect(() => {
        frameMounts += 1;
      }, []);
      return (
        <div data-testid="frame" data-child={childId}>
          {children}
        </div>
      );
    },
  };
});

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const settle = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

let gates;

beforeEach(() => {
  vi.useFakeTimers();
  frameMounts = 0;
  gates = {};
  // Each page: a lazy stand-in that downloads when its gate opens, and a spy on preload.
  CHILD_PAGES.forEach((route) => {
    gates[route.page] = deferred();
    const Page = lazyChunk(() => gates[route.page].promise);
    const realPreload = Page.preload;
    Page.preload = vi.fn(realPreload);
    stubs.components[route.page] = Page;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const openGate = (name) =>
  act(async () => {
    gates[name].resolve({ default: ({ childId }) => <p>{name} for {childId}</p> });
  });

const tree = (start = '/child/kid9/home') => (
  <MemoryRouter initialEntries={[start]}>
    <Routes>
      <Route path="/child/:id" element={<ChildShell />}>
        {CHILD_PAGES.map((route) => {
          const Page = stubs.components[route.page];
          return <Route key={route.path} path={route.path} element={<PageWithId Page={Page} />} />;
        })}
      </Route>
    </Routes>
    <Link to="/child/kid9/journey">to journey</Link>
    <Link to="/child/kid9/explore">to explore</Link>
  </MemoryRouter>
);

const PageWithId = ({ Page }) => <Page childId="kid9" />;

describe('Child frame', () => {
  it('draws the frame with the child id around the page', async () => {
    render(tree());
    await openGate('ChildHome');

    expect(screen.getByTestId('frame')).toHaveAttribute('data-child', 'kid9');
    expect(screen.getByText('ChildHome for kid9')).toBeInTheDocument();
  });

  it('keeps the frame on screen while the page is still downloading, with the loading mark inside it', async () => {
    render(tree());

    expect(screen.getByTestId('frame')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // not before the short delay

    await settle(150);
    const frame = screen.getByTestId('frame');
    expect(frame).toContainElement(screen.getByRole('status'));

    await openGate('ChildHome');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the same frame (not a new one) when the child goes to another page', async () => {
    render(tree());
    await openGate('ChildHome');
    await openGate('ChildJourney');
    const frameBefore = screen.getByTestId('frame');

    fireEvent.click(screen.getByText('to journey'));
    await act(async () => {});

    expect(screen.getByText('ChildJourney for kid9')).toBeInTheDocument();
    expect(screen.getByTestId('frame')).toBe(frameBefore);
    expect(frameMounts).toBe(1);
  });

  it('keeps the frame while the next page downloads', async () => {
    render(tree());
    await openGate('ChildHome');

    fireEvent.click(screen.getByText('to explore'));
    expect(screen.getByTestId('frame')).toBeInTheDocument();
    // React hides the old page while the next one downloads; it is not shown beside the loading mark.
    const old = screen.queryByText('ChildHome for kid9');
    if (old) expect(old).not.toBeVisible();

    await settle(150);
    expect(screen.getByRole('status')).toBeInTheDocument();
    await openGate('ChildExplore');
    expect(screen.getByText('ChildExplore for kid9')).toBeInTheDocument();
  });

  it('shows the message with Try again inside the frame when a page cannot load, and clears it on the next page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      gates.ChildHome.promise.catch(() => {});
    });
    render(tree());
    await act(async () => {
      gates.ChildHome.resolve({
        default: () => {
          throw new Error('page crashed');
        },
      });
    });

    const frame = screen.getByTestId('frame');
    expect(frame).toContainElement(screen.getByRole('alert'));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    await openGate('ChildJourney');
    fireEvent.click(screen.getByText('to journey'));
    await act(async () => {});
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('ChildJourney for kid9')).toBeInTheDocument();
  });
});

describe('Warming the other child pages', () => {
  const preloads = () => CHILD_PAGES.map((route) => stubs.components[route.page].preload);

  it('starts nothing at first, so it never competes with the page the child asked for', async () => {
    render(tree());
    await settle(CHILD_WARMUP_DELAY_MS - 1);
    // Only what the current page itself asked for: the shell does not warm anything yet.
    preloads().forEach((preload) => expect(preload).not.toHaveBeenCalled());
  });

  it('then downloads the pages one at a time, the bottom-navigation tabs first', async () => {
    render(tree());
    await settle(CHILD_WARMUP_DELAY_MS + 600);

    const [home, journey] = preloads();
    expect(home).toHaveBeenCalledTimes(1);
    expect(journey).not.toHaveBeenCalled(); // waits for the first download to finish

    await openGate('ChildHome');
    await settle(600);
    expect(journey).toHaveBeenCalledTimes(1);
    expect(preloads()[2]).not.toHaveBeenCalled();
  });

  it('stops when the child leaves the child area', async () => {
    const view = render(tree());
    await settle(CHILD_WARMUP_DELAY_MS + 600);
    view.unmount();
    await openGate('ChildHome');
    await settle(10000);

    expect(preloads()[1]).not.toHaveBeenCalled();
  });

  it('does not start if the child leaves before the delay ends', async () => {
    const view = render(tree());
    await settle(CHILD_WARMUP_DELAY_MS - 100);
    view.unmount();
    await settle(10000);

    preloads().forEach((preload) => expect(preload).not.toHaveBeenCalled());
  });

  it('does not restart when the child moves between pages', async () => {
    render(tree());
    await settle(CHILD_WARMUP_DELAY_MS + 600);
    await openGate('ChildHome');
    await settle(600);
    fireEvent.click(screen.getByText('to journey'));
    await settle(10);

    expect(preloads()[0]).toHaveBeenCalledTimes(1);
  });
});
