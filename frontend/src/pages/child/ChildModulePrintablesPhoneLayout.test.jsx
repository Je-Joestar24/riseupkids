/**
 * Phone layout for the Printables page: on a phone each printable is a stacked card (picture on top, then the
 * words, then a full-width Download button); on tablets and computers (600px and wider) it keeps the row it
 * always had. Checked on the style rules the page really generates.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import programMaterilialsService from '../../services/programMaterilialsService';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import ChildModulePrintables from './ChildModulePrintables';
import { readResponsiveCss } from '../../test/readResponsiveCss';

vi.mock('../../services/programMaterilialsService', () => ({ default: { getByChildId: vi.fn() } }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');

const printable = (n, extra = {}) => ({
  id: `p${n}`,
  pageNumber: n,
  title: `Colouring ${n}`,
  description: `Colour page ${n}`,
  coverImage: `https://cdn.example/p${n}.png`,
  fileUrl: `https://cdn.example/p${n}.pdf`,
  ...extra,
});

let kid = 0;
const mount = async ({ never = false } = {}) => {
  kid += 1;
  programMaterilialsService.getByChildId.mockImplementation(() =>
    never
      ? new Promise(() => {})
      : Promise.resolve({
          modules: [{ id: 'c1', stepNumber: 1, printables: [printable(1), printable(2, { coverImage: null, fileUrl: null })] }],
        })
  );
  const store = configureStore({ reducer: { childPageCache: childPageCacheReducer } });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/phone-kid-${kid}/journey/c1/printables`]}>
        <Routes>
          <Route path="/child/:id/journey/:courseId/printables" element={<ChildModulePrintables />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  await act(async () => {});
  return view;
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const cardOf = (title) => screen.getByText(title).parentElement.parentElement;

describe('Printables page layout', () => {
  it('keeps its side space on computers and tablets and gives phones a fluid one', async () => {
    const { container } = await mount();
    const page = container.firstElementChild;
    expect(css(page).desktop).toMatchObject({ 'padding-left': '24px', 'padding-right': '24px' });
    expect(isFluid(css(page).phone['padding-left'])).toBe(true);
  });

  describe('header', () => {
    it('keeps its computer sizes and scales the title and printer on phones', async () => {
      await mount();
      const title = screen.getByText('Printables');
      expect(css(title).desktop['font-size']).toBe('2.75rem');
      expect(isFluid(css(title).phone['font-size'])).toBe(true);
      const printer = title.previousElementSibling;
      expect(css(printer).desktop['svg|width']).toBe('48px');
      expect(isFluid(css(printer).phone['svg|width'])).toBe(true);
    });
  });

  describe('the list of cards', () => {
    it('keeps its 24px side inset on computers and tablets and uses the whole width on phones', async () => {
      await mount();
      const list = cardOf('Page 1: Colouring 1').parentElement;
      expect(css(list).desktop).toMatchObject({ 'padding-left': '24px', 'padding-right': '24px' });
      expect(css(list).phone).toMatchObject({ 'padding-left': '0px', 'padding-right': '0px' });
    });
  });

  describe('a printable card', () => {
    it('is a row on computers and tablets, as it always was', async () => {
      await mount();
      const card = cardOf('Page 1: Colouring 1');
      expect(css(card).desktop).toMatchObject({
        'flex-direction': 'row',
        'align-items': 'center',
        padding: '24px',
        gap: '24px',
      });
      const picture = card.firstElementChild;
      expect(css(picture).desktop).toMatchObject({ width: '128px', height: '128px', 'aspect-ratio': 'auto', display: 'block' });
      const words = card.children[1];
      expect(css(words).desktop).toMatchObject({ 'min-width': 'auto', 'overflow-wrap': 'normal' });
      expect(css(screen.getByText('Page 1: Colouring 1')).desktop['font-size']).toBe('1.6rem');
      expect(css(screen.getByText('Colour page 1')).desktop['font-size']).toBe('1.15rem');
    });

    it('stacks on phones: the picture on top, then the words, then the button', async () => {
      await mount();
      const card = cardOf('Page 1: Colouring 1');
      expect(css(card).phone).toMatchObject({ 'flex-direction': 'column', 'align-items': 'stretch' });
      expect(isFluid(css(card).phone.padding)).toBe(true);
      expect(isFluid(css(card).phone.gap)).toBe(true);
      const picture = card.firstElementChild;
      expect(css(picture).phone).toMatchObject({ width: '100%', height: 'auto', 'aspect-ratio': '4/3', display: 'block' });
      const words = card.children[1];
      expect(css(words).phone).toMatchObject({ 'min-width': '0', 'overflow-wrap': 'anywhere' });
      expect(isFluid(css(screen.getByText('Page 1: Colouring 1')).phone['font-size'])).toBe(true);
      expect(isFluid(css(screen.getByText('Colour page 1')).phone['font-size'])).toBe(true);
    });

    it('a printable with no picture shows no empty box on phones, and still does on computers', async () => {
      await mount();
      const picture = cardOf('Page 2: Colouring 2').firstElementChild;
      expect(css(picture).phone.display).toBe('none');
      expect(css(picture).desktop.display).toBe('block');
    });

    it('the Download button keeps its computer size and is full width on phones', async () => {
      await mount();
      const button = screen.getByRole('button', { name: 'Download Colouring 1' });
      expect(css(button).desktop).toMatchObject({
        width: 'auto',
        'padding-left': '32px',
        'padding-top': '16px',
        'font-size': '1.15rem',
        'hover:transform': 'scale(1.03)',
      });
      expect(css(button).phone).toMatchObject({ width: '100%', 'padding-left': '16px', 'padding-top': '12px', 'hover:transform': 'none' });
      expect(isFluid(css(button).phone['font-size'])).toBe(true);
    });
  });

  describe('the tip at the bottom', () => {
    it('keeps its computer padding and shrinks it on small phones', async () => {
      await mount();
      const box = screen.getByText(/Tip: Print these pages/).parentElement;
      expect(css(box).desktop.padding).toBe('24px');
      expect(isFluid(css(box).phone.padding)).toBe(true);
    });
  });

  describe('first-load placeholder', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('is stacked on phones and a row on computers, like the real cards', async () => {
      await mount({ never: true });
      await act(async () => { vi.advanceTimersByTime(400); });
      const frame = screen.getByRole('status', { name: 'Loading printables' });
      const card = frame.firstElementChild;
      expect(css(card).desktop).toMatchObject({ 'flex-direction': 'row', 'align-items': 'center', padding: '24px' });
      expect(css(card).phone).toMatchObject({ 'flex-direction': 'column', 'align-items': 'stretch' });
      expect(css(card.firstElementChild).desktop).toMatchObject({ width: '128px', height: '128px' });
      expect(css(card.firstElementChild).phone).toMatchObject({ width: '100%', height: 'auto', 'aspect-ratio': '4/3' });
      expect(css(card.lastElementChild).desktop.width).toBe('150px');
      expect(css(card.lastElementChild).phone.width).toBe('100%');
    });
  });
});
