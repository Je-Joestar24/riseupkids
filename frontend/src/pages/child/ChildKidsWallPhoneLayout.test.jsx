/**
 * Phone layout for the Kids' Wall: on a phone the page gets the same side space as the app, the header, share card
 * and footer scale down on small screens, the like and star buttons are bigger, and long posts are cut short like
 * in the app. Tablets and computers (600px and wider) keep every value they always had. Checked on the style rules
 * the page really generates.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import kidsWallReducer from '../../store/slices/kidsWallSlice';
import uiReducer from '../../store/slices/uiSlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import kidsWallService from '../../services/kidsWallService';
import childrenService from '../../services/childrenService';
import { KIDS_WALL_UPLOAD_DISABLED_BUTTON } from '../../constants/kidsWallConsent';
import ChildKidsWall from './ChildKidsWall';
import { readResponsiveCss } from '../../test/readResponsiveCss';

vi.mock('../../services/kidsWallService', () => ({
  default: { getAllPosts: vi.fn(), toggleLike: vi.fn(), toggleStar: vi.fn() },
}));
vi.mock('../../services/childrenService', () => ({ default: { getChildById: vi.fn() } }));

const css = readResponsiveCss;
const isFluid = (value) => /^clamp\(\d/.test(value || '');
const isFluidPair = (value) => /^clamp\([^)]*\) clamp\([^)]*\)$/.test(value || '');

const enabledChild = { _id: 'kid1', kidsWallEnabled: true, kidsWallConsentAt: '2026-01-01T00:00:00Z' };
const disabledChild = { _id: 'kid1', kidsWallEnabled: false };
const post = { _id: 'p1', title: 'My drawing', content: 'About my drawing', child: { displayName: 'Sam', age: 6 }, likes: [], stars: [] };

const mount = async ({ posts = [post], child = enabledChild, never = false } = {}) => {
  kidsWallService.getAllPosts.mockImplementation(() => (never ? new Promise(() => {}) : Promise.resolve({ data: posts })));
  childrenService.getChildById.mockResolvedValue({ data: child });
  const store = configureStore({ reducer: { kidsWall: kidsWallReducer, ui: uiReducer, childPageCache: childPageCacheReducer } });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/child/kid1/wall']}>
        <Routes>
          <Route path="/child/:id/wall" element={<ChildKidsWall childId="kid1" />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  await act(async () => {});
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
afterEach(() => cleanup());

const headerBox = () => screen.getByText('Show & Tell!').parentElement.parentElement;
const shareRow = () => screen.getByText('Share Your Amazing Work!').parentElement.parentElement;
const shareCard = () => shareRow().parentElement;
const postCard = () => screen.getByText('My drawing').parentElement.parentElement.parentElement;

describe('the page', () => {
  it('has no side space on computers and tablets, as always, and the app\'s side space on phones', async () => {
    await mount();
    const page = headerBox().parentElement;
    expect(css(page).desktop).toMatchObject({ 'padding-left': '0px', 'padding-right': '0px' });
    expect(isFluid(css(page).phone['padding-left'])).toBe(true);
    expect(isFluid(css(page).phone['padding-right'])).toBe(true);
  });

  it('the empty message keeps its computer sizes and shrinks on phones', async () => {
    await mount({ posts: [] });
    const message = screen.getByText(/No posts yet/);
    expect(css(message.parentElement).desktop.padding).toBe('40px');
    expect(isFluid(css(message.parentElement).phone.padding)).toBe(true);
    expect(css(message).desktop['font-size']).toBe('1.2rem');
    expect(isFluid(css(message).phone['font-size'])).toBe(true);
  });
});

describe('the header', () => {
  it('keeps its computer sizes and scales down on phones', async () => {
    await mount();
    const box = headerBox();
    expect(css(box).desktop).toMatchObject({ padding: '24px', 'margin-bottom': '32px' });
    expect(isFluid(css(box).phone.padding)).toBe(true);
    expect(isFluid(css(box).phone['margin-bottom'])).toBe(true);

    const title = screen.getByText('Show & Tell!');
    expect(css(title).desktop['font-size']).toBe('30px');
    expect(isFluid(css(title).phone['font-size'])).toBe(true);

    const subtitle = screen.getByText('See what friends are learning!');
    expect(css(subtitle).desktop['font-size']).toBe('20px');
    expect(isFluid(css(subtitle).phone['font-size'])).toBe(true);
  });

  it('the stars picture is 48px on computers and shrinks on phones', async () => {
    await mount();
    const stars = screen.getAllByAltText('Stars')[0];
    expect(css(stars).desktop).toMatchObject({ width: '48px', height: '48px' });
    expect(isFluid(css(stars).phone.width)).toBe(true);
    expect(isFluid(css(stars).phone.height)).toBe(true);
  });
});

describe('the share card', () => {
  it('keeps its computer spacing and scales down on phones', async () => {
    await mount();
    expect(css(shareCard()).desktop).toMatchObject({ padding: '24px', 'margin-bottom': '32px' });
    expect(isFluid(css(shareCard()).phone.padding)).toBe(true);
    expect(isFluid(css(shareCard()).phone['margin-bottom'])).toBe(true);
    expect(css(shareRow()).desktop).toMatchObject({ gap: '16px', 'margin-bottom': '16px' });
    expect(isFluid(css(shareRow()).phone.gap)).toBe(true);
    expect(isFluid(css(shareRow()).phone['margin-bottom'])).toBe(true);
  });

  it('the sparkles are 48px on computers and shrink with their box on phones', async () => {
    await mount();
    const icon = shareRow().firstElementChild;
    expect(css(icon).desktop).toMatchObject({ width: '48px', height: '48px', 'svg|width': '48px', 'svg|height': '48px' });
    expect(isFluid(css(icon).phone.width)).toBe(true);
    expect(isFluid(css(icon).phone.height)).toBe(true);
    expect(css(icon).phone).toMatchObject({ 'svg|width': '100%', 'svg|height': '100%' });
  });

  it('the title and the words keep their computer sizes and scale down on phones', async () => {
    await mount();
    const title = screen.getByText('Share Your Amazing Work!');
    expect(css(title).desktop['font-size']).toBe('24px');
    expect(isFluid(css(title).phone['font-size'])).toBe(true);
    const words = screen.getByText('Ask a grown-up to help you share!');
    expect(css(words).desktop['font-size']).toBe('18px');
    expect(isFluid(css(words).phone['font-size'])).toBe(true);
  });

  it('the button keeps its computer size and grow effect, and has neither the effect nor a big size on phones', async () => {
    await mount();
    const button = screen.getByRole('button', { name: 'Share Something Cool!' });
    expect(css(button).desktop).toMatchObject({ 'font-size': '1.2rem', padding: '16px 24px', 'hover:transform': 'scale(1.05)' });
    expect(isFluid(css(button).phone['font-size'])).toBe(true);
    expect(isFluidPair(css(button).phone.padding)).toBe(true);
    expect(css(button).phone['hover:transform']).toBe('none');
  });

  it('with uploads off the button never grows, on any screen', async () => {
    await mount({ child: disabledChild });
    const button = screen.getByRole('button', { name: KIDS_WALL_UPLOAD_DISABLED_BUTTON });
    expect(css(button).desktop['hover:transform']).toBe('none');
    expect(css(button).phone['hover:transform']).toBe('none');
  });
});

describe('a post card', () => {
  it('stays one column on phones and two on tablets and computers, with its computer spacing', async () => {
    await mount();
    const grid = postCard().parentElement;
    expect(css(grid).phone['grid-template-columns']).toBe('1fr');
    expect(css(grid).desktop).toMatchObject({ 'grid-template-columns': 'repeat(2, 1fr)', gap: '24px', 'margin-bottom': '32px' });
    expect(isFluid(css(grid).phone.gap)).toBe(true);
    expect(isFluid(css(grid).phone['margin-bottom'])).toBe(true);
  });

  it('keeps its 16px inside space on computers and scales it down on phones', async () => {
    await mount();
    const body = screen.getByText('My drawing').parentElement.parentElement;
    expect(css(body).desktop.padding).toBe('16px');
    expect(isFluid(css(body).phone.padding)).toBe(true);
  });

  it('shows the whole title and text on computers and cuts them at two and four lines on phones', async () => {
    await mount();
    const title = screen.getByText('My drawing');
    expect(css(title).desktop).toMatchObject({
      display: 'block',
      '-webkit-line-clamp': 'none',
      '-webkit-box-orient': 'horizontal',
      overflow: 'visible',
      'overflow-wrap': 'normal',
    });
    expect(css(title).base['font-size']).toBe('16px'); // the size itself is the same on every screen
    expect(css(title).phone).toMatchObject({
      display: '-webkit-box',
      '-webkit-line-clamp': '2',
      '-webkit-box-orient': 'vertical',
      overflow: 'hidden',
      'overflow-wrap': 'anywhere',
    });

    const text = screen.getByText('About my drawing');
    expect(css(text).desktop).toMatchObject({
      display: 'block',
      '-webkit-line-clamp': 'none',
      '-webkit-box-orient': 'horizontal',
      overflow: 'visible',
      'overflow-wrap': 'normal',
    });
    expect(css(text).base['font-size']).toBe('14px');
    expect(css(text).phone).toMatchObject({
      display: '-webkit-box',
      '-webkit-line-clamp': '4',
      '-webkit-box-orient': 'vertical',
      overflow: 'hidden',
      'overflow-wrap': 'anywhere',
    });
  });

  it('the heart is small on computers and bigger and easier to tap on phones, with no grow effect', async () => {
    await mount();
    const heart = screen.getByRole('button', { name: 'Like' });
    expect(css(heart).desktop).toMatchObject({ padding: '4px', 'svg|width': '16px', 'svg|height': '16px', 'hover:transform': 'scale(1.1)' });
    expect(css(heart).phone).toMatchObject({ padding: '10px 8px', 'svg|width': '20px', 'svg|height': '20px', 'hover:transform': 'none' });
  });

  it('the Great! button is small on computers and bigger and easier to tap on phones', async () => {
    await mount();
    const star = screen.getByRole('button', { name: 'Star' });
    expect(css(star).desktop).toMatchObject({ padding: '4px 8px', 'svg|width': '16px', 'svg|height': '16px' });
    expect(css(star).phone).toMatchObject({ padding: '10px 12px', 'svg|width': '18px', 'svg|height': '18px' });
  });
});

describe('the footer', () => {
  it('keeps its computer sizes and scales down on phones', async () => {
    await mount();
    const footer = screen.getByText("You're All Amazing!").parentElement;
    expect(css(footer).desktop).toMatchObject({ 'margin-top': '32px', padding: '32px', gap: '16px' });
    expect(isFluid(css(footer).phone['margin-top'])).toBe(true);
    expect(isFluid(css(footer).phone.padding)).toBe(true);
    expect(isFluid(css(footer).phone.gap)).toBe(true);

    const title = screen.getByText("You're All Amazing!");
    expect(css(title).desktop['font-size']).toBe('30px');
    expect(isFluid(css(title).phone['font-size'])).toBe(true);
    const subtitle = screen.getByText('Keep learning and sharing!');
    expect(css(subtitle).desktop['font-size']).toBe('20px');
    expect(isFluid(css(subtitle).phone['font-size'])).toBe(true);
  });

  it('the stars picture is 80px on computers and shrinks on phones', async () => {
    await mount();
    const stars = screen.getAllByAltText('Stars').at(-1);
    expect(css(stars).desktop).toMatchObject({ width: '80px', height: '80px' });
    expect(isFluid(css(stars).phone.width)).toBe(true);
    expect(isFluid(css(stars).phone.height)).toBe(true);
  });
});

describe('first-load placeholder', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('has the same spacing as the real cards: computer values kept, scaled down on phones', async () => {
    await mount({ never: true });
    await act(async () => { vi.advanceTimersByTime(400); });
    const frame = screen.getByRole('status', { name: 'Loading posts' });
    expect(css(frame).desktop['margin-bottom']).toBe('32px');
    expect(isFluid(css(frame).phone['margin-bottom'])).toBe(true);
    const grid = frame.firstElementChild;
    expect(css(grid).desktop.gap).toBe('24px');
    expect(isFluid(css(grid).phone.gap)).toBe(true);
    const body = grid.firstElementChild.lastElementChild;
    expect(css(body).desktop.padding).toBe('16px');
    expect(isFluid(css(body).phone.padding)).toBe(true);
  });
});
