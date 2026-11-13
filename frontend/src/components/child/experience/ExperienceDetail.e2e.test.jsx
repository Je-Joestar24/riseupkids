/**
 * End to end on the real pages (real router, real Redux cache, real hook, service, components and the real Bunny
 * iframe): from the list, a tap on an experience opens its page, drawn like the phone app's Experience page, and the
 * buttons on it lead back. Only the network is replaced (a fake backend behind the axios instance).
 *
 * What matters most:
 *  - a card on the list opens exactly its own experience (one request, for that id);
 *  - the page shows the title, the description, every video in the admin's order (one player at a time, started only
 *    by a tap), the printable with a button that opens the right address, and the way back and home;
 *  - nothing unsafe is ever opened or framed (a non-https printable, a video that is not a Bunny embed);
 *  - the first visit shows placeholders, later visits show the last answer at once and refresh quietly;
 *  - "not available" and "could not load" are different screens, and children never see each other's cache.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import uiReducer from '../../../store/slices/uiSlice';
import childPageCacheReducer from '../../../store/slices/childPageCacheSlice';
import api from '../../../api/axios';
import ChildExperiences from '../../../pages/child/ChildExperiences';
import ChildExperienceDetail from '../../../pages/child/ChildExperienceDetail';
import { EXPERIENCE_COLORS } from '../../../utils/experienceChildFormat';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';

vi.mock('../../../api/axios', () => ({ default: { get: vi.fn() } }));
// A known server address, so a picture path that is not a full address visibly becomes one.
vi.mock('../../../config/constants', async (importOriginal) => ({ ...(await importOriginal()), BACKEND_BASE_URL: 'https://api.test' }));

const UUID_1 = '00000000-0000-4000-8000-000000000001';
const UUID_2 = '00000000-0000-4000-8000-000000000002';
const embed = (n) => `https://iframe.mediadelivery.net/embed/660084/video-${n}`;

const card = (uuid, n, overrides = {}) => ({
  uuid,
  title: `Experience ${n}`,
  description: `About experience ${n}`,
  coverImage: `https://cdn.test/experiences/images/${n}.png`,
  videoCount: 2,
  ...overrides,
});

const video = (n, overrides = {}) => ({ id: `v${n}`, title: `Video title ${n}`, embedUrl: embed(n), position: n, ...overrides });

const detailOf = (uuid, overrides = {}) => ({
  uuid,
  title: 'Strawberry Banana Smoothie',
  description: 'Learn the fruit words, then cook along.',
  coverImage: 'https://cdn.test/experiences/images/1.png',
  videos: [video(1), video(2)],
  printable: {
    image: 'https://cdn.test/experiences/printable/recipe.png',
    kind: 'link',
    url: 'https://riseup.kids/downloads/recipe.pdf',
    fileName: '',
    button: 'Print recipe here',
  },
  ...overrides,
});

const notFoundError = () => ({
  response: { status: 404, data: { success: false, code: 'EXPERIENCE_NOT_FOUND', message: 'Experience not found.' } },
  message: 'Request failed with status code 404',
});

/** The server, as far as these pages can tell: what it answers to GET /experiences and GET /experiences/:uuid. */
const backend = { list: null, detail: null, requests: [] };

function useFakeServer() {
  backend.requests = [];
  backend.list = async () => ({ data: { success: true, data: [card(UUID_1, 1), card(UUID_2, 2)] } });
  backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid) } });
  api.get.mockImplementation(async (url) => {
    backend.requests.push(url);
    if (url === '/experiences') return backend.list();
    const match = /^\/experiences\/(.+)$/.exec(url);
    if (match) return backend.detail(decodeURIComponent(match[1]));
    throw new Error(`unexpected request ${url}`);
  });
}

let store;
const newStore = () => configureStore({ reducer: { ui: uiReducer, childPageCache: childPageCacheReducer } });

const LocationProbe = () => <div data-testid="where">{useLocation().pathname}</div>;
const ListRoute = () => <ChildExperiences childId={useParams().id} />;
const DetailRoute = () => <ChildExperienceDetail childId={useParams().id} />;

function App({ path }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/child/:id/explore/experience" element={<ListRoute />} />
            <Route path="/child/:id/explore/experience/:uuid" element={<DetailRoute />} />
            <Route path="/child/:id/home" element={<div>Home page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};
const open = async (path) => {
  const view = render(<App path={path} />);
  await settle();
  return view;
};
const openDetail = (uuid = UUID_1, child = 'kid1') => open(`/child/${child}/explore/experience/${uuid}`);
const where = () => screen.getByTestId('where').textContent;
const section = (name) => screen.getByRole('region', { name });
const players = () => document.querySelectorAll('iframe');
const bg = (element) => getComputedStyle(element).backgroundColor;
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

beforeEach(() => {
  vi.clearAllMocks();
  store = newStore();
  useFakeServer();
});
afterEach(() => cleanup());

describe('opening an experience from the list', () => {
  it('a card is one link, named after the experience, that opens that experience', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 2' }));
    await settle();
    expect(where()).toBe(`/child/kid1/explore/experience/${UUID_2}`);
    expect(backend.requests).toContain(`/experiences/${UUID_2}`);
    expect(backend.requests).not.toContain(`/experiences/${UUID_1}`);
  });

  it('shows what the server sent for that experience, not the card', async () => {
    const user = userEvent.setup();
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { title: 'The full title of two' }) } });
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 2' }));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'The full title of two' })).toBeInTheDocument();
  });

  it('can be opened with the keyboard: Tab to the link, Enter', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore/experience');
    const first = screen.getByRole('link', { name: 'Experience 1' });
    first.focus();
    expect(first).toHaveFocus();
    await user.keyboard('{Enter}');
    await settle();
    expect(where()).toBe(`/child/kid1/explore/experience/${UUID_1}`);
  });

  it('the whole journey: list, an experience, back to the list, another experience, home', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 2' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to home/i }));
    await settle();
    expect(where()).toBe('/child/kid1/home');
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });

  it('asks the server for one experience, once, with its id in the address', async () => {
    await openDetail(UUID_1);
    expect(backend.requests).toEqual([`/experiences/${UUID_1}`]);
  });

  it('only reads: it never asks for the list when the page is opened directly', async () => {
    await openDetail(UUID_1);
    expect(backend.requests).not.toContain('/experiences');
  });
});

describe('the page', () => {
  it('has the title as the one top heading', async () => {
    await openDetail();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
  });

  it("shows the experience's own description under the title", async () => {
    await openDetail();
    expect(screen.getByText('Learn the fruit words, then cook along.')).toBeInTheDocument();
    expect(screen.queryByText(/bilingual, naturally/)).not.toBeInTheDocument();
  });

  it("without a description it shows the app's own two lines", async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { description: '' }) } });
    await openDetail();
    expect(screen.getByText('Your child will be bilingual, naturally.')).toBeInTheDocument();
    expect(screen.getByText('How? By living the English language.')).toBeInTheDocument();
    // the second line is orange, the first is the dark green of the rest of the text
    expect(getComputedStyle(screen.getByText('How? By living the English language.')).color).toBe(rgb(EXPERIENCE_COLORS.orange));
    expect(getComputedStyle(screen.getByText('Your child will be bilingual, naturally.')).color).toBe(rgb(EXPERIENCE_COLORS.ink));
  });

  it('keeps line breaks the admin typed in the description', async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { description: 'Line one\nLine two' }) } });
    await openDetail();
    expect(getComputedStyle(screen.getByText(/Line one/)).whiteSpace).toBe('pre-wrap');
  });

  it('ends with the closing message, the stars line and the Back to home button', async () => {
    await openDetail();
    const closing = section('Closing message');
    expect(within(closing).getByRole('heading', { level: 2, name: 'You are learning, one step at a time.' })).toBeInTheDocument();
    expect(within(closing).getByText(/Reach for the stars/)).toBeInTheDocument();
    expect(within(closing).getByRole('button', { name: /Back to home/i })).toBeInTheDocument();
  });

  it('draws the sections in the app\'s order: title, videos, printable, closing', async () => {
    await openDetail();
    const order = [...document.querySelectorAll('section')].map((s) => s.getAttribute('aria-label'));
    expect(order).toEqual(['Title', 'Video title 1', 'Video title 2', 'Printable', 'Closing message']);
  });

  it('colours the bands like the app: cream title, pale then cream videos, the next one in turn, peach closing', async () => {
    await openDetail();
    expect(bg(section('Title'))).toBe(rgb(EXPERIENCE_COLORS.cream));
    expect(bg(section('Video title 1'))).toBe(rgb(EXPERIENCE_COLORS.pale));
    expect(bg(section('Video title 2'))).toBe(rgb(EXPERIENCE_COLORS.cream));
    expect(bg(section('Printable'))).toBe(rgb(EXPERIENCE_COLORS.pale));
    expect(bg(section('Closing message'))).toBe(rgb(EXPERIENCE_COLORS.peach));
  });

  it('keeps taking turns with three videos (pale, cream, pale) and the printable gets cream', async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { videos: [video(1), video(2), video(3)] }) } });
    await openDetail();
    expect(bg(section('Video title 1'))).toBe(rgb(EXPERIENCE_COLORS.pale));
    expect(bg(section('Video title 2'))).toBe(rgb(EXPERIENCE_COLORS.cream));
    expect(bg(section('Video title 3'))).toBe(rgb(EXPERIENCE_COLORS.pale));
    expect(bg(section('Printable'))).toBe(rgb(EXPERIENCE_COLORS.cream));
  });
});

describe('the videos', () => {
  it('start as play buttons named after the video, and no player is created yet', async () => {
    await openDetail();
    expect(screen.getByRole('button', { name: 'Play Video title 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Video title 2' })).toBeInTheDocument();
    expect(players()).toHaveLength(0);
  });

  it('keep the order the server sent', async () => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { videos: [video(3), video(1), video(2)] }) },
    });
    await openDetail();
    const names = screen.getAllByRole('button', { name: /^Play / }).map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Play Video title 3', 'Play Video title 1', 'Play Video title 2']);
  });

  it('a tap creates that video\'s player, with autoplay on and the video\'s own address', async () => {
    const user = userEvent.setup();
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Play Video title 2' }));
    expect(players()).toHaveLength(1);
    const src = new URL(players()[0].getAttribute('src'));
    expect(`${src.origin}${src.pathname}`).toBe(embed(2));
    expect(src.searchParams.get('autoplay')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Play Video title 2' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Video title 1' })).toBeInTheDocument();
  });

  it('only one plays at a time: starting the other puts the first back to its play button', async () => {
    const user = userEvent.setup();
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Play Video title 1' }));
    await user.click(screen.getByRole('button', { name: 'Play Video title 2' }));
    expect(players()).toHaveLength(1);
    expect(players()[0].getAttribute('src')).toContain('video-2');
    expect(screen.getByRole('button', { name: 'Play Video title 1' })).toBeInTheDocument();
  });

  it('give the player the app\'s settings: inline playback, no outside extras', async () => {
    const user = userEvent.setup();
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Play Video title 1' }));
    const iframe = players()[0];
    expect(new URL(iframe.getAttribute('src')).searchParams.get('playsinline')).toBe('true');
    expect(iframe.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(iframe.getAttribute('allow')).toContain('autoplay');
  });

  it("use the app's interactive settings, not the locked 'watch only' ones (the child may use the player's own controls)", async () => {
    const user = userEvent.setup();
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Play Video title 1' }));
    const params = new URL(players()[0].getAttribute('src')).searchParams;
    for (const locked of ['disableIosPlayer', 'disableAirplay', 'showSpeed', 'chromecast']) {
      expect(params.has(locked), locked).toBe(false);
    }
    expect(screen.queryByRole('button', { name: /Play or pause/ })).not.toBeInTheDocument();
  });

  it('a video with no title is called "Video N"', async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { videos: [video(1, { title: '' }), video(2, { title: '   ' })] }) } });
    await openDetail();
    expect(screen.getByRole('button', { name: 'Play Video 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Video 2' })).toBeInTheDocument();
  });

  it('a video that is not a Bunny embed is never framed and cannot be pressed', async () => {
    const user = userEvent.setup();
    backend.detail = async (uuid) => ({
      data: {
        success: true,
        data: detailOf(uuid, {
          videos: [
            video(1, { embedUrl: 'https://evil.example.com/embed/1' }),
            video(2, { embedUrl: 'javascript:alert(1)' }),
            video(3, { embedUrl: 'http://iframe.mediadelivery.net/embed/1/x' }),
            video(4),
          ],
        }),
      },
    });
    await openDetail();
    expect(screen.queryByRole('button', { name: 'Play Video title 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play Video title 2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play Video title 3' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Video title 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play Video title 4' }));
    expect(players()).toHaveLength(1);
    expect(players()[0].getAttribute('src')).toContain('video-4');
  });

  it('a Bunny "player" host link also plays', async () => {
    const user = userEvent.setup();
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { videos: [video(1, { embedUrl: 'https://player.mediadelivery.net/embed/660084/abc' })] }) },
    });
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Play Video title 1' }));
    expect(players()[0].getAttribute('src')).toContain('player.mediadelivery.net/embed/660084/abc');
  });

  it('an experience with no videos shows no video section at all, and the rest of the page', async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { videos: [] }) } });
    await openDetail();
    expect(screen.queryByRole('button', { name: /^Play / })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(section('Closing message')).toBeInTheDocument();
    expect(bg(section('Printable'))).toBe(rgb(EXPERIENCE_COLORS.pale));
  });
});

describe('the printable', () => {
  it('a link: a button that opens that address in a new tab, safely', async () => {
    await openDetail();
    const button = within(section('Printable')).getByRole('link', { name: 'Print recipe here' });
    expect(button).toHaveAttribute('href', 'https://riseup.kids/downloads/recipe.pdf');
    expect(button).toHaveAttribute('target', '_blank');
    expect(button.getAttribute('rel')).toContain('noopener');
    expect(button.getAttribute('rel')).toContain('noreferrer');
  });

  it('an uploaded file: the same button, opening the file', async () => {
    backend.detail = async (uuid) => ({
      data: {
        success: true,
        data: detailOf(uuid, {
          printable: { image: null, kind: 'file', url: 'https://media.riseup.kids/experiences/files/recipe.pdf', fileName: 'recipe.pdf', button: 'Get the PDF' },
        }),
      },
    });
    await openDetail();
    expect(within(section('Printable')).getByRole('link', { name: 'Get the PDF' })).toHaveAttribute(
      'href',
      'https://media.riseup.kids/experiences/files/recipe.pdf'
    );
  });

  it('shows the printable\'s picture above the button', async () => {
    await openDetail();
    const picture = within(section('Printable')).getByRole('img', { name: 'Strawberry Banana Smoothie printable' });
    expect(picture).toHaveAttribute('src', 'https://cdn.test/experiences/printable/recipe.png');
    const button = within(section('Printable')).getByRole('link', { name: 'Print recipe here' });
    expect(Boolean(picture.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('resolves a picture path that is not a full address, like every other picture on the site', async () => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { printable: { image: '/uploads/experiences/p.png', kind: null, url: null, fileName: '', button: '' } }) },
    });
    await openDetail();
    const resolved = getCoverImageUrl('/uploads/experiences/p.png');
    expect(resolved).toBe('https://api.test/uploads/experiences/p.png');
    expect(within(section('Printable')).getByRole('img')).toHaveAttribute('src', resolved);
  });

  it('with no button text the button says "Print here"', async () => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { printable: { image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: '' } }) },
    });
    await openDetail();
    expect(within(section('Printable')).getByRole('link', { name: 'Print here' })).toBeInTheDocument();
  });

  it('a picture alone is shown, with no button (there is nothing to open)', async () => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { printable: { image: 'https://cdn.test/p.png', kind: null, url: null, fileName: '', button: '' } }) },
    });
    await openDetail();
    expect(within(section('Printable')).getByRole('img')).toBeInTheDocument();
    expect(within(section('Printable')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('a button alone (link, no picture) is shown without a picture', async () => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { printable: { image: null, kind: 'link', url: 'https://riseup.kids/a.pdf', fileName: '', button: 'Print' } }) },
    });
    await openDetail();
    expect(within(section('Printable')).queryByRole('img')).not.toBeInTheDocument();
    expect(within(section('Printable')).getByRole('link', { name: 'Print' })).toBeInTheDocument();
  });

  it('with no printable there is no printable section', async () => {
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { printable: null }) } });
    await openDetail();
    expect(screen.queryByRole('region', { name: 'Printable' })).not.toBeInTheDocument();
    expect(section('Closing message')).toBeInTheDocument();
  });

  it.each([
    ['http', 'http://riseup.kids/a.pdf'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['not an address', 'not a link'],
    ['empty', ''],
  ])('never opens a %s address (the button is left out)', async (_name, url) => {
    backend.detail = async (uuid) => ({
      data: { success: true, data: detailOf(uuid, { printable: { image: null, kind: 'link', url, fileName: '', button: 'Print' } }) },
    });
    await openDetail();
    expect(screen.queryByRole('link', { name: 'Print' })).not.toBeInTheDocument();
  });
});

describe('the buttons', () => {
  it('Back to Experiences is at the very top, above the title', async () => {
    await openDetail();
    const back = screen.getByRole('button', { name: /Back to Experiences/ });
    const title = screen.getByRole('heading', { level: 1 });
    expect(Boolean(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('Back to Experiences goes to this child\'s list', async () => {
    const user = userEvent.setup();
    await openDetail(UUID_1, 'kid7');
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();
    expect(where()).toBe('/child/kid7/explore/experience');
  });

  it('Back to home goes to this child\'s home', async () => {
    const user = userEvent.setup();
    await openDetail(UUID_1, 'kid7');
    await user.click(screen.getByRole('button', { name: /Back to home/i }));
    await settle();
    expect(where()).toBe('/child/kid7/home');
  });

  it('the page has no outside links (the printable is the only link on it)', async () => {
    await openDetail();
    const links = screen.queryAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://riseup.kids/downloads/recipe.pdf']);
  });
});

describe('loading', () => {
  it('shows placeholders on the first visit, with the way back already there, then the page', async () => {
    let release;
    backend.detail = () => new Promise((resolve) => { release = () => resolve({ data: { success: true, data: detailOf(UUID_1) } }); });
    render(<App path={`/child/kid1/explore/experience/${UUID_1}`} />);
    expect(await screen.findByRole('status', { name: 'Loading experience' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /Back to Experiences/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    await act(async () => release());
    expect(screen.queryByRole('status', { name: 'Loading experience' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
  });

  it('Back to Experiences already works from the placeholder (it goes to this child\'s list)', async () => {
    const user = userEvent.setup();
    backend.detail = () => new Promise(() => {});
    render(<App path={`/child/kid7/explore/experience/${UUID_1}`} />);
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();
    expect(where()).toBe('/child/kid7/explore/experience');
  });

  it('shows no placeholder at all for an answer that comes quickly', async () => {
    await openDetail();
    expect(screen.queryByRole('status', { name: 'Loading experience' })).not.toBeInTheDocument();
  });

  it('a second visit shows the last answer at once, then replaces it quietly', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();

    let release;
    backend.detail = () => new Promise((resolve) => { release = () => resolve({ data: { success: true, data: detailOf(UUID_1, { title: 'Changed by the admin' }) } }); });
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    // drawn from the cache before the server has answered
    expect(screen.getByRole('heading', { level: 1, name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading experience' })).not.toBeInTheDocument();

    await act(async () => release());
    expect(screen.getByRole('heading', { level: 1, name: 'Changed by the admin' })).toBeInTheDocument();
  });

  it('keeps a separate answer for each experience', async () => {
    const user = userEvent.setup();
    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid, { title: `Title of ${uuid.slice(-1)}` }) } });
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Title of 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();
    await user.click(screen.getByRole('link', { name: 'Experience 2' }));
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Title of 2' })).toBeInTheDocument();
  });

  it('another child starts from the placeholder, never from the first child\'s cache', async () => {
    const first = await openDetail(UUID_1, 'kid1');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    first.unmount();

    backend.detail = () => new Promise(() => {});
    render(<App path={`/child/kid2/explore/experience/${UUID_1}`} />);
    expect(await screen.findByRole('status', { name: 'Loading experience' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('an experience that is not available', () => {
  const gone = () => { throw notFoundError(); };

  it('says it is not available, and does not pretend it can be tried again', async () => {
    backend.detail = gone;
    await openDetail('99999999-9999-4999-8999-999999999999');
    expect(screen.getByRole('heading', { level: 1, name: 'This experience is not available' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(backend.requests).toHaveLength(1);
  });

  it('offers the way back to the list, which works', async () => {
    const user = userEvent.setup();
    backend.detail = gone;
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'See all experiences' }));
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
    expect(screen.getByRole('region', { name: 'Experiences' })).toBeInTheDocument();
  });

  it('also has Back to Experiences at the top', async () => {
    backend.detail = gone;
    await openDetail();
    expect(screen.getByRole('button', { name: /Back to Experiences/ })).toBeInTheDocument();
  });

  it('shows no popup', async () => {
    backend.detail = gone;
    await openDetail();
    expect(store.getState().ui.notification.open).toBeFalsy();
  });
});

describe('when it cannot be loaded', () => {
  it('says so with the reason and offers Try again (and shows no popup)', async () => {
    backend.detail = async () => { throw new Error('Network Error'); };
    await openDetail();
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Experiences/ })).toBeInTheDocument();
    expect(screen.queryByText('This experience is not available')).not.toBeInTheDocument();
    expect(store.getState().ui.notification.open).toBeFalsy();
  });

  it('shows the server\'s own message when it sent one', async () => {
    backend.detail = async () => { throw { response: { status: 500, data: { message: 'Something went wrong on our side.' } }, message: 'x' }; };
    await openDetail();
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side.');
  });

  it('a server error is "could not load", never "not available"', async () => {
    backend.detail = async () => { throw { response: { status: 500, data: { message: 'Boom' } }, message: 'x' }; };
    await openDetail();
    expect(screen.queryByText('This experience is not available')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('an answer that is not an experience is a failed load', async () => {
    backend.detail = async () => ({ data: '<html>Bad gateway</html>' });
    await openDetail();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load this experience/i);
  });

  it('Try again loads the page and replaces the message with it', async () => {
    const user = userEvent.setup();
    backend.detail = async () => { throw new Error('Network Error'); };
    await openDetail();

    backend.detail = async (uuid) => ({ data: { success: true, data: detailOf(uuid) } });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
    expect(backend.requests).toHaveLength(2);
  });

  it('Try again that fails again keeps the message', async () => {
    const user = userEvent.setup();
    backend.detail = async () => { throw new Error('Network Error'); };
    await openDetail();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    expect(backend.requests).toHaveLength(2);
  });

  it('a refresh that fails behind real content stays silent and keeps the page', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    await settle();

    backend.detail = async () => { throw new Error('Network Error'); };
    await user.click(screen.getByRole('link', { name: 'Experience 1' }));
    await settle();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
  });
});

describe('addresses it is given', () => {
  it('asks for the id exactly as written in the address, safely encoded', async () => {
    // the address carries the id encoded; the page decodes it once and encodes it once for the request
    await openDetail('weird%20id%3Fchars%23');
    expect(backend.requests).toEqual(['/experiences/weird%20id%3Fchars%23']);
  });
});
