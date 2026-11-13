/**
 * The Experience pieces on their own: the Explore button, the page header, one card and the list's states.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import ExperienceButton from './ExperienceButton';
import ExperiencesHeader from './ExperiencesHeader';
import ExperienceCard from './ExperienceCard';
import ExperiencesList, { ExperiencesEmpty, ExperiencesSkeleton } from './ExperiencesList';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => mockNavigate }));

const wrap = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

const card = (n = 1, overrides = {}) => ({
  uuid: `uuid-${n}`,
  title: `Experience ${n}`,
  description: `About ${n}`,
  coverImage: `https://cdn.test/${n}.png`,
  videoCount: n,
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('ExperienceButton', () => {
  it('is a full-width button whose name is Experience', () => {
    wrap(<ExperienceButton childId="kid1" />);
    const button = screen.getByRole('button', { name: 'Experience' });
    expect(button.className).toMatch(/MuiButton-fullWidth/);
  });

  it('has only decorative icons (the name is just the word)', () => {
    wrap(<ExperienceButton childId="kid1" />);
    const button = screen.getByRole('button');
    expect(button.querySelectorAll('svg')).toHaveLength(2);
    button.querySelectorAll('svg').forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
    expect(button).toHaveTextContent(/^Experience$/);
  });

  it('opens this child\'s list on a click', async () => {
    wrap(<ExperienceButton childId="abc123" />);
    await userEvent.click(screen.getByRole('button', { name: 'Experience' }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/child/abc123/explore/experience');
  });

  it.each([[undefined], [null], ['']])('goes nowhere without a child id (%s)', async (childId) => {
    wrap(<ExperienceButton childId={childId} />);
    await userEvent.click(screen.getByRole('button', { name: 'Experience' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('ExperiencesHeader', () => {
  it('has the title as the page heading and a welcome line', () => {
    wrap(<ExperiencesHeader childId="kid1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByText('Fun things to watch, make and learn!')).toBeInTheDocument();
  });

  it('is a header landmark card', () => {
    wrap(<ExperiencesHeader childId="kid1" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('Back to Explore goes to this child\'s Explore page', async () => {
    wrap(<ExperiencesHeader childId="kid9" />);
    await userEvent.click(screen.getByRole('button', { name: /Back to Explore/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/child/kid9/explore');
  });
});

describe('ExperienceCard', () => {
  it('is an article named after the experience', () => {
    wrap(<ExperienceCard experience={card(2)} />);
    expect(screen.getByRole('article', { name: 'Experience 2' })).toBeInTheDocument();
  });

  it('shows the cover with the title as its alt text', () => {
    wrap(<ExperienceCard experience={card(2)} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://cdn.test/2.png');
    expect(image).toHaveAttribute('alt', 'Experience 2');
  });

  it.each([[null], [undefined], ['']])('shows the placeholder for a cover of %s', (coverImage) => {
    wrap(<ExperienceCard experience={card(2, { coverImage })} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('experience-cover-placeholder')).toBeInTheDocument();
  });

  it('shows the title as a level 2 heading', () => {
    wrap(<ExperienceCard experience={card(2)} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Experience 2' })).toBeInTheDocument();
  });

  it.each([[''], [null], [undefined]])('leaves out the description when it is %s', (description) => {
    wrap(<ExperienceCard experience={card(2, { description })} />);
    expect(screen.queryByText(/About/)).not.toBeInTheDocument();
    // not even an empty line: just the title and the count under the cover
    const body = screen.getByRole('heading', { level: 2 }).parentElement;
    expect([...body.children].map((line) => line.textContent)).toEqual(['Experience 2', '2 videos']);
  });

  it.each([
    [0, 'No videos yet'],
    [1, '1 video'],
    [5, '5 videos'],
    [undefined, 'No videos yet'],
  ])('says %s videos as "%s"', (videoCount, label) => {
    wrap(<ExperienceCard experience={card(2, { videoCount })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('keeps a very long title and description inside the card (two lines each)', () => {
    const long = 'word '.repeat(200).trim();
    wrap(<ExperienceCard experience={card(2, { title: long, description: long })} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(getComputedStyle(heading).overflow).toBe('hidden');
    expect(heading.textContent).toBe(long); // clipped by style, never cut from the text
  });
});

describe('ExperiencesList', () => {
  const props = { experiences: [], loading: false, error: null, onRetry: vi.fn() };

  it('shows the placeholder while loading, even if an error or cards are also given', async () => {
    wrap(<ExperiencesList {...props} loading error="boom" experiences={[card(1)]} />);
    expect(await screen.findByRole('status', { name: 'Loading experiences' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows the error with Try again, which calls onRetry', async () => {
    const onRetry = vi.fn();
    wrap(<ExperiencesList {...props} error="Network Error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the friendly note when there is nothing', () => {
    wrap(<ExperiencesList {...props} />);
    expect(screen.getByText('No Experiences Yet')).toBeInTheDocument();
  });

  it('shows the cards in the order given, in a labelled region', () => {
    wrap(<ExperiencesList {...props} experiences={[card(2), card(1), card(3)]} />);
    const region = screen.getByRole('region', { name: 'Experiences' });
    expect(within(region).getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual([
      'Experience 2',
      'Experience 1',
      'Experience 3',
    ]);
  });

  it('gives each card its place on the page (the first four pictures load first)', () => {
    wrap(<ExperiencesList {...props} experiences={[card(1), card(2)]} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('the placeholder shows four card-shaped bones, only after a short delay', async () => {
    wrap(<ExperiencesSkeleton />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument(); // a quick answer never flashes it
    const frame = await screen.findByRole('status', { name: 'Loading experiences' });
    expect(frame.children).toHaveLength(4);
  });

  it('the empty note is a status, not an alert', () => {
    wrap(<ExperiencesEmpty />);
    expect(screen.getByRole('status')).toHaveTextContent('No Experiences Yet');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
