/**
 * Phone sizing for Explore and Explore Videos.
 *
 * Two promises, checked on the style rules the pages really generate:
 *  1. Tablets and computers (600px and wider) get exactly the sizes they always had.
 *  2. Phones get a little more room at the sides, text and pictures that fit a small screen, the app's picture
 *     heights, and (Explore Videos) no share card, like the app.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../config/theme';
import uiReducer from '../../store/slices/uiSlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import ChildExplore from './ChildExplore';
import ChildExploreVideos from './ChildExploreVideos';
import { readResponsiveCss } from '../../test/readResponsiveCss';
import { installMatchMedia, SCREENS } from '../../test/matchMediaStub';

const mockExplore = {
  fetchExploreContent: vi.fn(),
  fetchContentByType: vi.fn(),
  getCoverImageUrl: (path) => path,
  getVideoFileUrl: (path) => path,
};
const mockWatch = {
  getVideoTypeProgress: vi.fn(),
  getTotalStarsForVideoType: vi.fn(),
  getExploreVideoWatchStatus: vi.fn(),
};
vi.mock('../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../../hooks/useChildProfile', () => ({
  default: () => ({ kidsWallEnabled: true }),
  useChildProfile: () => ({ kidsWallEnabled: true }),
}));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

const video = (id, title) => ({ _id: id, title, description: `About ${title}`, duration: 180, coverImage: `https://cdn.test/${id}.png` });
const replay = (id, title) => ({ ...video(id, title), videoType: 'replay', createdBy: { name: 'Teacher Anna' } });

let screenStub;
beforeEach(() => {
  vi.clearAllMocks();
  mockExplore.fetchExploreContent.mockResolvedValue({ data: [video('v1', 'Pancakes'), video('v2', 'Smoothie')] });
  mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [replay('r1', 'Replay one')] } });
  mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 6, viewedVideos: 2 });
  mockWatch.getTotalStarsForVideoType.mockResolvedValue(40);
  mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0, starsAwarded: false });
});
afterEach(() => {
  cleanup();
  screenStub?.restore();
  screenStub = null;
});

const withScreen = (screen) => {
  screenStub = installMatchMedia(screen);
};

const store = () => configureStore({ reducer: { ui: uiReducer, childPageCache: childPageCacheReducer } });
const mount = async (ui, path) => {
  const view = render(
    <Provider store={store()}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/child/:id/explore" element={ui} />
            <Route path="/child/:id/explore/videos/:videoType" element={ui} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  await act(async () => {});
  await act(async () => {});
  return view;
};
const mountExplore = () => mount(<ChildExplore childId="kid1" />, '/child/kid1/explore');
const mountVideos = () => mount(<ChildExploreVideos childId="kid1" />, '/child/kid1/explore/videos/cooking');

describe('Explore page', () => {
  it('keeps its side space on computers and tablets and gives phones a little more', async () => {
    withScreen(SCREENS.desktop);
    const { container } = await mountExplore();
    const column = container.firstElementChild.firstElementChild;
    expect(css(column).desktop).toMatchObject({ 'padding-left': '24px', 'padding-right': '24px' });
    expect(isFluid(css(column).phone['padding-left'])).toBe(true);
    expect(isFluid(css(column).phone['padding-right'])).toBe(true);
  });

  describe('Watch Replays', () => {
    it('keeps its computer sizes', async () => {
      withScreen(SCREENS.desktop);
      await mountExplore();
      const title = screen.getByText('Watch Replays');
      expect(css(title).desktop['font-size']).toBe('24px');
      expect(css(screen.getByText('▶')).desktop).toMatchObject({ 'font-size': '20px', 'padding-left': '16px', 'padding-right': '16px' });
      expect(css(screen.getByRole('button', { name: /See All/ })).desktop['font-size']).toBe('18px');

      const card = screen.getByText('Replay one').parentElement.parentElement;
      expect(css(card).desktop['hover:transform']).toBe('scale(1.03)');
      const content = screen.getByText('Replay one').parentElement;
      expect(css(content).desktop.padding).toBe('20px');
      expect(css(screen.getByText('Replay one')).desktop['font-size']).toBe('20px');
      expect(css(screen.getByRole('button', { name: 'Watch Now' })).desktop['padding-left']).toBe('20px');
      // the picture keeps its usual proportions and has no fixed height
      expect(css(card.firstElementChild).desktop).toMatchObject({ height: 'auto', 'aspect-ratio': '4/3' });
    });

    it('is fluid on phones, with the app\'s 160px picture and no grow-on-hover', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountExplore();
      expect(isFluid(css(screen.getByText('Watch Replays')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('▶')).phone['padding-left'])).toBe(true);
      expect(isFluid(css(screen.getByRole('button', { name: /See All/ })).phone['font-size'])).toBe(true);

      const card = screen.getByText('Replay one').parentElement.parentElement;
      expect(css(card).phone['hover:transform']).toBe('none');
      expect(css(card.firstElementChild).phone).toMatchObject({ height: '160px', 'aspect-ratio': 'auto' });
      expect(isFluid(css(screen.getByText('Replay one').parentElement).phone.padding)).toBe(true);
      expect(isFluid(css(screen.getByText('Replay one')).phone['font-size'])).toBe(true);
    });
  });

  describe('"What do you want to learn?" card', () => {
    it('keeps its computer sizes and scales on phones', async () => {
      withScreen(SCREENS.desktop);
      await mountExplore();
      const title = screen.getByText('What Do You Want to Learn?');
      expect(css(title.parentElement).desktop.padding).toBe('32px');
      expect(css(title).desktop['font-size']).toBe('30px');
      expect(css(screen.getByText('Pick Something fun!')).desktop['font-size']).toBe('20px');
      expect(isFluid(css(title.parentElement).phone.padding)).toBe(true);
      expect(isFluid(css(title).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('Pick Something fun!')).phone['font-size'])).toBe(true);
    });
  });

  describe('collection cards', () => {
    const cardOf = () => screen.getByText('Arts & Crafts').closest('.MuiPaper-root');

    it('keep their computer sizes', async () => {
      withScreen(SCREENS.desktop);
      await mountExplore();
      const card = cardOf();
      expect(css(card).desktop).toMatchObject({ padding: '24px', 'hover:transform': 'translateY(-2px)' });
      expect(css(screen.getByText('Arts & Crafts')).desktop['font-size']).toBe('24px');
      const icon = card.firstElementChild.firstElementChild;
      expect(css(icon).desktop).toMatchObject({ 'svg|width': '65px', 'svg|height': '65px' });
      const start = screen.getAllByRole('button', { name: /Start now!|Continue!/ })[0];
      expect(css(start).desktop).toMatchObject({ 'font-size': '20px', 'padding-top': '14px', 'padding-bottom': '14px' });
      expect(css(card.parentElement).desktop.gap).toBe('24px');
    });

    it('shrink a little on phones and do not lift on hover', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountExplore();
      const card = cardOf();
      expect(isFluid(css(card).phone.padding)).toBe(true);
      expect(css(card).phone['hover:transform']).toBe('none');
      expect(isFluid(css(screen.getByText('Arts & Crafts')).phone['font-size'])).toBe(true);
      const icon = card.firstElementChild.firstElementChild;
      expect(isFluid(css(icon).phone['svg|width'])).toBe(true);
      const start = screen.getAllByRole('button', { name: /Start now!|Continue!/ })[0];
      expect(isFluid(css(start).phone['font-size'])).toBe(true);
      expect(isFluid(css(start).phone['padding-top'])).toBe(true);
      expect(isFluid(css(card.parentElement).phone.gap)).toBe(true);
    });
  });
});

describe('Explore Videos page', () => {
  it('keeps its side space on computers and tablets and gives phones a little more', async () => {
    withScreen(SCREENS.desktop);
    const { container } = await mountVideos();
    const column = container.firstElementChild.firstElementChild;
    expect(css(column).desktop).toMatchObject({ 'padding-left': '24px', 'padding-right': '24px' });
    expect(isFluid(css(column).phone['padding-left'])).toBe(true);
  });

  describe('share card', () => {
    it('is shown on computers and tablets, as before', async () => {
      withScreen(SCREENS.desktop);
      await mountVideos();
      expect(screen.getByText('Made Something Tasty?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Share My Food!' })).toBeInTheDocument();
    });

    it('is shown on a tablet too', async () => {
      withScreen(SCREENS.tablet);
      await mountVideos();
      expect(screen.getByText('Made Something Tasty?')).toBeInTheDocument();
    });

    it('is left out on phones, like the app, and the rest of the page is still there', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountVideos();
      expect(screen.queryByText('Made Something Tasty?')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Share My Food!' })).toBeNull();
      expect(screen.getByText('Back to Explore')).toBeInTheDocument();
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
    });

    it('is left out on the smallest phones as well', async () => {
      withScreen({ width: 320, height: 568, touch: true });
      await mountVideos();
      expect(screen.queryByText('Made Something Tasty?')).toBeNull();
    });
  });

  describe('header', () => {
    it('keeps its computer sizes and scales on phones', async () => {
      withScreen(SCREENS.desktop);
      await mountVideos();
      const header = screen.getByText('Back to Explore').closest('.MuiPaper-root');
      expect(css(header).desktop.padding).toBe('24px');
      expect(isFluid(css(header).phone.padding)).toBe(true);

      const title = screen.getByText('Cooking');
      expect(css(title).desktop['font-size']).toBe('36px');
      expect(isFluid(css(title).phone['font-size'])).toBe(true);
      const description = screen.getByText("Let's cook something delicious!");
      expect(css(description).desktop['font-size']).toBe('20px');
      expect(isFluid(css(description).phone['font-size'])).toBe(true);

      const icon = title.previousElementSibling;
      expect(css(icon).desktop).toMatchObject({ width: '48px', height: '48px', 'svg|width': '48px' });
      expect(isFluid(css(icon).phone.width)).toBe(true);
      expect(isFluid(css(icon).phone['svg|width'])).toBe(true);
      expect(css(screen.getByText('Total Stars Earned')).desktop['font-size']).toBe('20px');
      expect(isFluid(css(screen.getByText('Total Stars Earned')).phone['font-size'])).toBe(true);
    });
  });

  describe('video cards', () => {
    const cardOf = (title) => screen.getByText(title).closest('.MuiPaper-root');

    it('keep their computer sizes: grow on hover, usual picture proportions, 20px text padding', async () => {
      withScreen(SCREENS.desktop);
      await mountVideos();
      const card = cardOf('Pancakes');
      expect(css(card).desktop['hover:transform']).toBe('scale(1.02)');
      expect(css(card.firstElementChild).desktop).toMatchObject({ height: 'auto', 'aspect-ratio': '4/3' });
      const text = screen.getByText('Pancakes').parentElement;
      expect(css(text).desktop.padding).toBe('20px');
      expect(css(screen.getByText('Pancakes')).desktop['font-size']).toBe('20px');
    });

    it('use the app\'s 192px picture on phones, with fluid text and no grow-on-hover', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountVideos();
      const card = cardOf('Pancakes');
      expect(css(card).phone['hover:transform']).toBe('none');
      expect(css(card.firstElementChild).phone).toMatchObject({ height: '192px', 'aspect-ratio': 'auto' });
      expect(isFluid(css(screen.getByText('Pancakes').parentElement).phone.padding)).toBe(true);
      expect(isFluid(css(screen.getByText('Pancakes')).phone['font-size'])).toBe(true);
    });
  });

  describe('footer', () => {
    it('keeps its computer sizes and scales on phones, stars included', async () => {
      withScreen(SCREENS.desktop);
      await mountVideos();
      const title = screen.getByText("You're a Master Chef!");
      const box = title.parentElement;
      expect(css(box).desktop.padding).toBe('32px');
      expect(css(title).desktop['font-size']).toBe('30px');
      expect(isFluid(css(box).phone.padding)).toBe(true);
      expect(isFluid(css(title).phone['font-size'])).toBe(true);

      const stars = box.firstElementChild;
      expect(css(stars).desktop).toMatchObject({ 'svg|width': '64px', 'svg:nth-of-type(2)|width': '80px' });
      expect(isFluid(css(stars).phone['svg|width'])).toBe(true);
      expect(isFluid(css(stars).phone['svg:nth-of-type(2)|width'])).toBe(true);
    });
  });

  describe('first-load placeholders', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('the video list placeholder has the same picture heights as the real cards', async () => {
      withScreen(SCREENS.desktop);
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      await mountVideos();
      await act(async () => { vi.advanceTimersByTime(400); });
      const frame = screen.getByRole('status', { name: 'Loading videos' });
      const cover = frame.firstElementChild.firstElementChild.firstElementChild; // grid > paper > cover
      expect(css(cover).desktop).toMatchObject({ height: 'auto', 'aspect-ratio': '4/3' });
      expect(css(cover).phone).toMatchObject({ height: '192px', 'aspect-ratio': 'auto' });
    });

    it('the replays row placeholder has the same picture heights as the real cards', async () => {
      withScreen(SCREENS.desktop);
      mockExplore.fetchContentByType.mockReturnValue(new Promise(() => {}));
      await mountExplore();
      await act(async () => { vi.advanceTimersByTime(400); });
      const frame = screen.getByRole('status', { name: 'Loading replays' });
      const cover = frame.children[1].firstElementChild.firstElementChild; // row > card > cover
      expect(css(cover).desktop).toMatchObject({ height: 'auto', 'aspect-ratio': '4/3' });
      expect(css(cover).phone).toMatchObject({ height: '160px', 'aspect-ratio': 'auto' });
    });
  });
});
