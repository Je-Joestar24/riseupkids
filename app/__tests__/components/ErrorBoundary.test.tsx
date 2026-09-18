/**
 * Without this boundary, an uncaught error anywhere in the tree is a plain black screen in a
 * release build (TestFlight/production) — there's no dev-only red error screen there, and this
 * app has no crash-reporting service. Tested by exercising the class component's own lifecycle
 * methods directly (this codebase has no @testing-library/react-native renderer installed), the
 * same way React itself would call them.
 */
import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function findByText(node: unknown, text: string): boolean {
  if (node == null) return false;
  if (typeof node === 'string') return node.includes(text);
  if (Array.isArray(node)) return node.some((child) => findByText(child, text));
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    return findByText((node as { props?: { children?: unknown } }).props?.children, text);
  }
  return false;
}

describe('ErrorBoundary.getDerivedStateFromError', () => {
  it('captures the thrown error into state', () => {
    const error = new Error('boom');
    expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({ error });
  });
});

describe('ErrorBoundary render behavior', () => {
  it('renders children through untouched when there is no error', () => {
    const boundary = new ErrorBoundary({ children: React.createElement('Text', null, 'child content') });
    const output = boundary.render();
    expect(output).toEqual(React.createElement('Text', null, 'child content'));
  });

  it('renders a fallback with the error message instead of children once an error is caught', () => {
    const boundary = new ErrorBoundary({ children: React.createElement('Text', null, 'child content') });
    boundary.state = { error: new Error('Something exploded') };

    const output = boundary.render();

    expect(findByText(output, 'Something went wrong')).toBe(true);
    expect(findByText(output, 'Something exploded')).toBe(true);
    expect(findByText(output, 'child content')).toBe(false);
  });

  it('falls back to a generic message when the error has no message', () => {
    const boundary = new ErrorBoundary({ children: React.createElement('Text', null, 'child content') });
    boundary.state = { error: new Error() };

    const output = boundary.render();

    expect(findByText(output, 'An unexpected error occurred.')).toBe(true);
  });
});

describe('ErrorBoundary.reset', () => {
  it('clears the error via setState, so the next render falls back through to children again', () => {
    const boundary = new ErrorBoundary({ children: React.createElement('Text', null, 'child content') });
    boundary.state = { error: new Error('boom') };
    const setStateSpy = jest.fn((updater: Partial<{ error: Error | null }>) => {
      boundary.state = { ...boundary.state, ...updater };
    });
    (boundary as unknown as { setState: typeof setStateSpy }).setState = setStateSpy;

    boundary.reset();

    expect(setStateSpy).toHaveBeenCalledWith({ error: null });
    expect(boundary.render()).toEqual(React.createElement('Text', null, 'child content'));
  });
});

describe('ErrorBoundary.componentDidCatch', () => {
  it('logs the error and component stack instead of swallowing it silently', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const boundary = new ErrorBoundary({ children: null });
    const error = new Error('boom');

    boundary.componentDidCatch(error, { componentStack: 'at Screen\nat App' });

    expect(spy).toHaveBeenCalledWith('[ErrorBoundary] Uncaught error:', error, 'at Screen\nat App');
    spy.mockRestore();
  });
});
