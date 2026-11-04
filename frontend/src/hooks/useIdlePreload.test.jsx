import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useIdlePreload from './useIdlePreload';

const Probe = ({ components, enabled }) => {
  useIdlePreload(components, enabled);
  return null;
};

const component = () => ({ preload: vi.fn(() => Promise.resolve()) });
const settle = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  delete navigator.connection;
});

describe('useIdlePreload', () => {
  it('downloads the components in the background, one after another', async () => {
    const [a, b] = [component(), component()];
    render(<Probe components={[a, b]} />);
    expect(a.preload).not.toHaveBeenCalled();

    await settle(600);
    expect(a.preload).toHaveBeenCalledTimes(1);
    await settle(600);
    expect(b.preload).toHaveBeenCalledTimes(1);
  });

  it('waits until it is enabled', async () => {
    const a = component();
    const view = render(<Probe components={[a]} enabled={false} />);
    await settle(5000);
    expect(a.preload).not.toHaveBeenCalled();

    view.rerender(<Probe components={[a]} enabled />);
    await settle(600);
    expect(a.preload).toHaveBeenCalledTimes(1);
  });

  it('stops when the page goes away', async () => {
    const [a, b] = [component(), component()];
    const view = render(<Probe components={[a, b]} />);
    await settle(600);
    view.unmount();
    await settle(5000);

    expect(a.preload).toHaveBeenCalledTimes(1);
    expect(b.preload).not.toHaveBeenCalled();
  });

  it('does nothing on a save-data connection', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const a = component();
    render(<Probe components={[a]} />);
    await settle(5000);
    expect(a.preload).not.toHaveBeenCalled();
  });

  it('does not start again when the page redraws', async () => {
    const a = component();
    const view = render(<Probe components={[a]} />);
    await settle(600);
    view.rerender(<Probe components={[a]} />);
    await settle(5000);
    expect(a.preload).toHaveBeenCalledTimes(1);
  });
});
