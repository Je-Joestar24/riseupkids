/**
 * Phone sizing for the course page inside My Journey: cover, breadcrumbs, progress card, the four content
 * sections (library, videos, chants, audio), printables, footer and the first-load placeholder.
 *
 * Two promises, checked on the style rules the page really generates:
 *  1. Tablets and computers (600px and wider) get exactly the sizes they always had.
 *  2. Phones get their own: the side margin of the app, three stat cards in a row, two cards per row in every
 *     section, readable section titles, circles that shrink to fit, and text that scales with the screen.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer from '../../store/slices/childJourneySlice';
import childModuleReducer, { moduleKey, moduleReceived } from '../../store/slices/childModuleSlice';
import uiReducer from '../../store/slices/uiSlice';
import cmsBookPlayerReducer from '../../store/slices/cmsBookPlayerSlice';
import courseProgressService from '../../services/courseProgressService';
import bookReadingService from '../../services/bookReadingService';
import ChildJourneyModule from './ChildJourneyModule';
import { themeColors } from '../../config/themeColors';
import { readResponsiveCss } from '../../test/readResponsiveCss';

vi.mock('../../services/courseProgressService', () => ({
  default: { getChildCourses: vi.fn(), getCourseDetailsForChild: vi.fn() },
}));
vi.mock('../../services/videoWatchService', () => ({
  default: { getChildVideoWatches: vi.fn(async () => ({ success: true, data: [] })) },
}));
vi.mock('../../services/bookReadingService', () => ({
  default: { getChildBookReadings: vi.fn(async () => ({ success: true, data: [] })) },
}));
// Heavy pop-ups that are not under test
vi.mock('../../components/child/common/ScormPlayer', () => ({ default: () => null }));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));
vi.mock('../../components/child/module/AudioAssignmentRecordingModal', () => ({ default: () => null }));
vi.mock('../../components/child/module/ChantRecordingModal', () => ({ default: () => null }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

const content = (type, title, extra = {}) => ({
  _id: `${type}-${title}`,
  _contentId: `${type}-${title}`,
  _contentType: type,
  title,
  coverImage: `https://cdn.test/${title}.png`,
  ...extra,
});

const details = (extra = {}) => ({
  accessible: true,
  course: {
    _id: 'course1',
    title: 'Introduction',
    description: 'Children create their own stories.',
    coverImage: 'https://cdn.test/cover.png',
    contents: [
      content('book', 'My Things', { estimatedReadingTime: 4, totalStarsAwarded: 50 }),
      content('video', 'Video One', { duration: 240, starsAwarded: 15 }),
      content('chant', 'Test Chant', { description: 'A short chant', starsAwarded: 17 }),
      content('audioAssignment', 'Say your name', { estimatedDuration: 2, starsAwarded: 20 }),
    ],
  },
  progress: null,
  progressSummary: { completedCount: 3, totalCount: 8, todoCount: 4, lockedCount: 1 },
  ...extra,
});

let childCounter = 0;
const mountModule = async ({ seeded = true } = {}) => {
  childCounter += 1;
  const childId = `phone-module-${childCounter}`;
  const data = details();
  courseProgressService.getCourseDetailsForChild.mockImplementation(() =>
    seeded ? Promise.resolve({ success: true, data }) : new Promise(() => {})
  );
  courseProgressService.getChildCourses.mockResolvedValue({
    success: true,
    data: [{ course: { _id: 'course1', title: 'Introduction' }, status: 'in_progress', accessible: true }],
  });
  const store = configureStore({
    reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer, cmsBookPlayer: cmsBookPlayerReducer },
  });
  if (seeded) store.dispatch(moduleReceived({ key: moduleKey(childId, 'course1'), details: data, at: Date.now() }));
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/journey/course1`]}>
        <Routes>
          <Route path="/child/:id/journey/:courseId" element={<ChildJourneyModule childId={childId} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  await act(async () => {});
  return view;
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('course page layout', () => {
  it('keeps its computer spacing and gives phones the side margin of the app', async () => {
    const { container } = await mountModule();
    const page = container.firstElementChild;
    const inner = page.firstElementChild;
    expect(css(page).desktop['padding-top']).toBe('20px');
    expect(css(page).phone['padding-top']).toBe('0px');
    expect(css(inner).desktop.padding).toBe('0px');
    expect(isFluid(css(inner).phone.padding)).toBe(true);

    const content = inner.children[1]; // everything under the cover
    expect(css(content).desktop).toMatchObject({ 'padding-left': '32px', 'padding-right': '32px' });
    expect(css(content).phone).toMatchObject({ 'padding-left': '0px', 'padding-right': '0px' });
  });

  describe('cover', () => {
    it('keeps the 48px back button on computers and uses a 40px one on phones', async () => {
      await mountModule();
      const back = screen.getByRole('button', { name: 'Go back to journey' });
      expect(css(back).desktop).toMatchObject({ width: '48px', height: '48px', padding: '12px', 'hover:transform': 'scale(1.05)' });
      expect(css(back).phone).toMatchObject({ width: '40px', height: '40px', padding: '8px', 'hover:transform': 'none' });
    });
  });

  describe('breadcrumbs', () => {
    it('keep their computer padding, and shrink it on small phones so both fit on one line', async () => {
      await mountModule();
      const button = screen.getByRole('button', { name: /My Journey/ });
      expect(css(button).desktop.padding).toBe('8px 16px');
      expect(css(button).phone.padding).toMatch(/^8px clamp\(8px/);
    });
  });

  describe('progress card', () => {
    it('keeps its computer sizes, with the three stat cards in a row', async () => {
      await mountModule();
      const title = screen.getByText('Introduction');
      const card = title.parentElement;
      expect(css(card).desktop.padding).toBe('32px');
      expect(css(title).desktop['font-size']).toBe('36px');
      expect(css(screen.getByText('Children create their own stories.')).desktop['font-size']).toBe('20px');

      const label = screen.getByText('Completed');
      const stat = label.parentElement;
      const grid = stat.parentElement;
      expect(css(grid).desktop).toMatchObject({ 'grid-template-columns': 'repeat(3, 1fr)', gap: '16px' });
      expect(css(stat).desktop.padding).toBe('16px');
      expect(css(stat.firstElementChild).desktop).toMatchObject({ width: '48px', height: '48px' });
      expect(css(label).desktop['font-size']).toBe('14px');
      expect(css(label.previousElementSibling).desktop['font-size']).toBe('24px');
    });

    it('puts the three stat cards side by side on phones (one per row before) and scales their text', async () => {
      await mountModule();
      const title = screen.getByText('Introduction');
      expect(isFluid(css(title.parentElement).phone.padding)).toBe(true);
      expect(isFluid(css(title).phone['font-size'])).toBe(true);
      expect(css(title).phone['overflow-wrap']).toBe('anywhere');

      const label = screen.getByText('To Do');
      const stat = label.parentElement;
      const grid = stat.parentElement;
      expect(css(grid).phone['grid-template-columns']).toBe('repeat(3, minmax(0, 1fr))');
      expect(isFluid(css(grid).phone.gap)).toBe(true);
      expect(isFluid(css(stat).phone.padding.split(' ')[0])).toBe(true);
      expect(isFluid(css(stat.firstElementChild).phone.width)).toBe(true);
      expect(isFluid(css(label).phone['font-size'])).toBe(true);
    });
  });

  describe('content sections', () => {
    const titles = ['Library', 'Videos', 'Chants', 'Audio Assignment'];

    it.each(titles)('%s: keeps its white title and column layout on computers and tablets', async (name) => {
      await mountModule();
      const title = screen.getByText(name);
      expect(css(title).desktop.color).toBe(themeColors.textInverse);
      const grid = title.nextElementSibling;
      expect(css(grid).desktop).toMatchObject({ gap: '24px', 'grid-template-columns': 'repeat(2, 1fr)' });
    });

    it.each(titles)('%s: has a readable dark title and two cards per row on phones', async (name) => {
      await mountModule();
      const title = screen.getByText(name);
      expect(css(title).phone.color).toBe(themeColors.text);
      const grid = title.nextElementSibling;
      expect(css(grid).phone).toMatchObject({ 'grid-template-columns': 'repeat(2, minmax(0, 1fr))', gap: '16px 4%' });
    });

    it('Printables: the heading is readable on phones and stays white on computers', async () => {
      await mountModule();
      const heading = screen.getByRole('heading', { name: 'Printables' });
      expect(css(heading).desktop.color).toBe(themeColors.textInverse);
      expect(css(heading).phone.color).toBe(themeColors.text);
    });
  });

  describe('cards', () => {
    const rootOf = (alt) => screen.getByAltText(alt).parentElement.parentElement;
    // the audio cards' pictures appear after a short stagger, so they are found by their title instead
    const audioRoot = () => screen.getByText('Say your name').parentElement.parentElement;

    it.each([
      ['book', 'My Things'],
      ['video', 'Video One'],
    ])('a %s card: the five circles keep their 32px on computers and shrink to fit on phones', async (_kind, alt) => {
      await mountModule();
      const root = rootOf(alt);
      expect(css(root).desktop['hover:transform']).toBe('scale(1.05)');
      expect(css(root).phone['hover:transform']).toBe('none');

      const row = root.lastElementChild;
      expect(css(row).desktop).toMatchObject({ gap: '8px', padding: '16px' });
      expect(isFluid(css(row).phone.gap)).toBe(true);
      expect(isFluid(css(row).phone.padding)).toBe(true);

      const circle = row.firstElementChild;
      expect(css(circle).desktop).toMatchObject({ width: '32px', height: '32px', flex: '0 1 auto', 'min-width': 'auto', 'aspect-ratio': 'auto' });
      expect(css(circle).phone).toMatchObject({ width: 'auto', height: 'auto', flex: '0 1 32px', 'min-width': '0', 'aspect-ratio': '1/1' });
    });

    it('a filled circle keeps its 40px check mark on computers and fills the circle on phones', async () => {
      bookReadingService.getChildBookReadings.mockResolvedValueOnce({
        success: true,
        data: [{ bookId: 'book-My Things', currentReadingCount: 3, requiredReadingCount: 5 }],
      });
      await mountModule();
      const row = rootOf('My Things').lastElementChild;
      const mark = row.firstElementChild.querySelector('svg');
      expect(mark).not.toBeNull();
      expect(css(mark).desktop).toMatchObject({ width: '40px', height: '40px' });
      expect(css(mark).phone).toMatchObject({ width: '100%', height: '100%' });
      // three filled, two empty
      expect([...row.children].map((circle) => Boolean(circle.querySelector('svg')))).toEqual([true, true, true, false, false]);
    });

    it.each([
      ['chant', 'Test Chant'],
      ['audio assignment', 'Say your name'],
    ])('a %s card: keeps its 20px text padding on computers, less on phones, and no grow-on-hover on phones', async (kind, alt) => {
      await mountModule();
      const root = kind === 'chant' ? rootOf(alt) : audioRoot();
      expect(css(root).desktop['hover:transform']).toBe('scale(1.05)');
      expect(css(root).phone['hover:transform']).toBe('none');
      const text = root.lastElementChild;
      expect(css(text).desktop.padding).toBe('20px');
      expect(isFluid(css(text).phone.padding)).toBe(true);
    });

    it('an audio card lets its footer wrap on phones (the star badge drops under the label)', async () => {
      await mountModule();
      const footer = audioRoot().lastElementChild.lastElementChild;
      expect(css(footer).desktop).toMatchObject({ 'flex-wrap': 'nowrap', gap: 'normal' });
      expect(css(footer).phone).toMatchObject({ 'flex-wrap': 'wrap', gap: '8px' });
    });
  });

  describe('footer', () => {
    it('keeps its computer sizes and scales on phones', async () => {
      await mountModule();
      const title = screen.getByText("You're doing great!");
      const box = title.parentElement;
      expect(css(box).desktop.padding).toBe('32px');
      expect(css(title).desktop['font-size']).toBe('24px');
      expect(isFluid(css(box).phone.padding)).toBe(true);
      expect(isFluid(css(title).phone['font-size'])).toBe(true);
    });
  });

  describe('first-load placeholder', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('has the same side space and two-per-row cards as the real page', async () => {
      await mountModule({ seeded: false });
      await act(async () => { vi.advanceTimersByTime(300); });
      const frame = screen.getByRole('status', { name: 'Loading the course' });
      const content = frame.children[1];
      expect(css(content).desktop).toMatchObject({ 'padding-left': '32px', 'padding-right': '32px' });
      expect(css(content).phone).toMatchObject({ 'padding-left': '0px', 'padding-right': '0px' });

      const grid = content.children[1].lastElementChild;
      expect(css(grid).desktop).toMatchObject({ gap: '24px', 'grid-template-columns': 'repeat(2, 1fr)' });
      expect(css(grid).phone).toMatchObject({ 'grid-template-columns': 'repeat(2, minmax(0, 1fr))', gap: '16px 4%' });
    });
  });
});
