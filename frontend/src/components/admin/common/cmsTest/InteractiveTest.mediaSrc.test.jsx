/**
 * The drag-and-drop page plays its option and answer sounds from the reader's local copy when there is one, and
 * from the original address when it is shown on its own (the admin preview).
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import { CmsMediaSrcProvider } from '../../../../hooks/cmsMediaSrc';
import InteractiveTest from './InteractiveTest';

const U = (name) => `https://cdn.test/${name}`;

const page = {
  pageId: 'drag',
  type: 'activity_drag_2x1',
  interaction: {
    options: [{ optionId: 'o1', label: 'Cat', audioUrl: U('cat.mp3') }],
    dropZones: [{ zoneId: 'z1', label: 'Home', correctOptionId: 'o1', audioUrl: U('home.mp3') }],
  },
};

let audios;
class FakeAudio {
  constructor(src) { this.src = src; audios.push(this); }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
}

beforeEach(() => {
  audios = [];
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => vi.unstubAllGlobals());

const show = (resolve) =>
  render(
    <ThemeProvider theme={theme}>
      <CmsMediaSrcProvider resolve={resolve}>
        <InteractiveTest page={page} isPreloading={false} onPickOption={() => {}} onRetry={() => {}} onCorrectDrop={() => {}} />
      </CmsMediaSrcProvider>
    </ThemeProvider>
  );

describe('Drag-and-drop page sounds', () => {
  it('an option plays its local copy', () => {
    show((url) => `blob:local/${url.split('/').pop()}`);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Choose Cat' }), { key: 'Enter' });
    expect(audios.map((a) => a.src)).toEqual(['blob:local/cat.mp3']);
  });

  it('shown on its own (no reader), an option plays from the original address, as before', () => {
    show(undefined);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Choose Cat' }), { key: 'Enter' });
    expect(audios.map((a) => a.src)).toEqual([U('cat.mp3')]);
  });

  it('an answer zone plays its local copy', () => {
    show((url) => `blob:local/${url.split('/').pop()}`);
    const zone = screen.queryByRole('button', { name: 'Play Home sound' });
    // the zone is only drawn once the stage has a measured size; jsdom has none, so say so rather than pass quietly
    if (!zone) {
      expect.soft(zone, 'the answer zone is not drawn without a measured stage').not.toBeNull();
      return;
    }
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(audios.map((a) => a.src)).toEqual(['blob:local/home.mp3']);
  });
});
