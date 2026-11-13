/**
 * End to end on the real pages (real router, real Redux cache, real hook, service and components): the
 * wide "Experience" button on the Explore page, the list of experiences with their covers that it opens,
 * and the way back. Only the edges are replaced: the network (a fake backend behind the axios instance)
 * and the other Explore sections' data (not under test here).
 *
 * What matters most:
 *  - the button is the first thing on Explore, needs no request, and opens the list;
 *  - the list shows every experience the server sent, in that order, each with its cover (or a placeholder);
 *  - the first visit shows placeholders, later visits show the last answer at once and refresh quietly;
 *  - a failure says so and Try again works; a failed refresh behind real content stays silent;
 *  - children never see each other's cache.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import uiReducer from '../../../store/slices/uiSlice';
import childPageCacheReducer from '../../../store/slices/childPageCacheSlice';
import api from '../../../api/axios';
import ChildExplore from '../../../pages/child/ChildExplore';
import ChildExperiences from '../../../pages/child/ChildExperiences';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';

vi.mock('../../../api/axios', () => ({ default: { get: vi.fn() } }));

// The other Explore sections (replays, collections) are not under test: they get a quiet, empty backend.
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
vi.mock('../../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../common/VideoPlayerModal', () => ({ default: () => null }));

const card = (n, overrides = {}) => ({
  uuid: `00000000-0000-4000-8000-00000000000${n}`,
  title: `Experience ${n}`,
  description: `About experience ${n}`,
  coverImage: `https://cdn.test/experiences/images/${n}.png`,
  videoCount: n,
  ...overrides,
});

/** The server, as far as this page can tell: what it answers to GET /experiences. */
const backend = { reply: null, calls: 0 };
const answer = (list) => ({ data: { success: true, data: list } });

function useFakeServer() {
  backend.calls = 0;
  backend.reply = async () => answer([]);
  api.get.mockImplementation(async (url) => {
    if (url !== '/experiences') throw new Error(`unexpected request ${url}`);
    backend.calls += 1;
    return backend.reply();
  });
}

let store;
const newStore = () => configureStore({ reducer: { ui: uiReducer, childPageCache: childPageCacheReducer } });

const LocationProbe = () => <div data-testid="where">{useLocation().pathname}</div>;
const ExploreRoute = () => <ChildExplore childId={useParams().id} />;
const ExperiencesRoute = () => <ChildExperiences childId={useParams().id} />;

function App({ path }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <LocationProbe />
          <Routes>
            <Route path="/child/:id/explore" element={<ExploreRoute />} />
            <Route path="/child/:id/explore/experience" element={<ExperiencesRoute />} />
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
const where = () => screen.getByTestId('where').textContent;
const articles = () => within(screen.getByRole('region', { name: 'Experiences' })).getAllByRole('article');
const popupOpen = () => store.getState().ui.notification.open;

beforeEach(() => {
  vi.clearAllMocks();
  store = newStore();
  useFakeServer();
  mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });
  mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [] } });
  mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 0, viewedVideos: 0 });
  mockWatch.getTotalStarsForVideoType.mockResolvedValue(0);
  mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0, starsAwarded: false });
});
afterEach(() => cleanup());

describe('the button on the Explore page', () => {
  it('is a wide button named Experience', async () => {
    await open('/child/kid1/explore');
    const button = screen.getByRole('button', { name: 'Experience' });
    expect(button).toBeInTheDocument();
    expect(button).toBeVisible();
  });

  it('is the first thing on the page, above the other Explore sections', async () => {
    mockExplore.fetchContentByType.mockResolvedValue({
      response: { data: [{ _id: 'r1', title: 'Replay one', videoType: 'replay', duration: 60 }] },
    });
    await open('/child/kid1/explore');
    const button = screen.getByRole('button', { name: 'Experience' });
    const before = (other) => Boolean(button.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(screen.getByText('Watch Replays'))).toBe(true);
    expect(before(screen.getByText('What Do You Want to Learn?'))).toBe(true);
    expect(before(screen.getByText('Arts & Crafts'))).toBe(true);
  });

  it('is there even when there are no replays and nothing else loaded', async () => {
    await open('/child/kid1/explore');
    expect(screen.queryByText('Watch Replays')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Experience' })).toBeInTheDocument();
  });

  it('stays on the Explore page and asks the server for nothing until it is pressed', async () => {
    await open('/child/kid1/explore');
    expect(where()).toBe('/child/kid1/explore');
    expect(backend.calls).toBe(0);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('opens the list of experiences for this child', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
    expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
  });

  it('opens the list for whichever child is signed in', async () => {
    const user = userEvent.setup();
    await open('/child/kid2/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(where()).toBe('/child/kid2/explore/experience');
  });

  it('works from the keyboard: Tab to it, press Enter', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore');
    const button = screen.getByRole('button', { name: 'Experience' });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
  });

  it('works with the space bar too', async () => {
    const user = userEvent.setup();
    await open('/child/kid1/explore');
    act(() => screen.getByRole('button', { name: 'Experience' }).focus());
    await user.keyboard(' ');
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
  });

  it('does nothing when there is no child (never goes to /child/undefined)', async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/child/x/explore']}>
            <LocationProbe />
            <Routes>
              <Route path="/child/:id/explore" element={<ChildExplore childId={undefined} />} />
              <Route path="*" element={<div>elsewhere</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );
    await settle();
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    expect(where()).toBe('/child/x/explore');
  });
});

describe('the list page', () => {
  it('shows every experience the server sent, in the server\'s order', async () => {
    backend.reply = async () => answer([card(3), card(1), card(2)]);
    await open('/child/kid1/explore/experience');
    expect(articles().map((a) => within(a).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Experience 3',
      'Experience 1',
      'Experience 2',
    ]);
  });

  it('asks the server once, for the whole list', async () => {
    backend.reply = async () => answer([card(1)]);
    await open('/child/kid1/explore/experience');
    expect(backend.calls).toBe(1);
    expect(api.get).toHaveBeenCalledWith('/experiences');
  });

  it('shows each experience with its cover picture', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    await open('/child/kid1/explore/experience');
    const [first, second] = articles();
    expect(within(first).getByAltText('Experience 1')).toHaveAttribute('src', 'https://cdn.test/experiences/images/1.png');
    expect(within(second).getByAltText('Experience 2')).toHaveAttribute('src', 'https://cdn.test/experiences/images/2.png');
  });

  it('shows a picture placeholder, not a broken image, for an experience without a cover', async () => {
    backend.reply = async () => answer([card(1, { coverImage: null }), card(2)]);
    await open('/child/kid1/explore/experience');
    const [withoutCover, withCover] = articles();
    expect(within(withoutCover).queryByRole('img')).not.toBeInTheDocument();
    expect(within(withoutCover).getByTestId('experience-cover-placeholder')).toBeInTheDocument();
    expect(within(withCover).queryByTestId('experience-cover-placeholder')).not.toBeInTheDocument();
    expect(within(withCover).getByRole('img')).toBeInTheDocument();
  });

  it('resolves a cover path from our own server the way every other cover is resolved', async () => {
    backend.reply = async () => answer([card(1, { coverImage: '/uploads/experiences/images/one.png' })]);
    await open('/child/kid1/explore/experience');
    const src = within(articles()[0]).getByRole('img').getAttribute('src');
    expect(src).toBe(getCoverImageUrl('/uploads/experiences/images/one.png'));
    expect(src.endsWith('/uploads/experiences/images/one.png')).toBe(true);
  });

  it('shows the title, the description and how many videos', async () => {
    backend.reply = async () => answer([card(1), card(3)]);
    await open('/child/kid1/explore/experience');
    const [one, three] = articles();
    expect(within(one).getByText('About experience 1')).toBeInTheDocument();
    expect(within(one).getByText('1 video')).toBeInTheDocument();
    expect(within(three).getByText('3 videos')).toBeInTheDocument();
  });

  it('leaves out the description line when there is none, and says so for an experience with no videos', async () => {
    backend.reply = async () => answer([card(1, { description: '', videoCount: 0 })]);
    await open('/child/kid1/explore/experience');
    const only = articles()[0];
    expect(within(only).queryByText('About experience 1')).not.toBeInTheDocument();
    expect(within(only).getByText('No videos yet')).toBeInTheDocument();
  });

  it('shows text as text (a title with markup is never turned into elements)', async () => {
    backend.reply = async () => answer([card(1, { title: '<img src=x onerror=alert(1)> Tricky', description: '<b>bold</b>' })]);
    await open('/child/kid1/explore/experience');
    const only = articles()[0];
    expect(within(only).getByRole('heading', { level: 2 }).textContent).toBe('<img src=x onerror=alert(1)> Tricky');
    expect(only.querySelector('b')).toBeNull();
    expect(only.querySelectorAll('img')).toHaveLength(1); // the cover, not an injected one
  });

  it('loads the first four covers at once and the rest a little later, one after another', async () => {
    backend.reply = async () => answer(Array.from({ length: 7 }, (_, i) => card(i + 1, { uuid: `u-${i + 1}` })));
    await open('/child/kid1/explore/experience');
    expect(articles()).toHaveLength(7);
    expect(screen.getAllByRole('img')).toHaveLength(4);
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(7), { timeout: 3000 });
  });

  it('copes with a lot of experiences', async () => {
    backend.reply = async () => answer(Array.from({ length: 30 }, (_, i) => card(i + 1, { uuid: `u-${i + 1}`, title: `Item ${i + 1}` })));
    await open('/child/kid1/explore/experience');
    expect(articles()).toHaveLength(30);
    expect(within(articles()[29]).getByRole('heading', { level: 2 }).textContent).toBe('Item 30');
  });

  it('has Back to Explore, which returns to the Explore page with its button', async () => {
    const user = userEvent.setup();
    backend.reply = async () => answer([card(1)]);
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();
    expect(where()).toBe('/child/kid1/explore');
    expect(screen.getByRole('button', { name: 'Experience' })).toBeInTheDocument();
  });

  it('the whole journey: Explore, the button, the list, back, and the button again', async () => {
    const user = userEvent.setup();
    backend.reply = async () => answer([card(1), card(2)]);
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(articles()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(where()).toBe('/child/kid1/explore/experience');
    expect(articles()).toHaveLength(2);
  });

  it('gives each card one link, named after its experience, that points at that experience', async () => {
    backend.reply = async () => answer([card(1), card(2)]);
    await open('/child/kid1/explore/experience');
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Experience 1', 'Experience 2']);
    expect(links[0]).toHaveAttribute('href', `/child/kid1/explore/experience/${card(1).uuid}`);
    expect(links[1]).toHaveAttribute('href', `/child/kid1/explore/experience/${card(2).uuid}`);
    expect(within(articles()[0]).getAllByRole('link')).toHaveLength(1);
    expect(within(articles()[0]).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('loading', () => {
  it('shows placeholders on the first visit, then the cards in their place', async () => {
    let release;
    backend.reply = () => new Promise((resolve) => { release = () => resolve(answer([card(1)])); });
    render(<App path="/child/kid1/explore/experience" />);
    expect(await screen.findByRole('status', { name: 'Loading experiences' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('region', { name: 'Experiences' })).not.toBeInTheDocument();
    expect(screen.queryByText('No Experiences Yet')).not.toBeInTheDocument();

    await act(async () => release());
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();
    expect(articles()).toHaveLength(1);
  });

  it('shows the header at once, while the list is still loading', async () => {
    backend.reply = () => new Promise(() => {});
    render(<App path="/child/kid1/explore/experience" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Explore/ })).toBeInTheDocument();
  });

  it('shows no placeholder at all for an answer that comes quickly', async () => {
    backend.reply = async () => answer([card(1)]);
    await open('/child/kid1/explore/experience');
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();
  });

  it('a second visit shows the last answer at once, with no placeholder, then replaces it quietly', async () => {
    const user = userEvent.setup();
    backend.reply = async () => answer([card(1)]);
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();

    let release;
    backend.reply = () => new Promise((resolve) => { release = () => resolve(answer([card(1), card(2, { title: 'Brand new' })])); });
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    // drawn from the cache before the server has answered
    expect(articles()).toHaveLength(1);
    expect(screen.queryByRole('status', { name: 'Loading experiences' })).not.toBeInTheDocument();

    await act(async () => release());
    expect(articles()).toHaveLength(2);
    expect(screen.getByText('Brand new')).toBeInTheDocument();
  });

  it('an experience the admin took down is gone after the quiet refresh', async () => {
    const user = userEvent.setup();
    backend.reply = async () => answer([card(1), card(2)]);
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();

    backend.reply = async () => answer([card(2)]);
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(articles().map((a) => within(a).getByRole('heading', { level: 2 }).textContent)).toEqual(['Experience 2']);
  });

  it('another child starts from the placeholder, never from the first child\'s cache', async () => {
    backend.reply = async () => answer([card(1)]);
    const first = await open('/child/kid1/explore/experience');
    expect(articles()).toHaveLength(1);
    first.unmount();

    backend.reply = () => new Promise(() => {});
    render(<App path="/child/kid2/explore/experience" />);
    expect(await screen.findByRole('status', { name: 'Loading experiences' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Experiences' })).not.toBeInTheDocument();
  });
});

describe('nothing to show', () => {
  it('says there are no experiences yet (and it is not an error)', async () => {
    backend.reply = async () => answer([]);
    await open('/child/kid1/explore/experience');
    expect(screen.getByText('No Experiences Yet')).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Experiences' })).not.toBeInTheDocument();
  });

  it('still has the way back', async () => {
    backend.reply = async () => answer([]);
    await open('/child/kid1/explore/experience');
    expect(screen.getByRole('button', { name: /Back to Explore/ })).toBeInTheDocument();
  });
});

describe('when it cannot be loaded', () => {
  it('says so with the reason and offers Try again (and shows no popup)', async () => {
    backend.reply = async () => { throw new Error('Network Error'); };
    await open('/child/kid1/explore/experience');
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText('No Experiences Yet')).not.toBeInTheDocument();
    expect(popupOpen()).toBeFalsy();
  });

  it('shows the server\'s own message when it sent one', async () => {
    backend.reply = async () => { throw { response: { data: { message: 'Something went wrong on our side.' } }, message: 'x' }; };
    await open('/child/kid1/explore/experience');
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side.');
  });

  it('an answer that is not a list is a failed load, not an empty list', async () => {
    backend.reply = async () => ({ data: '<html>Bad gateway</html>' });
    await open('/child/kid1/explore/experience');
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load the experiences/i);
    expect(screen.queryByText('No Experiences Yet')).not.toBeInTheDocument();
  });

  it('Try again loads the list and replaces the message with the cards', async () => {
    const user = userEvent.setup();
    backend.reply = async () => { throw new Error('Network Error'); };
    await open('/child/kid1/explore/experience');

    backend.reply = async () => answer([card(1), card(2)]);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(articles()).toHaveLength(2);
    expect(backend.calls).toBe(2);
  });

  it('Try again that fails again keeps the message', async () => {
    const user = userEvent.setup();
    backend.reply = async () => { throw new Error('Network Error'); };
    await open('/child/kid1/explore/experience');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    expect(backend.calls).toBe(2);
  });

  it('while Try again is under way the message gives way to the placeholder', async () => {
    const user = userEvent.setup();
    backend.reply = async () => { throw new Error('Network Error'); };
    await open('/child/kid1/explore/experience');

    backend.reply = () => new Promise(() => {});
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByRole('status', { name: 'Loading experiences' })).toBeInTheDocument();
  });

  it('a refresh that fails behind real content stays silent and keeps the cards', async () => {
    const user = userEvent.setup();
    backend.reply = async () => answer([card(1), card(2)]);
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();

    backend.reply = async () => { throw new Error('Network Error'); };
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(articles()).toHaveLength(2);
    expect(popupOpen()).toBeFalsy();
  });

  it('a first failure does not stop a later visit from loading', async () => {
    const user = userEvent.setup();
    backend.reply = async () => { throw new Error('Network Error'); };
    await open('/child/kid1/explore');
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back to Explore/ }));
    await settle();
    backend.reply = async () => answer([card(1)]);
    await user.click(screen.getByRole('button', { name: 'Experience' }));
    await settle();
    expect(articles()).toHaveLength(1);
  });
});
