import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { installMatchMedia, SCREENS } from '../test/matchMediaStub';
import usePlayerViewport from './usePlayerViewport';

const Show = () => <p data-testid="mode">{usePlayerViewport()}</p>;
const mode = () => screen.getByTestId('mode').textContent;

let stub;
afterEach(() => stub?.restore());

describe('usePlayerViewport', () => {
  it.each([
    ['a 1366 x 768 computer', SCREENS.desktop, 'desktop'],
    ['a 1920 x 1080 computer', SCREENS.desktopFull, 'desktop'],
    ['a computer browser window dragged to 700 x 400, with a mouse', SCREENS.desktopSmallWindow, 'desktop'],
    ['a computer window dragged narrow and tall, with a mouse', { width: 400, height: 800, touch: false }, 'desktop'],
    ['a tablet held upright', SCREENS.tablet, 'desktop'],
    ['a tablet held sideways', SCREENS.tabletSideways, 'desktop'],
    ['a phone held upright (390 x 844)', SCREENS.phoneUpright, 'phone-portrait'],
    ['a small phone held upright (375 x 667)', SCREENS.phoneSmallUpright, 'phone-portrait'],
    ['a phone held sideways (844 x 390)', SCREENS.phoneSideways, 'phone-landscape'],
    ['a small phone held sideways (667 x 375)', SCREENS.phoneSmallSideways, 'phone-landscape'],
    ['the smallest sideways phone (640 x 360)', SCREENS.phoneTinySideways, 'phone-landscape'],
  ])('says %s is "%s"', (_name, size, expected) => {
    stub = installMatchMedia(size);
    render(<Show />);
    expect(mode()).toBe(expected);
  });

  it('draws the right answer in the very first render (no flash of the computer layout on a phone)', () => {
    stub = installMatchMedia(SCREENS.phoneSideways);
    const seen = [];
    const Spy = () => {
      const value = usePlayerViewport();
      seen.push(value);
      return null;
    };
    render(<Spy />);
    expect(seen[0]).toBe('phone-landscape');
  });

  it('follows a rotation in both directions while open', async () => {
    stub = installMatchMedia(SCREENS.phoneUpright);
    render(<Show />);
    expect(mode()).toBe('phone-portrait');

    await act(async () => stub.set(SCREENS.phoneSideways));
    expect(mode()).toBe('phone-landscape');

    await act(async () => stub.set(SCREENS.phoneUpright));
    expect(mode()).toBe('phone-portrait');
  });

  it('drops back to "desktop" when a phone is plugged into a mouse and a big screen', async () => {
    stub = installMatchMedia(SCREENS.phoneSideways);
    render(<Show />);

    await act(async () => stub.set(SCREENS.desktop));

    expect(mode()).toBe('desktop');
  });

  it('is "desktop" when the browser has no matchMedia at all', () => {
    const original = window.matchMedia;
    window.matchMedia = undefined;
    try {
      render(<Show />);
      expect(mode()).toBe('desktop');
    } finally {
      window.matchMedia = original;
    }
  });
});
