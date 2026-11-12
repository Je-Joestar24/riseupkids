/**
 * The preview screen: the page children see (title, videos, printable, closing message, no footer), the Laptop and
 * Phone buttons, and the way back.
 */
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../../config/theme';
import { emptyForm, emptyVideo } from '../../../../../utils/experienceForm';
import { previewFromForm } from '../../../../../utils/experiencePreview';
import ExperiencePreview from './ExperiencePreview';
import ExperiencePreviewPage from './ExperiencePreviewPage';

const LINK = (n) => `https://iframe.mediadelivery.net/embed/1/v${n}`;
const video = (n, overrides = {}) => ({ ...emptyVideo(), title: `Video ${n} name`, embedUrl: LINK(n), ...overrides });
const full = (overrides = {}) => ({
  ...emptyForm(),
  title: 'Strawberry Banana Smoothie',
  description: 'Learn the words, then make one.',
  videos: [video(1), video(2)],
  printable: { link: 'https://riseup.kids/a.pdf', button: 'Print recipe here' },
  ...overrides,
});

const wrap = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const page = (form, options) => wrap(<ExperiencePreviewPage preview={previewFromForm(form, options)} />);
const screenOf = (form, onBack = () => {}) => wrap(<ExperiencePreview form={form} onBack={onBack} />);

beforeAll(() => {
  URL.createObjectURL = vi.fn((file) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('the page', () => {
  it('shows the title, the description, each video by its name, the printable and the closing message', () => {
    page(full());
    expect(screen.getByRole('heading', { name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
    expect(screen.getByText('Learn the words, then make one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Video 1 name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Video 2 name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print recipe here' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You are learning, one step at a time.' })).toBeInTheDocument();
    expect(screen.getByText('Reach for the stars', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
  });

  it('shows NO footer and NO copyright line (the phone app does not)', () => {
    const { container } = page(full());
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(container.querySelector('footer')).toBeNull();
    expect(container.textContent).not.toMatch(/©|copyright|all rights reserved/i);
  });

  it('with no description it shows the app’s own two lines instead', () => {
    page(full({ description: '' }));
    expect(screen.getByText('Your child will be bilingual, naturally.')).toBeInTheDocument();
    expect(screen.getByText('How? By living the English language.')).toBeInTheDocument();
  });

  it('with a description, the app’s two lines are not shown', () => {
    page(full());
    expect(screen.queryByText('Your child will be bilingual, naturally.')).not.toBeInTheDocument();
  });

  it('keeps the line breaks of a description', () => {
    page(full({ description: 'First line\nSecond line' }));
    expect(screen.getByText(/First line/)).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('an empty title shows a stand-in', () => {
    page(full({ title: '' }));
    expect(screen.getByRole('heading', { name: 'Untitled experience' })).toBeInTheDocument();
  });

  it('with no videos it says so, with what to do', () => {
    page(full({ videos: [] }));
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(screen.getByText('Add at least one video to see it here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Play/ })).not.toBeInTheDocument();
  });

  it('draws one section per video, in order', () => {
    page(full({ videos: [video(1), video(2), video(3)] }));
    const names = screen.getAllByRole('button', { name: /^Play/ }).map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Play Video 1 name', 'Play Video 2 name', 'Play Video 3 name']);
  });

  it('loads no video player until one is tapped', () => {
    const { container } = page(full());
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('tapping play loads that video’s player, with autoplay', async () => {
    const user = userEvent.setup();
    const { container } = page(full());
    await user.click(screen.getByRole('button', { name: 'Play Video 1 name' }));
    const frames = container.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute('title', 'Video 1 name');
    expect(frames[0].getAttribute('src')).toBe(`${LINK(1)}?autoplay=true`);
    expect(screen.queryByRole('button', { name: 'Play Video 1 name' })).not.toBeInTheDocument();
  });

  it('keeps the rest of a link’s address when it adds autoplay', async () => {
    const user = userEvent.setup();
    const { container } = page(full({ videos: [video(1, { embedUrl: `${LINK(1)}?token=abc` })] }));
    await user.click(screen.getByRole('button', { name: 'Play Video 1 name' }));
    const src = new URL(container.querySelector('iframe').getAttribute('src'));
    expect(src.searchParams.get('token')).toBe('abc');
    expect(src.searchParams.get('autoplay')).toBe('true');
  });

  it('only one video plays at a time: starting another puts the first back to its play button', async () => {
    const user = userEvent.setup();
    const { container } = page(full());
    await user.click(screen.getByRole('button', { name: 'Play Video 1 name' }));
    await user.click(screen.getByRole('button', { name: 'Play Video 2 name' }));
    const frames = container.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute('title', 'Video 2 name');
    expect(screen.getByRole('button', { name: 'Play Video 1 name' })).toBeInTheDocument();
  });

  it('a video with no usable link shows its play button but cannot be pressed', async () => {
    const user = userEvent.setup();
    const { container } = page(full({ videos: [video(1, { embedUrl: 'https://example.com/x' })] }));
    expect(screen.queryByRole('button', { name: 'Play Video 1 name' })).not.toBeInTheDocument();
    expect(screen.getByText('Video 1 name')).toBeInTheDocument();
    await user.click(screen.getByText('Video 1 name'));
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('a player-address link plays', async () => {
    const user = userEvent.setup();
    const { container } = page(full({ videos: [video(1, { embedUrl: 'https://player.mediadelivery.net/embed/1/v1' })] }));
    await user.click(screen.getByRole('button', { name: 'Play Video 1 name' }));
    expect(container.querySelector('iframe').getAttribute('src')).toBe(`${LINK(1)}?autoplay=true`);
  });

  it('shows the printable with its picture and the button text', () => {
    page(full(), { printableImageSrc: 'https://cdn/p.png' });
    expect(screen.getByAltText('Strawberry Banana Smoothie printable')).toHaveAttribute('src', 'https://cdn/p.png');
    expect(screen.getByRole('button', { name: 'Print recipe here' })).toBeInTheDocument();
    expect(screen.queryByText('Picture goes here')).not.toBeInTheDocument();
  });

  it('with a link but no picture the printable has the app’s placeholder', () => {
    page(full());
    expect(screen.getByText('Printable')).toBeInTheDocument();
    expect(screen.getByText('Picture goes here')).toBeInTheDocument();
  });

  it('with no printable the section is left out', () => {
    page(full({ printable: { link: '', button: '' } }));
    expect(screen.queryByRole('region', { name: 'Printable' })).not.toBeInTheDocument();
    expect(screen.queryByText('Printable')).not.toBeInTheDocument();
  });

  it('the Print and Back to home buttons are only for show', async () => {
    const user = userEvent.setup();
    page(full());
    await user.click(screen.getByRole('button', { name: 'Print recipe here' }));
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(screen.getByRole('button', { name: 'Back to home' })).toHaveAttribute('title', 'Preview only');
  });

  it('uses the app’s colours for its sections', () => {
    page(full());
    const colour = (name) => getComputedStyle(screen.getByRole('region', { name })).backgroundColor;
    expect(colour('Title')).toBe('rgb(241, 235, 212)'); // cream
    expect(colour('Video 1 name')).toBe('rgb(209, 226, 223)'); // pale
    expect(colour('Video 2 name')).toBe('rgb(241, 235, 212)'); // cream
    expect(colour('Printable')).toBe('rgb(209, 226, 223)'); // pale
    expect(colour('Closing message')).toBe('rgb(250, 230, 218)'); // peach
  });
});

describe('the screen', () => {
  it('shows the laptop view first, with the Laptop and Phone buttons', () => {
    screenOf(full());
    expect(screen.getByRole('heading', { level: 1, name: 'Preview' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Preview size' });
    expect(within(group).getByRole('button', { name: 'Laptop preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Phone preview' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('region', { name: 'Preview of the experience on a laptop' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Preview of the experience on a phone' })).not.toBeInTheDocument();
  });

  it('Phone switches to the phone, Laptop switches back, and the page is the same in both', async () => {
    const user = userEvent.setup();
    screenOf(full());
    await user.click(screen.getByRole('button', { name: 'Phone preview' }));
    const phone = screen.getByRole('region', { name: 'Preview of the experience on a phone' });
    expect(within(phone).getByRole('heading', { name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Preview of the experience on a laptop' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Phone preview' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Laptop preview' }));
    const laptop = screen.getByRole('region', { name: 'Preview of the experience on a laptop' });
    expect(within(laptop).getByRole('heading', { name: 'Strawberry Banana Smoothie' })).toBeInTheDocument();
  });

  it('pressing the chosen button again keeps it chosen (one of the two is always on)', async () => {
    const user = userEvent.setup();
    screenOf(full());
    await user.click(screen.getByRole('button', { name: 'Laptop preview' }));
    expect(screen.getByRole('button', { name: 'Laptop preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Preview of the experience on a laptop' })).toBeInTheDocument();
  });

  it('the phone frame is 390 wide, like a phone, and the laptop frame is wider', async () => {
    const user = userEvent.setup();
    screenOf(full());
    await user.click(screen.getByRole('button', { name: 'Phone preview' }));
    const phoneFrame = screen.getByRole('region', { name: 'Preview of the experience on a phone' }).parentElement;
    expect(getComputedStyle(phoneFrame).width).toBe('390px');
  });

  it('neither view shows a footer or a copyright line', async () => {
    const user = userEvent.setup();
    const { container } = screenOf(full());
    expect(container.textContent).not.toMatch(/©|copyright/i);
    await user.click(screen.getByRole('button', { name: 'Phone preview' }));
    expect(container.textContent).not.toMatch(/©|copyright/i);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('says whether it is a draft or published', () => {
    screenOf(full({ isPublished: false }));
    expect(screen.getByText('Draft')).toBeInTheDocument();
    cleanup();
    screenOf(full({ isPublished: true }));
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('Back to editing tells the page', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    screenOf(full(), onBack);
    await user.click(screen.getByRole('button', { name: 'Back to editing' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('explains that the cover is not part of this page, and that nothing is saved by looking', () => {
    screenOf(full());
    expect(screen.getByText(/The cover picture is not part of this page/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is saved by looking at it/)).toBeInTheDocument();
  });

  it('a printable picture that was chosen but not saved is shown from the browser’s memory', () => {
    const file = new File(['x'], 'print.png', { type: 'image/png' });
    screenOf(full({ printableImage: { url: null, file, remove: false } }));
    expect(screen.getByAltText('Strawberry Banana Smoothie printable')).toHaveAttribute('src', 'blob:print.png');
  });

  it('a saved printable picture is shown, a removed one is not, and a new file wins over a saved one', () => {
    screenOf(full({ printableImage: { url: 'https://cdn/saved.png', file: null, remove: false } }));
    expect(screen.getByAltText('Strawberry Banana Smoothie printable')).toHaveAttribute('src', 'https://cdn/saved.png');
    cleanup();
    screenOf(full({ printableImage: { url: 'https://cdn/saved.png', file: null, remove: true } }));
    expect(screen.queryByAltText('Strawberry Banana Smoothie printable')).not.toBeInTheDocument();
    cleanup();
    const file = new File(['x'], 'new.png', { type: 'image/png' });
    screenOf(full({ printableImage: { url: 'https://cdn/saved.png', file, remove: true } }));
    expect(screen.getByAltText('Strawberry Banana Smoothie printable')).toHaveAttribute('src', 'blob:new.png');
  });

  it('releases a chosen picture from memory when it is closed', () => {
    const file = new File(['x'], 'gone.png', { type: 'image/png' });
    const view = screenOf(full({ printableImage: { url: null, file, remove: false } }));
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:gone.png');
  });
});
