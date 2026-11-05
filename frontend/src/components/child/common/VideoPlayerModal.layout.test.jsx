/**
 * Safety net for the phone work: records how the video player is laid out TODAY on a computer and on a
 * phone held upright, so later phone changes can be proven not to touch them. The numbers asserted here are
 * the ones in the component now (height 90vh, 2rem title, 400px minimum for a file video, the narrow card,
 * ...). If one of these tests fails after a change, the computer or upright-phone view has changed.
 *
 * Network, redux and the follow-up players are replaced; the dialog, title bar, video area and footer are real.
 */
import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import { installMatchMedia, SCREENS } from '../../../test/matchMediaStub';

// The hooks hand back the SAME functions every time, as the real ones do (new ones on every render would make the
// component's "check the watch status" effect run again and again).
const hookFns = vi.hoisted(() => ({ dispatch: () => {}, watched: () => {}, status: async () => null }));
const hooks = vi.hoisted(() => ({
  progress: { markVideoWatched: hookFns.watched, getVideoWatchStatus: hookFns.status },
  explore: { markExploreVideoWatched: hookFns.watched, getExploreVideoWatchStatus: hookFns.status },
}));
vi.mock('react-redux', () => ({ useDispatch: () => hookFns.dispatch }));
vi.mock('../../../hooks/courseProgressHook', () => ({ default: () => hooks.progress }));
vi.mock('../../../hooks/exploreVideoWatchHook', () => ({ default: () => hooks.explore }));
vi.mock('../../../services/courseProgressService', () => ({ default: { updateProgress: vi.fn() } }));
vi.mock('../../../services/html5Service', () => ({ default: {} }));
vi.mock('../../../utils/childStatsSync', () => ({ applyStarRewardFromCompletion: vi.fn() }));
vi.mock('../../common/ChildDialogBox', () => ({ default: () => null }));
vi.mock('./ScormPlayer', () => ({ default: () => null }));
vi.mock('./cms/CmsBooksModalPlayer', () => ({ default: () => null }));

import VideoPlayerModal from './VideoPlayerModal';

const fileVideo = { _id: 'v1', title: 'Counting song', videoSource: 'upload', url: 'https://cdn.example/song.mp4' };
const bunnyVideo = {
  _id: 'v2',
  title: 'Story time',
  videoSource: 'embed',
  embedUrl: 'https://iframe.mediadelivery.net/embed/123/abc',
};

let screenStub;

const show = (video = fileVideo, props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <VideoPlayerModal open onClose={() => {}} video={video} childId="kid1" {...props} />
    </ThemeProvider>
  );

const paper = () => document.querySelector('.MuiDialog-paper');
const style = (element) => window.getComputedStyle(element);
const title = () => screen.getByText(/Counting song|Story time/);
const closeIcon = () => screen.getByRole('button', { name: 'Close video' });
const videoElement = () => document.querySelector('video');
const iframe = () => document.querySelector('iframe');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  // jsdom does not play media
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => {
  screenStub?.restore();
  vi.restoreAllMocks();
});

describe('Video player on a computer (today)', () => {
  beforeEach(() => {
    screenStub = installMatchMedia(SCREENS.desktop);
  });

  it('is a large rounded dialog 90vh high with the big title bar and a footer with Close', () => {
    show();

    expect(style(paper()).height).toBe('90vh');
    expect(style(paper()).maxHeight).toBe('90vh');
    expect(style(paper()).borderRadius).toBe('20px');
    expect(style(title()).fontSize).toBe('2rem');
    expect(closeIcon().className).toContain('MuiIconButton-sizeLarge');
    const footerClose = screen.getByRole('button', { name: 'Close' });
    expect(footerClose.className).toContain('MuiButton-contained');
  });

  it('is the "lg" width dialog, not the 480px card', () => {
    show();

    expect(document.querySelector('.MuiDialog-paperWidthLg')).toBeInTheDocument();
    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeNull();
    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeNull();
  });

  it('gives an uploaded file a content area of at least 400px, and keeps its video settings', () => {
    show();

    const content = document.querySelector('.MuiDialogContent-root');
    expect(style(content).minHeight).toBe('400px');
    const video = videoElement();
    expect(video).toHaveAttribute('src', fileVideo.url);
    expect(video.controls).toBe(false);
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('preload', 'auto');
    expect(video.getAttribute('controlslist')).toContain('nofullscreen');
    expect(video.style.objectFit).toBe('contain');
  });

  it('shows the Bunny embed inside the dialog, watch-only: its own full screen and picture in picture are off', () => {
    show(bunnyVideo);

    const src = new URL(iframe().getAttribute('src'));
    expect(`${src.origin}${src.pathname}`).toBe(bunnyVideo.embedUrl);
    expect(src.searchParams.get('autoplay')).toBe('true');
    expect(iframe().getAttribute('allow')).toContain('autoplay');
    expect(iframe().getAttribute('allow')).not.toContain('fullscreen');
    expect(iframe().getAttribute('allow')).not.toContain('picture-in-picture');
    expect(iframe().hasAttribute('allowfullscreen')).toBe(false);
    expect(style(document.querySelector('.MuiDialogContent-root')).minHeight).not.toBe('400px');
  });

  it('shows the finish button in the footer (not under the video) for a Bunny embed', () => {
    show(bunnyVideo);

    const footer = document.querySelector('.MuiDialogActions-root');
    expect(footer).toHaveTextContent(/finished watching/i);
  });

  it.each([
    ['a 1920 x 1080 screen', SCREENS.desktopFull],
    ['a desktop browser window dragged to 700 x 400 with a mouse', SCREENS.desktopSmallWindow],
    ['a tablet held upright', SCREENS.tablet],
    ['a tablet held sideways', SCREENS.tabletSideways],
  ])('looks the same on %s as on the 1366 x 768 desktop (the wide layout)', (_name, size) => {
    // 700 px is above the 600 px breakpoint; none of these is a phone held upright
    screenStub.set(size);
    show();

    expect(style(paper()).height).toBe('90vh');
    expect(style(title()).fontSize).toBe('2rem');
    expect(document.querySelector('.MuiDialog-paperWidthLg')).toBeInTheDocument();
  });
});

describe('Video player on a phone held upright (today)', () => {
  beforeEach(() => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
  });

  it('is the 480px card: automatic height, 16px corners, slim title and text Close button', () => {
    show();

    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeInTheDocument();
    expect(style(paper()).height).toBe('auto');
    expect(style(paper()).maxWidth).toBe('480px');
    expect(style(paper()).maxHeight).toBe('calc(100vh - 32px)');
    expect(style(paper()).borderRadius).toBe('16px');
    expect(style(title()).fontSize).toBe('1.25rem');
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('MuiButton-text');
  });

  it('locks the video area to 16:9 and does not ask for a minimum height', () => {
    show();

    const area = videoElement().parentElement;
    expect(style(area).aspectRatio.replace(/\s/g, '')).toBe('16/9');
    expect(style(document.querySelector('.MuiDialogContent-root')).minHeight).not.toBe('400px');
  });

  it('puts the Bunny finish button under the video, full width', () => {
    show(bunnyVideo);

    const footer = document.querySelector('.MuiDialogActions-root');
    expect(footer).not.toHaveTextContent(/finished watching/i);
    const underVideo = screen.getByRole('button', { name: /finished watching/i });
    expect(underVideo.className).toContain('MuiButton-fullWidth');
  });

  it('is also what a 375 x 667 phone and a desktop window narrower than 600px get', () => {
    screenStub.set(SCREENS.phoneSmallUpright);
    const first = show();
    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeInTheDocument();
    first.unmount();

    screenStub.set({ width: 580, height: 900, touch: false });
    show();
    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeInTheDocument();
  });
});

describe('Video player on a phone held sideways (new)', () => {
  beforeEach(() => {
    screenStub = installMatchMedia(SCREENS.phoneSideways);
  });

  it.each([
    ['844 x 390', SCREENS.phoneSideways],
    ['667 x 375', SCREENS.phoneSmallSideways],
    ['640 x 360', SCREENS.phoneTinySideways],
  ])('is a full-screen black stage with square corners on a %s phone', (_name, size) => {
    screenStub.set(size);
    show();

    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeInTheDocument();
    expect(document.querySelector('.MuiDialog-paperWidthLg')).toBeNull();
    expect(style(paper()).height).toBe('100dvh');
    expect(parseFloat(style(paper()).borderRadius)).toBe(0);
    expect(style(paper()).backgroundColor).toBe('rgb(0, 0, 0)');
  });

  it('has a slim title bar and no footer, with Close in the bar', () => {
    show();

    expect(style(title()).fontSize).toBe('1.05rem');
    expect(document.querySelector('.MuiDialogActions-root')).toBeNull();
    expect(document.querySelector('.MuiDialogTitle-root')).toContainElement(closeIcon());
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull(); // the footer's text button is gone
  });

  it('lets the video take the height that is left, instead of asking for 400px', () => {
    show();

    expect(style(document.querySelector('.MuiDialogContent-root')).minHeight).not.toBe('400px');
    expect(videoElement()).toHaveAttribute('src', fileVideo.url);
  });

  it('keeps the same video settings as on a computer', () => {
    show();

    const video = videoElement();
    expect(video.controls).toBe(false);
    expect(video).toHaveAttribute('playsinline');
    expect(video.getAttribute('controlslist')).toContain('nofullscreen');
    expect(video.style.objectFit).toBe('contain');
  });

  it('a file video still has the slim title bar with the title and Close', () => {
    show();

    const bar = document.querySelector('.MuiDialogTitle-root');
    expect(bar).toHaveTextContent('Counting song');
    expect(bar).toContainElement(closeIcon());
  });

  it('still asks "Close Video?" before closing', () => {
    show();

    act(() => closeIcon().click());

    expect(screen.getByText('Close Video?')).toBeInTheDocument();
  });
});

describe('Video player: full screen button (only where it can work)', () => {
  let request;
  let exit;
  let fullscreenElement;

  const browser = ({ canFullscreen = true } = {}) => {
    fullscreenElement = null;
    request = vi.fn(async () => {
      fullscreenElement = document.documentElement;
    });
    exit = vi.fn(async () => {
      fullscreenElement = null;
    });
    document.documentElement.requestFullscreen = canFullscreen ? request : undefined;
    document.exitFullscreen = exit;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: { lock: async () => {}, unlock: () => {} } });
  };
  afterEach(() => {
    delete document.documentElement.requestFullscreen;
  });

  const button = () => screen.queryByRole('button', { name: /^(Full screen|Leave full screen)$/ });
  const settle = () => act(async () => {});
  const closed = (
    <ThemeProvider theme={theme}>
      <VideoPlayerModal open={false} onClose={() => {}} video={fileVideo} childId="kid1" />
    </ThemeProvider>
  );

  it('is in the title bar of a sideways phone whose browser can do it, and asks for full screen when tapped', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show();

    expect(document.querySelector('.MuiDialogTitle-root')).toContainElement(screen.getByRole('button', { name: 'Full screen' }));
    await act(async () => button().click());

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('turns into "Leave full screen" while full screen, and gives it back when tapped again', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show();
    await act(async () => button().click());
    await act(async () => document.dispatchEvent(new Event('fullscreenchange')));

    expect(button()).toHaveAccessibleName('Leave full screen');
    await act(async () => button().click());

    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('is also in the title bar of an upright phone (the phone app has the same Fullscreen button)', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show();

    expect(document.querySelector('.MuiDialogTitle-root')).toContainElement(screen.getByRole('button', { name: 'Full screen' }));
    await act(async () => button().click());
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('is not offered on an iPhone-like browser that cannot make the page full screen', () => {
    browser({ canFullscreen: false });
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show();

    expect(button()).toBeNull();
  });

  it.each([
    ['a computer', SCREENS.desktop],
    ['a computer window dragged small', SCREENS.desktopSmallWindow],
    ['a tablet', SCREENS.tabletSideways],
  ])('is not offered on %s, even if the browser could', (_name, size) => {
    browser();
    screenStub = installMatchMedia(size);
    show();

    expect(button()).toBeNull();
  });

  it('gives full screen back when the video is closed', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    const view = show();
    await act(async () => button().click());
    await settle();

    view.rerender(closed);
    await settle();

    expect(exit).toHaveBeenCalled();
  });

  it('never asks the browser for anything on a computer, however the video is used', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.desktop);
    const view = show();
    await settle();
    view.rerender(closed);
    await settle();

    expect(request).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('Bunny video on a phone held sideways: the full-screen view (as in the phone app)', () => {
  let request;
  let exit;
  let fullscreenElement;

  const browser = ({ canFullscreen = true } = {}) => {
    fullscreenElement = null;
    request = vi.fn(async () => {
      fullscreenElement = document.documentElement;
    });
    exit = vi.fn(async () => {
      fullscreenElement = null;
    });
    document.documentElement.requestFullscreen = canFullscreen ? request : undefined;
    document.exitFullscreen = exit;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
    Object.defineProperty(window.screen, 'orientation', { configurable: true, value: { lock: async () => {}, unlock: () => {} } });
  };
  afterEach(() => {
    delete document.documentElement.requestFullscreen;
  });

  const toggle = () => screen.queryByRole('button', { name: /^(Full screen|Leave full screen)$/ });
  const content = () => document.querySelector('.MuiDialogContent-root');
  /** The emotion rule written for one element (earlier tests leave their own css in the document). */
  const ruleOf = (element) => {
    const css = Array.from(document.querySelectorAll('style')).map((tag) => tag.textContent).join('\n');
    return (
      element.className
        .split(' ')
        .filter((name) => name.startsWith('css-'))
        .map((name) => css.match(new RegExp(`\\.${name}\\{[^}]*\\}`)))
        .find(Boolean)?.[0] ?? ''
    );
  };

  it('has no header at all: no title bar, no title, no Close button, no footer', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    expect(document.querySelector('.MuiDialogTitle-root')).toBeNull();
    expect(screen.queryByText('Story time')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close video' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(document.querySelector('.MuiDialogActions-root')).toBeNull();
  });

  it('is a full-screen black stage with the video filling it', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeInTheDocument();
    expect(style(paper()).height).toBe('100dvh');
    expect(style(paper()).backgroundColor).toBe('rgb(0, 0, 0)');
    expect(content()).toContainElement(iframe());
  });

  it('has the screen toggle as the only button of its own at the top right, and it asks for full screen', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    expect(content()).toContainElement(toggle());
    expect(style(toggle()).position).toBe('absolute');
    await act(async () => toggle().click());
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('the toggle becomes "Leave full screen" and gives it back', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);
    await act(async () => toggle().click());
    await act(async () => document.dispatchEvent(new Event('fullscreenchange')));

    expect(toggle()).toHaveAccessibleName('Leave full screen');
    await act(async () => toggle().click());

    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('puts "I finished watching" over the picture at the lower left, and nowhere else', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    const buttons = screen.getAllByRole('button', { name: /finished watching/i });
    expect(buttons).toHaveLength(1);
    expect(content()).toContainElement(buttons[0]);
    expect(buttons[0].className).not.toContain('MuiButton-fullWidth');
    const holder = buttons[0].parentElement;
    expect(style(holder).position).toBe('absolute');
    expect(holder.getAttribute('class')).toBeTruthy();
    // the holder is the lower-left one: its css puts it on the left edge and the bottom edge, above the cover (10)
    const rule = ruleOf(holder);
    expect(rule).toContain('left:max(12px, env(safe-area-inset-left))');
    expect(rule).toContain('bottom:max(12px, env(safe-area-inset-bottom))');
    expect(rule).toContain('z-index:25');
    expect(rule).not.toContain('right:');
    expect(rule).not.toContain('top:');
  });

  it('puts the screen toggle in the top right corner, above the cover so it can be tapped', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    const rule = ruleOf(toggle());
    expect(rule).toContain('top:max(8px, env(safe-area-inset-top))');
    expect(rule).toContain('right:max(8px, env(safe-area-inset-right))');
    expect(rule).toContain('z-index:25');
    expect(rule).not.toContain('left:');
    expect(rule).not.toContain('bottom:');
  });

  it('with no full screen in the browser (iPhone) there is no toggle and still no Close', () => {
    browser({ canFullscreen: false });
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    expect(toggle()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close video' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /finished watching/i })).toHaveLength(1);
  });

  it('the cover button is the only other control on the picture', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show(bunnyVideo);

    // before the video plays there is no cover yet: only the toggle and the finish button
    expect(within(content()).getAllByRole('button').map((button) => button.getAttribute('aria-label') || button.textContent).sort())
      .toEqual(['Full screen', 'I finished watching']);
  });

  it('a phone held upright still has the card with its title, Full screen and Close', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show(bunnyVideo);

    const bar = document.querySelector('.MuiDialogTitle-root');
    expect(bar).toHaveTextContent('Story time');
    expect(bar).toContainElement(closeIcon());
    expect(bar).toContainElement(toggle());
  });

  it('a computer still has its header, footer and Close', () => {
    browser();
    screenStub = installMatchMedia(SCREENS.desktop);
    show(bunnyVideo);

    expect(document.querySelector('.MuiDialogTitle-root')).toHaveTextContent('Story time');
    expect(closeIcon()).toBeInTheDocument();
    expect(document.querySelector('.MuiDialogActions-root')).toHaveTextContent(/finished watching/i);
    expect(toggle()).toBeNull();
  });

  it('rotating from upright to sideways and back keeps the same Bunny frame and moves the buttons', async () => {
    browser();
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show(bunnyVideo);
    const frame = iframe();
    expect(document.querySelector('.MuiDialogTitle-root')).toBeInTheDocument();

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(iframe()).toBe(frame);
    expect(document.querySelector('.MuiDialogTitle-root')).toBeNull();
    expect(screen.getAllByRole('button', { name: /finished watching/i })).toHaveLength(1);

    await act(async () => screenStub.set(SCREENS.phoneUpright));
    expect(iframe()).toBe(frame);
    expect(document.querySelector('.MuiDialogTitle-root')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /finished watching/i })).toHaveLength(1);
  });
});

describe('Video player: rotating while it is open', () => {
  it('keeps the very same video element from upright to sideways and back, so playback is not restarted', async () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show();
    const before = videoElement();
    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeInTheDocument();

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(videoElement()).toBe(before);
    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeInTheDocument();

    await act(async () => screenStub.set(SCREENS.phoneUpright));
    expect(videoElement()).toBe(before);
    expect(document.querySelector('.MuiDialog-paperWidthXs')).toBeInTheDocument();
    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeNull();
  });

  it('keeps the same Bunny frame (it would reload and restart if it were rebuilt)', async () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show(bunnyVideo);
    const before = iframe();

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(iframe()).toBe(before);

    await act(async () => screenStub.set(SCREENS.phoneUpright));
    expect(iframe()).toBe(before);
  });

  it('moves the finish button between the bar, under the video and the footer without losing it', async () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show(bunnyVideo);
    const count = () => screen.queryAllByRole('button', { name: /finished watching/i }).length;
    expect(count()).toBe(1);

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(count()).toBe(1);

    await act(async () => screenStub.set(SCREENS.desktop));
    expect(count()).toBe(1);
    expect(document.querySelector('.MuiDialogActions-root')).toHaveTextContent(/finished watching/i);
  });

  it('a computer window resized from wide to narrow and back never gets the phone stage', async () => {
    screenStub = installMatchMedia(SCREENS.desktop);
    show();

    await act(async () => screenStub.set(SCREENS.desktopSmallWindow));
    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeNull();
    expect(style(paper()).height).toBe('90vh');

    await act(async () => screenStub.set({ width: 500, height: 300, touch: false }));
    expect(document.querySelector('.MuiDialog-paperFullScreen')).toBeNull();
  });
});
