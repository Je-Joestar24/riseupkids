/**
 * The child's Bunny player, watch-only as in the phone app. A real iframe is drawn; what the Bunny embed would
 * send back (Player.js messages) is simulated, and what the player sends to it is recorded.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import BunnyEmbedIframe, { BUNNY_EMBED_LOAD_TIMEOUT_MS, BUNNY_PLAYBACK_HINT_MS } from './BunnyEmbedIframe';

const EMBED = 'https://iframe.mediadelivery.net/embed/123/abc';
const ORIGIN = 'https://iframe.mediadelivery.net';

let post;

const tree = (props = {}) => (
  <ThemeProvider theme={theme}>
    <div style={{ position: 'relative' }}>
      <BunnyEmbedIframe embedUrl={EMBED} title="Story time" {...props} />
    </div>
  </ThemeProvider>
);
const show = (props) => render(tree(props));
const iframe = () => document.querySelector('iframe');

const spyOnFrame = () => {
  post = vi.spyOn(iframe().contentWindow, 'postMessage').mockImplementation(() => {});
};
const fromEmbed = (message, { source, origin = ORIGIN } = {}) =>
  act(async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ context: 'player.js', version: '0.0.11', ...message }),
        origin,
        source: source ?? iframe().contentWindow,
      })
    );
  });
const sentMethods = () => post.mock.calls.map(([text]) => JSON.parse(text).method);
const wall = () => screen.queryByRole('button', { name: 'Play or pause Story time' });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the embed', () => {
  it('plays the video by itself with sound, with the same settings as the phone app', () => {
    show();

    const src = new URL(iframe().getAttribute('src'));
    expect(`${src.origin}${src.pathname}`).toBe(EMBED);
    expect(Object.fromEntries(src.searchParams)).toMatchObject({
      autoplay: 'true',
      muted: 'false',
      disableIosPlayer: 'true',
      disableAirplay: 'true',
      showSpeed: 'false',
      chromecast: 'false',
    });
  });

  it('has no Bunny full screen or picture in picture, and sends the page as referrer for the allowed-domain check', () => {
    show();

    const allow = iframe().getAttribute('allow');
    expect(allow).toContain('autoplay');
    expect(allow).not.toContain('fullscreen');
    expect(allow).not.toContain('picture-in-picture');
    expect(iframe().hasAttribute('allowfullscreen')).toBe(false);
    expect(iframe()).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  });

  it('is named for screen readers', () => {
    show();

    expect(iframe()).toHaveAttribute('title', 'Bunny embed — Story time');
    expect(iframe()).toHaveAttribute('aria-label', 'Bunny embed playback for Story time');
  });

  it('accepts the newer Bunny host too', () => {
    show({ embedUrl: 'https://player.mediadelivery.net/embed/9/z' });

    expect(iframe().getAttribute('src')).toContain('player.mediadelivery.net/embed/9/z');
  });

  it('tells the page when the embed has loaded', () => {
    const onLoad = vi.fn();
    show({ onLoad });

    fireEvent.load(iframe());

    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('says so, instead of drawing nothing, when there is no Bunny address', () => {
    show({ embedUrl: 'https://example.com/movie.mp4' });

    expect(iframe()).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('No video is available here right now.');
  });
});

describe('before the video is playing (the child can still reach Bunny)', () => {
  it('puts no cover over the video, so Bunny\'s own play button works if autoplay was refused', async () => {
    show();
    spyOnFrame();
    fireEvent.load(iframe());

    await fromEmbed({ event: 'ready' });

    expect(wall()).toBeNull();
    expect(iframe().hasAttribute('inert')).toBe(false);
  });

  it('when the embed is ready, subscribes to its events and asks it to play', async () => {
    show();
    spyOnFrame();

    await fromEmbed({ event: 'ready' });

    expect(sentMethods()).toEqual(['addEventListener', 'addEventListener', 'addEventListener', 'addEventListener', 'addEventListener', 'play']);
  });

  it('a refused autoplay is not an error: no cover and no error message', async () => {
    show();
    spyOnFrame();
    fireEvent.load(iframe());

    await fromEmbed({ event: 'error', value: { code: 5, msg: 'NotAllowedError' } });

    expect(wall()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('puts up no cover when the embed never answers at all (the player works as it did before)', async () => {
    show();
    fireEvent.load(iframe());

    await act(async () => vi.advanceTimersByTime(60000 - 1));

    expect(wall()).toBeNull();
  });

  it('ignores messages from anything but the embed', async () => {
    show();

    await fromEmbed({ event: 'play' }, { source: window });
    await fromEmbed({ event: 'play' }, { origin: 'https://evil.example.com' });

    expect(wall()).toBeNull();
  });
});

describe('once the video is playing (watch only)', () => {
  const startPlaying = async () => {
    show();
    spyOnFrame();
    fireEvent.load(iframe());
    await fromEmbed({ event: 'ready' });
    await fromEmbed({ event: 'play' });
  };

  it('covers the video, so Bunny\'s controls cannot be touched or reached by keyboard', async () => {
    await startPlaying();

    expect(wall()).toBeInTheDocument();
    expect(iframe().hasAttribute('inert')).toBe(true);
  });

  it('shows no badge for the first start (only a tap makes one)', async () => {
    await startPlaying();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a tap on the video pauses it, and a play button stays on the picture while it is paused', async () => {
    await startPlaying();
    post.mockClear();

    fireEvent.click(wall());
    expect(sentMethods()).toEqual(['pause']);
    await fromEmbed({ event: 'pause' });

    expect(screen.getByRole('status', { name: 'Paused' })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(BUNNY_PLAYBACK_HINT_MS * 30));
    expect(screen.getByRole('status', { name: 'Paused' })).toBeInTheDocument();
  });

  it('a second tap plays it again: the play button goes and a pause badge shows for a second', async () => {
    await startPlaying();
    fireEvent.click(wall());
    await fromEmbed({ event: 'pause' });
    post.mockClear();

    fireEvent.click(wall());
    expect(sentMethods()).toEqual(['play']);
    await fromEmbed({ event: 'play' });

    expect(screen.queryByRole('status', { name: 'Paused' })).toBeNull();
    expect(screen.getByRole('status', { name: 'Playing' })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(BUNNY_PLAYBACK_HINT_MS - 1));
    expect(screen.getByRole('status', { name: 'Playing' })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('the play button also goes when a time update arrives before the play message', async () => {
    await startPlaying();
    await fromEmbed({ event: 'pause' });
    expect(screen.getByRole('status', { name: 'Paused' })).toBeInTheDocument();

    await fromEmbed({ event: 'timeupdate', value: { seconds: 5 } });

    expect(screen.queryByRole('status', { name: 'Paused' })).toBeNull();
  });

  it('the play button is bigger than the playing badge, so it covers Bunny\'s own play button', async () => {
    await startPlaying();
    await fromEmbed({ event: 'pause' });
    const paused = screen.getByRole('status', { name: 'Paused' }).firstChild;
    expect(window.getComputedStyle(paused).width).toBe('92px');

    await fromEmbed({ event: 'play' });
    const playing = screen.getByRole('status', { name: 'Playing' }).firstChild;
    expect(window.getComputedStyle(playing).width).toBe('76px');
  });

  it('shows a play arrow while paused and a pause symbol in the one-second badge after it resumes', async () => {
    await startPlaying();
    await fromEmbed({ event: 'pause' });
    expect(screen.getByRole('status', { name: 'Paused' }).querySelector('[data-testid="PlayArrowIcon"]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Paused' }).querySelector('[data-testid="PauseIcon"]')).toBeNull();

    await fromEmbed({ event: 'play' });
    expect(screen.getByRole('status', { name: 'Playing' }).querySelector('[data-testid="PauseIcon"]')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Playing' }).querySelector('[data-testid="PlayArrowIcon"]')).toBeNull();
  });

  it('keeps the cover when the video ends, shows the play button, and a tap plays it again', async () => {
    await startPlaying();
    await fromEmbed({ event: 'ended' });
    post.mockClear();

    expect(screen.getByRole('status', { name: 'Paused' })).toBeInTheDocument();
    fireEvent.click(wall());

    expect(wall()).toBeInTheDocument();
    expect(sentMethods()).toEqual(['play']);
  });

  it('a click on the play button reaches the cover underneath (the button itself is not clickable)', async () => {
    await startPlaying();
    await fromEmbed({ event: 'pause' });

    expect(window.getComputedStyle(screen.getByRole('status', { name: 'Paused' })).pointerEvents).toBe('none');
  });

  it('can be used from the keyboard', async () => {
    await startPlaying();

    expect(wall().tagName).toBe('BUTTON');
    expect(wall()).toHaveAttribute('type', 'button');
  });

  it('takes the cover off again when the video changes', async () => {
    const view = show();
    spyOnFrame();
    await fromEmbed({ event: 'play' });
    expect(wall()).toBeInTheDocument();

    view.rerender(tree({ embedUrl: 'https://iframe.mediadelivery.net/embed/123/other' }));

    expect(wall()).toBeNull();
  });
});

describe('a video that cannot load', () => {
  it('shows the reason with Try again when the embed never loads', async () => {
    const onError = vi.fn();
    show({ onError });

    await act(async () => vi.advanceTimersByTime(BUNNY_EMBED_LOAD_TIMEOUT_MS - 1));
    expect(screen.queryByRole('alert')).toBeNull();
    await act(async () => vi.advanceTimersByTime(1));

    expect(screen.getByRole('alert')).toHaveTextContent('The video could not load. Check your connection and try again.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('shows no error for an embed that loaded in time', async () => {
    show();

    await act(async () => vi.advanceTimersByTime(BUNNY_EMBED_LOAD_TIMEOUT_MS / 2));
    fireEvent.load(iframe());
    await act(async () => vi.advanceTimersByTime(BUNNY_EMBED_LOAD_TIMEOUT_MS * 2));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the error when the player reports that the media failed (an error with no code)', async () => {
    show();
    spyOnFrame();
    fireEvent.load(iframe());

    await fromEmbed({ event: 'error', value: {} });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show the error for a failed command (an error with a code that is not about the media)', async () => {
    show();
    spyOnFrame();
    fireEvent.load(iframe());

    await fromEmbed({ event: 'error', value: { code: 2, msg: 'Invalid Method' } });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Try again builds the embed again (a new frame), clears the message and starts the wait again', async () => {
    show();
    const first = iframe();
    await act(async () => vi.advanceTimersByTime(BUNNY_EMBED_LOAD_TIMEOUT_MS));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(iframe()).not.toBe(first);
    await act(async () => vi.advanceTimersByTime(BUNNY_EMBED_LOAD_TIMEOUT_MS));
    expect(screen.getByRole('alert')).toBeInTheDocument(); // still not loaded: asks again
  });

  it('no cover is put over the error', async () => {
    show();
    spyOnFrame();
    await fromEmbed({ event: 'play' });
    await fromEmbed({ event: 'error', value: {} });

    expect(wall()).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('the unlocked version (preset "default")', () => {
  it('leaves Bunny\'s own controls, full screen and picture in picture alone, and never covers the video', async () => {
    show({ preset: 'default' });
    spyOnFrame();
    fireEvent.load(iframe());

    await fromEmbed({ event: 'ready' });
    await fromEmbed({ event: 'play' });

    expect(wall()).toBeNull();
    expect(post).not.toHaveBeenCalled();
    expect(iframe().getAttribute('allow')).toContain('fullscreen');
    expect(iframe().hasAttribute('allowfullscreen')).toBe(true);
    expect(new URL(iframe().getAttribute('src')).searchParams.get('autoplay')).toBeNull();
  });
});

describe('leaving', () => {
  it('stops listening to the embed when it goes away', async () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = show();

    view.unmount();

    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
