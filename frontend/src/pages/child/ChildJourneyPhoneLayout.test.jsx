/**
 * Phone sizing for My Journey (title, cards, placeholder cards and the progress summary).
 *
 * Two promises, checked on the style rules the page really generates:
 *  1. Tablets and computers (600px and wider) get exactly the sizes they always had.
 *  2. Phones get their own sizes: one card per row at 85% of the width like the app, fluid text and spacing,
 *     and a summary that fits a small screen.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childJourneyReducer from '../../store/slices/childJourneySlice';
import childModuleReducer from '../../store/slices/childModuleSlice';
import uiReducer from '../../store/slices/uiSlice';
import courseProgressService from '../../services/courseProgressService';
import ChildJourney from './ChildJourney';
import { readResponsiveCss } from '../../test/readResponsiveCss';

vi.mock('../../services/courseProgressService', () => ({
  default: { getChildCourses: vi.fn(), getCourseDetailsForChild: vi.fn() },
}));
vi.mock('../../services/videoWatchService', () => ({ default: {} }));
vi.mock('../../services/bookReadingService', () => ({ default: {} }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

const item = (id, title, status, extra = {}) => ({
  course: { _id: id, title, description: `About ${title}` },
  status,
  accessible: status !== 'locked',
  missingPrerequisites: [],
  ...extra,
});
const courses = [item('c1', 'Course A', 'completed'), item('c2', 'Course B', 'in_progress'), item('c3', 'Course C', 'locked')];

let childCounter = 0;
const mountJourney = async (data = courses) => {
  childCounter += 1;
  const childId = `phone-kid-${childCounter}`;
  courseProgressService.getChildCourses.mockResolvedValue({ success: true, data });
  const store = configureStore({
    reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer },
  });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/journey`]}>
        <Routes>
          <Route path="/child/:id/journey" element={<ChildJourney childId={childId} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  await act(async () => {});
  return view;
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('My Journey page', () => {
  it('keeps its computer spacing and gives phones a fluid margin and a short top gap', async () => {
    const { container } = await mountJourney();
    const page = container.firstElementChild;
    const inner = page.firstElementChild;
    expect(css(page).desktop['padding-top']).toBe('40px');
    expect(css(page).phone['padding-top']).toBe('4px');
    expect(css(inner).desktop.padding).toBe('32px');
    expect(isFluid(css(inner).phone.padding)).toBe(true);
  });

  describe('title', () => {
    it('keeps its computer sizes', async () => {
      await mountJourney();
      const title = screen.getByText('My Journey');
      expect(css(title).desktop).toMatchObject({ 'font-size': '36px', 'line-height': '1.6', 'margin-bottom': '8px' });
      expect(css(screen.getByText(/Step \d+ of \d+/)).desktop['font-size']).toBe('20px');
      expect(css(title.parentElement).desktop['margin-bottom']).toBe('32px');
    });

    it('is smaller, tighter and fluid on phones', async () => {
      await mountJourney();
      const title = screen.getByText('My Journey');
      const phone = css(title).phone;
      expect(isFluid(phone['font-size'])).toBe(true);
      expect(phone['line-height']).toBe('1.15');
      expect(isFluid(phone['margin-bottom'])).toBe(true);
      expect(isFluid(css(screen.getByText(/Step \d+ of \d+/)).phone['font-size'])).toBe(true);
      expect(isFluid(css(title.parentElement).phone['margin-bottom'])).toBe(true);
    });
  });

  describe('cards', () => {
    const cardOf = (text) => screen.getByText(text).closest('.MuiCard-root');

    it('keep their computer sizes (full grid cell, no centring margin, grow on hover)', async () => {
      await mountJourney();
      const card = cardOf('Course B');
      const desktop = css(card).desktop;
      expect(desktop).toMatchObject({ width: 'auto', 'margin-left': '0px', 'margin-right': '0px', 'hover:transform': 'scale(1.05)' });

      const content = card.children[1];
      expect(css(content).desktop).toMatchObject({ padding: '16px', gap: '12px' });
      const iconCircle = content.firstElementChild.firstElementChild;
      expect(css(iconCircle).desktop).toMatchObject({ width: '48px', height: '48px' });
      expect(css(screen.getByText('Course B')).desktop['font-size']).toBe('16px');
    });

    it('a locked card still does not grow on hover on computers', async () => {
      await mountJourney();
      expect(css(cardOf('Locked Step')).desktop['hover:transform']).toBe('none');
      expect(css(screen.getByAltText('Locked journey step')).desktop).toMatchObject({ width: '92px', height: '92px' });
    });

    it('are one per row, 85% wide and centred on phones, with no grow-on-hover that would stick', async () => {
      await mountJourney();
      const card = cardOf('Course B');
      const phone = css(card).phone;
      expect(phone).toMatchObject({ width: '85%', 'margin-left': 'auto', 'margin-right': 'auto', 'hover:transform': 'none' });

      const content = card.children[1];
      expect(isFluid(css(content).phone.padding)).toBe(true);
      expect(isFluid(css(content).phone.gap)).toBe(true);
      expect(isFluid(css(content.firstElementChild.firstElementChild).phone.width)).toBe(true);
      expect(isFluid(css(screen.getByText('Course B')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByAltText('Locked journey step')).phone.width)).toBe(true);
    });
  });

  describe('first-load placeholder cards', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const skeletonCard = async () => {
      childCounter += 1;
      const childId = `phone-kid-${childCounter}`;
      courseProgressService.getChildCourses.mockReturnValue(new Promise(() => {})); // never answers
      const store = configureStore({
        reducer: { childJourney: childJourneyReducer, childModule: childModuleReducer, ui: uiReducer },
      });
      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={[`/child/${childId}/journey`]}>
            <Routes>
              <Route path="/child/:id/journey" element={<ChildJourney childId={childId} />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );
      await act(async () => {});
      await act(async () => { vi.advanceTimersByTime(300); }); // the placeholder appears after a short delay
      const frame = screen.getByRole('status', { name: 'Loading your journey' });
      return frame.firstElementChild.firstElementChild; // the first placeholder card
    };

    it('have the same shape as the real cards, on every screen', async () => {
      const card = await skeletonCard();
      expect(css(card).desktop).toMatchObject({ width: 'auto', 'margin-left': '0px', 'margin-right': '0px' });
      expect(css(card).phone).toMatchObject({ width: '85%', 'margin-left': 'auto', 'margin-right': 'auto' });
      expect(css(card.lastElementChild).desktop.padding).toBe('16px');
      expect(isFluid(css(card.lastElementChild).phone.padding)).toBe(true);
    });
  });

  describe('progress summary', () => {
    it('keeps its computer sizes, including the 400px list', async () => {
      await mountJourney();
      const title = screen.getByText('Progress Summary');
      const box = title.parentElement;
      expect(css(box).desktop).toMatchObject({ width: 'auto', padding: '24px', 'margin-top': '48px' });
      expect(css(title).desktop).toMatchObject({ 'font-size': '24px', 'margin-bottom': '5px' });

      const list = title.nextElementSibling;
      expect(css(list).desktop).toMatchObject({ width: '400px', gap: '16px' });
      expect(css(list.firstElementChild.children[1]).desktop['font-size']).toBe('24px');
    });

    it('fits a small phone: as wide as the page, not 400px, and smaller spacing and numbers', async () => {
      await mountJourney();
      const title = screen.getByText('Progress Summary');
      const box = title.parentElement;
      expect(css(box).phone.width).toBe('100%');
      expect(isFluid(css(box).phone.padding)).toBe(true);
      expect(isFluid(css(box).phone['margin-top'])).toBe(true);
      expect(isFluid(css(title).phone['font-size'])).toBe(true);

      const list = title.nextElementSibling;
      expect(css(list).phone.width).toBe('100%');
      expect(isFluid(css(list).phone.gap)).toBe(true);
      expect(isFluid(css(list.firstElementChild.children[1]).phone['font-size'])).toBe(true);
    });
  });
});
