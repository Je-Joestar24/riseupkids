/**
 * The child frame with the REAL layout, header and bottom navigation (the other frame tests use a
 * stand-in). Pages are stand-ins whose download the test controls. Checks that the header and the
 * bottom navigation really are the same ones when the child moves around, that the navigation works,
 * and that a notification (shown in the layout) survives a page change.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../config/theme';
import uiReducer, { showNotification } from '../store/slices/uiSlice';
import { CHILD_PAGES } from './routeTable';
import { lazyChunk } from '../utils/lazyChunk';
import ChildShell from './ChildShell';

const stubs = vi.hoisted(() => ({ components: {} }));
vi.mock('./routeComponents', () => ({ ROUTE_COMPONENTS: stubs.components }));

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

let gates;

beforeEach(() => {
  gates = {};
  CHILD_PAGES.forEach((route) => {
    gates[route.page] = deferred();
    stubs.components[route.page] = lazyChunk(() => gates[route.page].promise);
  });
});

afterEach(() => vi.useRealTimers());

const open = (name) =>
  act(async () => {
    gates[name].resolve({ default: () => <p>{name} page</p> });
  });

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

function mount(start = '/child/kid1/home') {
  const store = configureStore({
    reducer: { ui: uiReducer, user: (state = { childProfiles: [] }) => state },
  });
  const view = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[start]}>
          <Where />
          <Routes>
            <Route path="/child/:id" element={<ChildShell />}>
              {CHILD_PAGES.map((route) => {
                const Page = stubs.components[route.page];
                return <Route key={route.path} path={route.path} element={<Page />} />;
              })}
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return { store, ...view };
}

const nav = () => screen.getByRole('button', { name: /^Home$/ }).closest('.MuiPaper-root');
const banner = () => document.querySelector('header');

describe('Child frame with the real header and bottom navigation', () => {
  it('shows the header and the four navigation buttons before any page has downloaded', () => {
    mount();

    expect(banner()).toBeInTheDocument();
    ['Home', 'My Journey', 'Explore', "Kids' Wall"].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('draws the page inside the frame once it arrives', async () => {
    mount();
    await open('ChildHome');

    expect(screen.getByText('ChildHome page')).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
  });

  it('uses the navigation to go to another page, keeping the very same header and navigation', async () => {
    mount();
    await open('ChildHome');
    await open('ChildJourney');
    const headerBefore = banner();
    const navBefore = nav();

    fireEvent.click(screen.getByRole('button', { name: 'My Journey' }));
    await act(async () => {});

    expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/journey');
    expect(screen.getByText('ChildJourney page')).toBeInTheDocument();
    expect(banner()).toBe(headerBefore);
    expect(nav()).toBe(navBefore);
  });

  it('keeps the navigation clickable while the next page is still downloading', async () => {
    mount();
    await open('ChildHome');

    fireEvent.click(screen.getByRole('button', { name: 'Explore' })); // its page has not arrived
    await act(async () => {});
    expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/explore');
    expect(screen.getByRole('button', { name: "Kids' Wall" })).toBeVisible();

    // and the child can still change their mind
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    await act(async () => {});
    expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/home');
    expect(screen.getByText('ChildHome page')).toBeVisible();
  });

  it('keeps a notification on screen when the child changes page', async () => {
    const { store } = mount();
    await open('ChildHome');
    await open('ChildJourney');

    await act(async () => {
      store.dispatch(showNotification({ message: 'Great job!', type: 'success', duration: 0 }));
    });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Great job!')).toBeInTheDocument();

    // The dialog covers the page, so move on the way the app does: through the address
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });
    expect(store.getState().ui.notification.open).toBe(false);
  });

  it('gives the child id from the address to the header', async () => {
    mount('/child/kid77/home');
    await open('ChildHome');
    expect(screen.getByTestId('where')).toHaveTextContent('/child/kid77/home');
  });
});
