import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installMatchMedia, SCREENS } from '../test/matchMediaStub';
import {
  enterPlayerFullscreen,
  exitPlayerFullscreen,
  isTouchPhone,
  playerFullscreenSupported,
} from './playerFullscreen';

let stub;
let request;
let exit;
let lock;
let unlock;
let fullscreenElement;

const setBrowser = ({ canFullscreen = true, canLock = true } = {}) => {
  fullscreenElement = null;
  request = vi.fn(async () => {
    fullscreenElement = document.documentElement;
  });
  exit = vi.fn(async () => {
    fullscreenElement = null;
  });
  lock = vi.fn(async () => {});
  unlock = vi.fn();
  document.documentElement.requestFullscreen = canFullscreen ? request : undefined;
  document.exitFullscreen = exit;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: canLock ? { lock, unlock } : undefined,
  });
};

beforeEach(() => setBrowser());
afterEach(async () => {
  await exitPlayerFullscreen();
  stub?.restore();
  delete document.documentElement.requestFullscreen;
});

describe('who counts as a touch phone', () => {
  it.each([
    ['an upright phone', SCREENS.phoneUpright, true],
    ['a sideways phone', SCREENS.phoneSideways, true],
    ['the smallest sideways phone', SCREENS.phoneTinySideways, true],
    ['a tablet upright', SCREENS.tablet, false],
    ['a tablet sideways', SCREENS.tabletSideways, false],
    ['a computer', SCREENS.desktop, false],
    ['a computer window dragged small', SCREENS.desktopSmallWindow, false],
  ])('%s: %s', (_name, size, expected) => {
    stub = installMatchMedia(size);
    expect(isTouchPhone()).toBe(expected);
  });
});

describe('asking for full screen', () => {
  it('on an Android-like phone: asks for full screen, then locks sideways, and says yes', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);

    const granted = await enterPlayerFullscreen();

    expect(granted).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('is not offered on an iPhone-like browser that cannot make the page full screen', async () => {
    setBrowser({ canFullscreen: false });
    stub = installMatchMedia(SCREENS.phoneUpright);

    expect(playerFullscreenSupported()).toBe(false);
    expect(await enterPlayerFullscreen()).toBe(false);
    expect(lock).not.toHaveBeenCalled();
  });

  it.each([
    ['a computer', SCREENS.desktop],
    ['a computer window dragged small', SCREENS.desktopSmallWindow],
    ['a tablet', SCREENS.tablet],
  ])('never asks anything of %s', async (_name, size) => {
    stub = installMatchMedia(size);

    expect(playerFullscreenSupported()).toBe(false);
    expect(await enterPlayerFullscreen()).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(lock).not.toHaveBeenCalled();
  });

  it('does not lock the rotation when full screen was refused', async () => {
    request.mockRejectedValueOnce(new Error('not allowed'));
    stub = installMatchMedia(SCREENS.phoneUpright);

    expect(await enterPlayerFullscreen()).toBe(false);
    expect(lock).not.toHaveBeenCalled();
  });

  it('still counts as full screen when only the sideways lock is refused', async () => {
    lock.mockRejectedValueOnce(new Error('not supported'));
    stub = installMatchMedia(SCREENS.phoneUpright);

    expect(await enterPlayerFullscreen()).toBe(true);
  });

  it('works when the browser has no orientation lock at all', async () => {
    setBrowser({ canLock: false });
    stub = installMatchMedia(SCREENS.phoneUpright);

    expect(await enterPlayerFullscreen()).toBe(true);
  });

  it('does not ask again when the page is already full screen', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);
    await enterPlayerFullscreen();

    expect(await enterPlayerFullscreen()).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('giving it back', () => {
  it('leaves full screen and unlocks the rotation it started', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);
    await enterPlayerFullscreen();

    await exitPlayerFullscreen();

    expect(unlock).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('leaves alone a full screen it did not start (a video the child made full screen by hand)', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);
    fullscreenElement = document.body;

    await exitPlayerFullscreen();

    expect(exit).not.toHaveBeenCalled();
    expect(unlock).not.toHaveBeenCalled();
  });

  it('only gives back once, and not at all when the child already left full screen', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);
    await enterPlayerFullscreen();
    fullscreenElement = null; // the child pressed back

    await exitPlayerFullscreen();
    await exitPlayerFullscreen();

    expect(exit).not.toHaveBeenCalled();
    expect(unlock).toHaveBeenCalledTimes(1);
  });
});
