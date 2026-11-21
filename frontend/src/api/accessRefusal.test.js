import { describe, it, expect, vi } from 'vitest';
import { emitAccessRefusal, onAccessRefusal } from './accessRefusal';

describe('the access refusal channel', () => {
  it('tells every listener, with the detail', () => {
    const a = vi.fn();
    const b = vi.fn();
    const stopA = onAccessRefusal(a);
    const stopB = onAccessRefusal(b);

    emitAccessRefusal({ message: 'No Notifications', url: '/admin/notifications' });

    expect(a).toHaveBeenCalledWith({ message: 'No Notifications', url: '/admin/notifications' });
    expect(b).toHaveBeenCalledTimes(1);
    stopA();
    stopB();
  });

  it('stops telling a listener that has stopped', () => {
    const listener = vi.fn();
    const stop = onAccessRefusal(listener);
    stop();

    emitAccessRefusal({ message: 'x', url: null });

    expect(listener).not.toHaveBeenCalled();
  });

  it('stopping twice is harmless', () => {
    const stop = onAccessRefusal(() => {});

    expect(() => {
      stop();
      stop();
    }).not.toThrow();
  });

  it('a listener that throws does not stop the others, and does not throw to the caller', () => {
    const after = vi.fn();
    const stopBad = onAccessRefusal(() => {
      throw new Error('listener bug');
    });
    const stopAfter = onAccessRefusal(after);

    expect(() => emitAccessRefusal({ message: 'x', url: null })).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    stopBad();
    stopAfter();
  });

  it('a listener that stops itself while being told does not disturb the rest', () => {
    const second = vi.fn();
    const stopFirst = onAccessRefusal(() => stopFirst());
    const stopSecond = onAccessRefusal(second);

    emitAccessRefusal({ message: 'x', url: null });

    expect(second).toHaveBeenCalledTimes(1);
    stopSecond();
  });

  it('with no listener at all does nothing', () => {
    expect(() => emitAccessRefusal({ message: 'x', url: null })).not.toThrow();
  });
});
