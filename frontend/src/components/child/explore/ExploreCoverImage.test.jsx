import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { aspectRatioOf } from '../../../test/aspectRatioOf';
import ExploreCoverImage, { resolveExploreCoverAspectRatio } from './ExploreCoverImage';

const picture = () => screen.getByRole('img');

/** The box around the picture, which is what takes the picture's shape. */
const box = () => picture().parentElement;

function loadWithSize(width, height) {
  const img = picture();
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height });
  fireEvent.load(img);
}

describe('resolveExploreCoverAspectRatio', () => {
  it('keeps 4:3 for a missing size, a 4:3 picture and anything taller', () => {
    expect(resolveExploreCoverAspectRatio(0, 0)).toBe('4 / 3');
    expect(resolveExploreCoverAspectRatio(800, 600)).toBe('4 / 3');
    expect(resolveExploreCoverAspectRatio(600, 800)).toBe('4 / 3');
  });

  it('uses the picture’s own shape when it is wider than 4:3', () => {
    expect(resolveExploreCoverAspectRatio(1600, 900)).toBe('1600 / 900');
  });
});

describe('ExploreCoverImage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts at 4:3 and takes a wide picture’s shape once it has loaded', () => {
    render(<ExploreCoverImage src="/wide.png" alt="Wide" />);
    expect(aspectRatioOf(box())).toBe('4 / 3');

    loadWithSize(1600, 900);

    expect(aspectRatioOf(box())).toBe('1600 / 900');
  });

  it('goes back to 4:3 when the box gets a different picture, until that one has loaded', () => {
    const { rerender } = render(<ExploreCoverImage src="/wide.png" alt="Cover" />);
    loadWithSize(1600, 900);
    expect(aspectRatioOf(box())).toBe('1600 / 900');

    rerender(<ExploreCoverImage src="/other.png" alt="Cover" />);
    expect(aspectRatioOf(box())).toBe('4 / 3');

    loadWithSize(1000, 500);
    expect(aspectRatioOf(box())).toBe('1000 / 500');
  });

  it('measures a picture the browser already had, without waiting for a load event', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1920);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(1080);

    render(<ExploreCoverImage src="/cached.png" alt="Cached" />);

    expect(aspectRatioOf(box())).toBe('1920 / 1080');
  });

  it('passes the picture’s position on the page on, so later covers wait their turn', () => {
    vi.useFakeTimers();
    render(<ExploreCoverImage src="/late.png" alt="Late" index={6} />);

    expect(screen.queryByRole('img')).toBeNull();
    vi.useRealTimers();
  });

  it('shows its overlay content, and just the empty box, when there is no picture', () => {
    const { container } = render(
      <ExploreCoverImage src={null} alt="None">
        <span>Duration badge</span>
      </ExploreCoverImage>
    );

    expect(screen.getByText('Duration badge')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
