/**
 * Phone sizing for the Experience button (Explore) and the Experience list page.
 *
 * Two promises, checked on the style rules the pages really generate:
 *  1. Tablets and computers (600px and wider) always get the same fixed sizes.
 *  2. Phones get sizes that shrink smoothly to fit a small screen, the app's 180px cover, one card per row
 *     and no grow-on-hover.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../config/theme';
import uiReducer from '../../store/slices/uiSlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import api from '../../api/axios';
import ChildExplore from './ChildExplore';
import ChildExperiences from './ChildExperiences';
import ChildExperienceDetail from './ChildExperienceDetail';
import { readResponsiveCss } from '../../test/readResponsiveCss';
import { installMatchMedia, SCREENS } from '../../test/matchMediaStub';

vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
const mockExplore = { fetchExploreContent: vi.fn(), fetchContentByType: vi.fn(), getCoverImageUrl: (p) => p, getVideoFileUrl: (p) => p };
const mockWatch = { getVideoTypeProgress: vi.fn(), getTotalStarsForVideoType: vi.fn(), getExploreVideoWatchStatus: vi.fn() };
vi.mock('../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

const list = [
  { uuid: 'u1', title: 'Strawberry Banana Smoothie', description: 'Make a smoothie', coverImage: 'https://cdn.test/1.png', videoCount: 3 },
  { uuid: 'u2', title: 'Second one', description: '', coverImage: null, videoCount: 1 },
];

let screenStub;
beforeEach(() => {
  vi.clearAllMocks();
  mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });
  mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [] } });
  mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 0, viewedVideos: 0 });
  mockWatch.getTotalStarsForVideoType.mockResolvedValue(0);
  mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0 });
  api.get.mockResolvedValue({ data: { success: true, data: list } });
});
afterEach(() => {
  cleanup();
  screenStub?.restore();
  screenStub = null;
});

const withScreen = (size) => {
  screenStub = installMatchMedia(size);
};

const mount = async (ui, path) => {
  const view = render(
    <Provider store={configureStore({ reducer: { ui: uiReducer, childPageCache: childPageCacheReducer } })}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/child/:id/explore" element={ui} />
            <Route path="/child/:id/explore/experience" element={ui} />
            <Route path="/child/:id/explore/experience/:uuid" element={ui} />
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
const mountList = () => mount(<ChildExperiences childId="kid1" />, '/child/kid1/explore/experience');

describe('the Experience button on Explore', () => {
  it('keeps its computer sizes: 72px tall, 26px text, 28px sides, 24px below, a small grow on hover', async () => {
    withScreen(SCREENS.desktop);
    await mountExplore();
    const button = screen.getByRole('button', { name: 'Experience' });
    expect(css(button).desktop).toMatchObject({
      'min-height': '72px',
      'font-size': '26px',
      'padding-left': '28px',
      'padding-right': '28px',
      'margin-bottom': '24px',
      gap: '12px',
      'hover:transform': 'scale(1.01)',
    });
  });

  it('keeps the same sizes on a tablet', async () => {
    withScreen(SCREENS.tablet);
    await mountExplore();
    expect(css(screen.getByRole('button', { name: 'Experience' })).desktop['min-height']).toBe('72px');
  });

  it('is fluid on phones and does not grow on hover', async () => {
    withScreen(SCREENS.phoneUpright);
    await mountExplore();
    const phone = css(screen.getByRole('button', { name: 'Experience' })).phone;
    for (const property of ['min-height', 'font-size', 'padding-left', 'padding-right', 'margin-bottom', 'gap']) {
      expect(isFluid(phone[property]), property).toBe(true);
    }
    expect(phone['hover:transform']).toBe('none');
  });

  it('fits the smallest phones: never taller than 56px at the small end, never wider than the page', async () => {
    withScreen(SCREENS.phoneSmallUpright);
    await mountExplore();
    const phone = css(screen.getByRole('button', { name: 'Experience' })).phone;
    expect(phone['min-height']).toMatch(/^clamp\(56px,/);
    expect(phone['font-size']).toMatch(/^clamp\(20px,/);
  });

  it('is as wide as the page column (full width)', async () => {
    withScreen(SCREENS.desktop);
    await mountExplore();
    const button = screen.getByRole('button', { name: 'Experience' });
    expect(css(button).base.width).toBe('100%');
  });
});

describe('the Experience list page', () => {
  it('keeps its side space on computers and tablets and gives phones a little more', async () => {
    withScreen(SCREENS.desktop);
    const { container } = await mountList();
    const column = container.firstElementChild.firstElementChild;
    expect(css(column).desktop).toMatchObject({ 'padding-left': '24px', 'padding-right': '24px' });
    expect(isFluid(css(column).phone['padding-left'])).toBe(true);
    expect(css(column).base).toMatchObject({ 'max-width': '848px', gap: '20px' });
  });

  describe('header card', () => {
    it('keeps its computer sizes', async () => {
      withScreen(SCREENS.desktop);
      await mountList();
      const header = screen.getByRole('banner');
      expect(css(header).desktop.padding).toBe('24px');
      expect(css(screen.getByRole('heading', { level: 1 })).desktop['font-size']).toBe('30px');
      expect(css(screen.getByText('Fun things to watch, make and learn!')).desktop['font-size']).toBe('20px');
      expect(css(screen.getByRole('button', { name: /Back to Explore/ })).desktop['font-size']).toBe('20px');
    });

    it('is fluid on phones', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountList();
      expect(isFluid(css(screen.getByRole('banner')).phone.padding)).toBe(true);
      expect(isFluid(css(screen.getByRole('heading', { level: 1 })).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('Fun things to watch, make and learn!')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByRole('button', { name: /Back to Explore/ })).phone['font-size'])).toBe(true);
    });
  });

  describe('grid and cards', () => {
    it('are two across with 20px between on computers and tablets', async () => {
      withScreen(SCREENS.desktop);
      await mountList();
      const grid = screen.getByRole('region', { name: 'Experiences' });
      expect(css(grid).desktop).toMatchObject({ 'grid-template-columns': 'repeat(2, minmax(0, 1fr))', gap: '20px' });
    });

    it('are one per row on phones', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountList();
      const grid = screen.getByRole('region', { name: 'Experiences' });
      expect(css(grid).phone['grid-template-columns']).toBe('1fr');
      expect(isFluid(css(grid).phone.gap)).toBe(true);
    });

    it('keep their computer text sizes and the 4:3 cover', async () => {
      withScreen(SCREENS.desktop);
      await mountList();
      const card = screen.getByRole('article', { name: 'Strawberry Banana Smoothie' });
      expect(css(screen.getByRole('heading', { level: 2, name: 'Strawberry Banana Smoothie' })).desktop['font-size']).toBe('22px');
      expect(css(within(card).getByText('Make a smoothie')).desktop['font-size']).toBe('16px');
      expect(css(within(card).getByText('3 videos')).desktop['font-size']).toBe('14px');
      expect(css(within(card).getByText('3 videos').parentElement).desktop.padding).toBe('16px');
      expect(css(card.firstElementChild).desktop).toMatchObject({ height: 'auto', 'aspect-ratio': '4/3' });
    });

    it('shrink on phones and use the app\'s 180px cover', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountList();
      const card = screen.getByRole('article', { name: 'Strawberry Banana Smoothie' });
      expect(isFluid(css(screen.getByRole('heading', { level: 2, name: 'Strawberry Banana Smoothie' })).phone['font-size'])).toBe(true);
      expect(isFluid(css(within(card).getByText('Make a smoothie')).phone['font-size'])).toBe(true);
      expect(isFluid(css(within(card).getByText('3 videos')).phone['font-size'])).toBe(true);
      expect(isFluid(css(within(card).getByText('3 videos').parentElement).phone.padding)).toBe(true);
      expect(css(card.firstElementChild).phone).toMatchObject({ height: '180px', 'aspect-ratio': 'auto' });
    });

    it('clip a long title and description to two lines at every size', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountList();
      const card = screen.getByRole('article', { name: 'Strawberry Banana Smoothie' });
      expect(css(within(card).getByRole('heading', { level: 2 })).base).toMatchObject({ '-webkit-line-clamp': '2', overflow: 'hidden' });
      expect(css(within(card).getByText('Make a smoothie')).base).toMatchObject({ '-webkit-line-clamp': '2', overflow: 'hidden' });
    });

    it('never let a card grow wider than its column (long unbroken words wrap)', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountList();
      const card = screen.getByRole('article', { name: 'Strawberry Banana Smoothie' });
      expect(css(card).base['min-width']).toBe('0');
      expect(css(within(card).getByRole('heading', { level: 2 })).base['overflow-wrap']).toBe('anywhere');
    });
  });
});

describe('the experience detail page', () => {
  const detail = {
    uuid: 'u1',
    title: 'Strawberry Banana Smoothie',
    description: 'Make a smoothie',
    coverImage: null,
    videos: [
      { id: 'v1', title: 'Video one', embedUrl: 'https://iframe.mediadelivery.net/embed/1/a', position: 1 },
      { id: 'v2', title: 'Video two', embedUrl: 'https://iframe.mediadelivery.net/embed/1/b', position: 2 },
    ],
    printable: { image: 'https://cdn.test/p.png', kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print recipe here' },
  };
  const mountDetail = async () => {
    api.get.mockImplementation(async (url) => ({ data: { success: true, data: url === '/experiences' ? list : detail } }));
    return mount(<ChildExperienceDetail childId="kid1" />, '/child/kid1/explore/experience/u1');
  };
  const band = (name) => screen.getByRole('region', { name });

  describe('bands', () => {
    it('keep their computer sizes: 40px above and below and 24px at the sides on tablets, 56px and 32px from 900px', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const rules = css(band('Video one'));
      expect(rules.desktop).toMatchObject({ 'padding-top': '40px', 'padding-bottom': '40px', 'padding-left': '24px', 'padding-right': '24px' });
      expect(rules.wide).toMatchObject({ 'padding-top': '56px', 'padding-bottom': '56px', 'padding-left': '32px', 'padding-right': '32px' });
    });

    it('are fluid on phones, so the gutter and the height shrink on a small screen', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountDetail();
      const phone = css(band('Video one')).phone;
      for (const property of ['padding-top', 'padding-bottom', 'padding-left', 'padding-right']) {
        expect(isFluid(phone[property]), property).toBe(true);
      }
    });

    it('keep a 16px gutter at least on the smallest phones', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      expect(css(band('Title')).phone['padding-left']).toMatch(/^clamp\(16px,/);
    });

    it('the printable band is shorter than the others', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      expect(css(band('Printable')).desktop['padding-top']).toBe('20px');
      expect(css(band('Printable')).wide['padding-top']).toBe('28px');
    });

    it('put their content in a column that can shrink (long words wrap instead of widening the page)', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      expect(css(band('Title').firstElementChild).base).toMatchObject({ 'min-width': '0', width: '100%', 'max-width': '560px' });
    });
  });

  describe('back arrow', () => {
    it('is an arrow only, in the page (not fixed), on the left edge of the same column the videos use', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const back = screen.getByRole('button', { name: 'Back to Experiences' });
      expect(back).toHaveTextContent('');
      expect(css(back).base.position).not.toBe('fixed');
      const column = back.parentElement;
      const videoColumn = css(band('Video one').firstElementChild);
      expect(css(column).phone['max-width']).toBe(videoColumn.phone['max-width']);
      expect(css(column).desktop['max-width']).toBe(videoColumn.desktop['max-width']);
      expect(css(column).wide['max-width']).toBe(videoColumn.wide['max-width']);
      expect(css(column.parentElement).wide['padding-left']).toBe(css(band('Video one')).wide['padding-left']);
    });
  });

  describe('video column', () => {
    it('is the full width of the band on phones, 620px on tablets and 900px from 900px', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const column = css(band('Video one').firstElementChild);
      expect(column.phone['max-width']).toBe('100%');
      expect(column.desktop['max-width']).toBe('620px');
      expect(column.wide['max-width']).toBe('900px');
    });

    it('draws each video 16:9 and as wide as the column (no fixed width)', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      const frame = band('Video one').firstElementChild.firstElementChild;
      expect(css(frame).base.width).toBe('100%');
      expect(css(frame.firstElementChild).base['aspect-ratio']).toBe('16/9');
    });

    it('has a play button that is fluid on phones and 62px on tablets and computers', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountDetail();
      const circle = screen.getByRole('button', { name: 'Play Video one' }).firstElementChild;
      expect(isFluid(css(circle).phone.width)).toBe(true);
      expect(css(circle).desktop).toMatchObject({ width: '62px', height: '62px' });
    });

    it('clips a long video title to three lines', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      const title = within(screen.getByRole('button', { name: 'Play Video one' })).getByText('Video one');
      expect(css(title).base).toMatchObject({ '-webkit-line-clamp': '3', overflow: 'hidden', 'overflow-wrap': 'anywhere' });
    });
  });

  describe('text', () => {
    it('keeps its computer sizes: title 36px (44px from 900px), description 16px (18px), closing 28px (32px)', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const title = css(screen.getByRole('heading', { level: 1 }));
      expect(title.desktop['font-size']).toBe('36px');
      expect(title.wide['font-size']).toBe('44px');
      const description = css(screen.getByText('Make a smoothie'));
      expect(description.desktop['font-size']).toBe('16px');
      expect(description.wide['font-size']).toBe('18px');
      const closing = css(screen.getByRole('heading', { level: 2 }));
      expect(closing.desktop['font-size']).toBe('28px');
      expect(closing.wide['font-size']).toBe('32px');
    });

    it('is fluid on phones', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountDetail();
      expect(isFluid(css(screen.getByRole('heading', { level: 1 })).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('Make a smoothie')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByRole('heading', { level: 2 })).phone['font-size'])).toBe(true);
    });

    it('is never smaller than 26px for the title or 15px for the description on the smallest phones', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      expect(css(screen.getByRole('heading', { level: 1 })).phone['font-size']).toMatch(/^clamp\(26px,/);
      expect(css(screen.getByText('Make a smoothie')).phone['font-size']).toMatch(/^clamp\(15px,/);
    });

    it('wraps long words at every size', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      expect(css(screen.getByRole('heading', { level: 1 })).base['overflow-wrap']).toBe('anywhere');
      expect(css(screen.getByText('Make a smoothie')).base['overflow-wrap']).toBe('anywhere');
    });
  });

  describe('buttons', () => {
    it('are never shorter than a thumb (44px) and never wider than the page', async () => {
      withScreen(SCREENS.phoneSmallUpright);
      await mountDetail();
      const print = within(band('Printable')).getByRole('link', { name: 'Print recipe here' });
      const home = within(band('Closing message')).getByRole('button', { name: /Back to home/i });
      for (const button of [print, home]) {
        expect(css(button).base).toMatchObject({ 'min-height': '44px', 'max-width': '100%', 'overflow-wrap': 'anywhere' });
      }
    });

    it('keep their computer sizes: 13.5px text, 13px above and below, 28px at the sides, a small lift on hover', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const button = within(band('Printable')).getByRole('link', { name: 'Print recipe here' });
      expect(css(button).desktop).toMatchObject({
        'font-size': '13.5px',
        'padding-top': '13px',
        'padding-bottom': '13px',
        'padding-left': '28px',
        'padding-right': '28px',
        'hover:transform': 'translateY(-2px)',
      });
    });

    it('are fluid on phones and do not lift on hover', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountDetail();
      const phone = css(within(band('Printable')).getByRole('link', { name: 'Print recipe here' })).phone;
      expect(isFluid(phone['font-size'])).toBe(true);
      expect(isFluid(phone['padding-left'])).toBe(true);
      expect(phone['hover:transform']).toBe('none');
    });
  });

  describe('printable picture', () => {
    it('is 60% of the band (at most 220px and 320px tall) on phones and a little bigger from tablets up', async () => {
      withScreen(SCREENS.desktop);
      await mountDetail();
      const picture = css(within(band('Printable')).getByRole('img'));
      expect(picture.phone).toMatchObject({ width: '60%', 'max-width': '220px', 'max-height': '320px' });
      expect(picture.desktop).toMatchObject({ width: '50%', 'max-width': '260px' });
      expect(picture.wide).toMatchObject({ 'max-width': '300px', 'max-height': '420px' });
    });

    it('is never stretched or cropped, whatever its shape', async () => {
      withScreen(SCREENS.phoneUpright);
      await mountDetail();
      expect(css(within(band('Printable')).getByRole('img')).base['object-fit']).toBe('contain');
    });
  });

  describe('list cards (now links)', () => {
    it('do not lift on hover on phones, and lift a little on tablets and computers', async () => {
      withScreen(SCREENS.desktop);
      await mountList();
      const card = screen.getByRole('article', { name: 'Strawberry Banana Smoothie' });
      expect(css(card).phone['hover:transform']).toBe('none');
      expect(css(card).desktop['hover:transform']).toBe('translateY(-2px)');
    });
  });
});
