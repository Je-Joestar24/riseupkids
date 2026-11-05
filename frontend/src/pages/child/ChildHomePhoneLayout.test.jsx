/**
 * Phone sizing for the child Home page and the top bar / bottom tabs around it.
 *
 * Two promises, checked on the style rules the page really generates:
 *  1. Tablets and computers (600px and wider) get exactly the sizes they always had.
 *  2. Phones get their own, fluid sizes (they shrink with the screen, down to a safe minimum).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer from '../../store/slices/childJourneySlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import childrenService from '../../services/childrenService';
import meetingService from '../../services/meetingService';
import youtubeService from '../../services/youtubeService';
import ChildHome from './ChildHome';
import ChildHeader from '../../components/common/ChilHeader';
import ChildNavigation from '../../components/common/ChildNavigation';
import { readResponsiveCss } from '../../test/readResponsiveCss';
import { installMatchMedia, SCREENS } from '../../test/matchMediaStub';

vi.mock('../../services/childrenService', () => ({ default: { getChildById: vi.fn() } }));
vi.mock('../../services/meetingService', () => ({
  default: { getUpcomingMeetings: vi.fn(), getGuestModeLink: vi.fn() },
}));
vi.mock('../../services/youtubeService', () => ({ default: { getActiveLive: vi.fn() } }));
vi.mock('../../services/courseProgressService', () => ({ default: { getChildCourses: vi.fn(async () => ({ success: true, data: [] })) } }));
vi.mock('../../hooks/youtubeHook', () => ({ default: () => ({ endLive: vi.fn(), actionLoading: false }) }));

const child = { _id: 'kid1', displayName: 'Mario', stats: { currentStreak: 2, totalStars: 200, totalBadges: 6 } };
const meeting = { _id: 'm1', title: 'Story time', startTime: '2026-11-06T10:00:00Z', meetLink: 'https://meet.example/x', createdBy: { name: 'Anna', role: 'teacher' } };

const storeWith = (profiles = [child]) =>
  configureStore({
    reducer: {
      user: (state = { childProfiles: profiles }) => state,
      childJourney: childJourneyReducer,
      childPageCache: childPageCacheReducer,
    },
  });

const inApp = (ui) => (
  <Provider store={storeWith()}>
    <MemoryRouter initialEntries={['/child/kid1/home']}>{ui}</MemoryRouter>
  </Provider>
);

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

beforeEach(() => {
  childrenService.getChildById.mockResolvedValue({ data: child });
  meetingService.getUpcomingMeetings.mockResolvedValue({ success: true, data: [meeting] });
  youtubeService.getActiveLive.mockResolvedValue({ success: true, data: null });
});
afterEach(() => cleanup());

const mountHome = async () => {
  const view = render(inApp(<ChildHome childId="kid1" />));
  await act(async () => {});
  await screen.findByText('Hi, Mario!');
  return view;
};

describe('Home page', () => {
  it('the page keeps no side margin on tablets and computers, and gets a fluid one on phones', async () => {
    const { container } = await mountHome();
    const page = container.firstElementChild;
    const rules = css(page);
    expect(rules.desktop['padding-left']).toMatch(/^0(px)?$/);
    expect(rules.desktop['padding-right']).toMatch(/^0(px)?$/);
    expect(isFluid(rules.phone['padding-left'])).toBe(true);
    expect(isFluid(rules.phone['padding-right'])).toBe(true);
    expect(rules.base['padding-top']).toBe('20px'); // unchanged for everyone
  });

  describe('welcome card', () => {
    it('keeps its computer sizes', async () => {
      const { container } = await mountHome();
      const card = container.querySelector('[aria-busy]');
      expect(css(card).desktop.padding).toBe('32px');

      const avatar = screen.getByAltText('Child Avatar').parentElement;
      expect(css(avatar).desktop).toMatchObject({ width: '128px', height: '128px', padding: '20px' });

      expect(css(screen.getByText('Hi, Mario!')).desktop['font-size']).toBe('36px');
      expect(css(screen.getByText('Ready to learn something awesome?')).desktop['font-size']).toBe('20px');

      const button = screen.getByRole('button', { name: /Start Learning/ });
      expect(css(button).desktop).toMatchObject({
        padding: '24px 32px',
        'font-size': '24px',
        gap: '12px',
        'white-space': 'normal',
        'hover:transform': 'scale(1.05)',
      });
      expect(css(button.querySelector('svg')).desktop['font-size']).toBe('40px');
    });

    it('is fluid on phones, with no grow-on-hover that would stick under a finger', async () => {
      const { container } = await mountHome();
      const card = container.querySelector('[aria-busy]');
      expect(isFluid(css(card).phone.padding)).toBe(true);
      expect(isFluid(css(screen.getByAltText('Child Avatar').parentElement).phone.width)).toBe(true);
      expect(isFluid(css(screen.getByText('Hi, Mario!')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('Ready to learn something awesome?')).phone['font-size'])).toBe(true);

      const button = screen.getByRole('button', { name: /Start Learning/ });
      const phone = css(button).phone;
      expect(phone['white-space']).toBe('nowrap');
      expect(phone['hover:transform']).toBe('none');
      expect(isFluid(phone['font-size'])).toBe(true);
    });

    it('lets a long name wrap inside the card on phones', async () => {
      const { container } = await mountHome();
      const textColumn = screen.getByText('Hi, Mario!').parentElement;
      expect(css(textColumn).phone).toMatchObject({ flex: '1 1 0', 'min-width': '0' });
      expect(css(textColumn).desktop).toMatchObject({ flex: '0 1 auto', 'min-width': 'auto' });
      expect(container).toBeTruthy();
    });
  });

  describe('stat cards', () => {
    const awards = async () => {
      const { container } = await mountHome();
      const grids = container.querySelectorAll('[aria-busy]');
      return grids[grids.length - 1]; // the welcome card is first, the stats last
    };

    it('keep their computer sizes', async () => {
      const grid = await awards();
      expect(css(grid).desktop).toMatchObject({ gap: '10px', 'grid-template-columns': 'repeat(3, 1fr)' });
      [...grid.children].forEach((card) => {
        expect(css(card).desktop.padding).toBe('16px');
        const [iconBox, count, label] = card.children;
        expect(css(iconBox).desktop).toMatchObject({ width: '48px', height: '48px', 'margin-bottom': '8px' });
        expect(css(count).desktop['font-size']).toBe('30px');
        expect(css(label).desktop['font-size']).toBe('14px');
      });
    });

    it('share the width evenly on phones and shrink their text', async () => {
      const grid = await awards();
      expect(css(grid).phone['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
      expect(isFluid(css(grid).phone.gap)).toBe(true);
      [...grid.children].forEach((card) => {
        const [iconBox, count, label] = card.children;
        expect(isFluid(css(iconBox).phone.width)).toBe(true);
        expect(isFluid(css(count).phone['font-size'])).toBe(true);
        expect(isFluid(css(label).phone['font-size'])).toBe(true);
      });
    });
  });

  describe('live class card', () => {
    it('keeps its computer sizes and shrinks its padding and Join button on phones', async () => {
      await mountHome();
      const join = await screen.findByRole('button', { name: /Join Class/ });
      expect(css(join).desktop).toMatchObject({ padding: '20px 32px', 'font-size': '24px', 'hover:transform': 'scale(1.02)' });
      expect(isFluid(css(join).phone['font-size'])).toBe(true);
      expect(css(join).phone['hover:transform']).toBe('none');

      const card = join.parentElement;
      expect(css(card).desktop.padding).toBe('24px');
      expect(isFluid(css(card).phone.padding)).toBe(true);
    });
  });
});

describe('Top bar', () => {
  const mountHeader = () => render(inApp(<ChildHeader childId="kid1" />));

  it('keeps its computer sizes', () => {
    mountHeader();
    const bar = screen.getByRole('banner');
    expect(css(bar).desktop['min-height']).toBe('140px');
    expect(css(bar.firstElementChild).desktop['min-height']).toBe('64px'); // the toolbar's own rule, as it always was
    expect(css(screen.getByAltText('Rise Up Kids Logo')).desktop.height).toBe('110px');

    const points = screen.getByRole('button', { name: 'Points' });
    expect(css(points).desktop).toMatchObject({
      padding: '16px 32px',
      'font-size': '1.5rem',
      'hover:transform': 'scale(1.05)',
    });
    expect(css(screen.getByText('200')).desktop['font-size']).toBe('24px');
    expect(css(screen.getByRole('button', { name: 'Sync' })).desktop.display).toBe('inline-flex');
  });

  it('is the app\'s 100px bar on phones, with fluid logo and stars, and no invisible Sync button taking room', () => {
    mountHeader();
    const bar = screen.getByRole('banner');
    expect(css(bar).phone['min-height']).toBe('100px');
    expect(css(bar.firstElementChild).phone['min-height']).toBe('100px');
    expect(isFluid(css(screen.getByAltText('Rise Up Kids Logo')).phone.height)).toBe(true);

    const points = screen.getByRole('button', { name: 'Points' });
    expect(isFluid(css(points).phone.padding.split(' ')[0])).toBe(true);
    expect(css(points).phone['hover:transform']).toBe('none');
    expect(isFluid(css(screen.getByText('200')).phone['font-size'])).toBe(true);
    expect(css(screen.getByRole('button', { name: 'Sync' })).phone.display).toBe('none');
  });
});

describe('Bottom tabs', () => {
  let screenStub;
  afterEach(() => screenStub?.restore());

  it('keep their computer sizes: 36px icons and 14px labels', () => {
    screenStub = installMatchMedia(SCREENS.desktop);
    const { container } = render(inApp(<ChildNavigation childId="kid1" />));
    const styleText = container.querySelector('style').textContent;
    expect(styleText).toContain('width: 36px !important');
    expect(styleText).not.toContain('clamp(');

    const label = screen.getByText('My Journey');
    expect(css(label).desktop['font-size']).toBe('14px');
    expect(css(label).phone['font-size']).toMatch(/^clamp\(11px/);
  });

  it('shrink their icons a little on very small phones', () => {
    screenStub = installMatchMedia(SCREENS.phoneSmallUpright);
    const { container } = render(inApp(<ChildNavigation childId="kid1" />));
    const styleText = container.querySelector('style').textContent;
    expect(styleText).toMatch(/width: clamp\(28px, [\d.]+vw, 37px\) !important/);
    expect(styleText).not.toContain('width: 36px');
  });
});
