import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RouteFallback, RouteErrorBoundary, ModalFallback } from './RouteLoading';

const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('RouteFallback', () => {
  it('shows nothing at first, so a download that finishes quickly never flashes a spinner', async () => {
    render(<RouteFallback />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await tick(149);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a labelled spinner once the wait is long enough', async () => {
    render(<RouteFallback label="Loading journey" />);
    await tick(150);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading journey');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('has a default label', async () => {
    render(<RouteFallback />);
    await tick(150);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading page');
  });

  it('leaves no timer behind when it goes away early', () => {
    const view = render(<RouteFallback />);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('ModalFallback', () => {
  it('appears later than a page fallback (a pop-up is usually ready by then)', async () => {
    render(<ModalFallback />);
    await tick(199);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await tick(1);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });
});

describe('RouteErrorBoundary', () => {
  const Boom = () => {
    throw new Error('page failed');
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('draws its children when nothing is wrong', () => {
    render(
      <RouteErrorBoundary resetKey="/a">
        <p>fine</p>
      </RouteErrorBoundary>
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('replaces a page that fails with a message and a way to try again', () => {
    render(
      <RouteErrorBoundary resetKey="/a">
        <Boom />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This page could not load.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('reloads the page when Try again is pressed', () => {
    const reload = vi.fn();
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });

    render(
      <RouteErrorBoundary resetKey="/a">
        <Boom />
      </RouteErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    Object.defineProperty(window, 'location', original);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the message when the child moves to another page', () => {
    const App = () => {
      const [path, setPath] = useState('/a');
      return (
        <>
          <button type="button" onClick={() => setPath('/b')}>
            go
          </button>
          <RouteErrorBoundary resetKey={path}>{path === '/a' ? <Boom /> : <p>page b</p>}</RouteErrorBoundary>
        </>
      );
    };
    render(<App />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByText('go'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('page b')).toBeInTheDocument();
  });

  it('keeps the message while the address stays the same', () => {
    const view = render(
      <RouteErrorBoundary resetKey="/a">
        <Boom />
      </RouteErrorBoundary>
    );
    view.rerender(
      <RouteErrorBoundary resetKey="/a">
        <Boom />
      </RouteErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
