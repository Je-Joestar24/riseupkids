import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import RemoteImage from './RemoteImage';

const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const picture = () => screen.queryByRole('img');

describe('RemoteImage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('a picture near the top of the page', () => {
    it('is on the page at once, loaded early with high priority', () => {
      render(<RemoteImage src="/a.png" alt="Cover" index={0} />);

      const img = picture();
      expect(img).toHaveAttribute('src', '/a.png');
      expect(img).toHaveAttribute('loading', 'eager');
      expect(img).toHaveAttribute('fetchpriority', 'high');
      expect(img).toHaveAttribute('decoding', 'async');
    });

    it('treats the first four positions the same way', () => {
      render(
        <>
          {[0, 1, 2, 3].map((i) => (
            <RemoteImage key={i} src={`/p${i}.png`} alt={`P${i}`} index={i} />
          ))}
        </>
      );

      expect(screen.getAllByRole('img')).toHaveLength(4);
      screen.getAllByRole('img').forEach((img) => expect(img).toHaveAttribute('fetchpriority', 'high'));
    });

    it('defaults to the first position', () => {
      render(<RemoteImage src="/a.png" alt="Cover" />);

      expect(picture()).toHaveAttribute('fetchpriority', 'high');
    });
  });

  describe('a picture further down the page', () => {
    it('is not requested until its turn, then loads lazily with low priority', async () => {
      render(<RemoteImage src="/a.png" alt="Cover" index={4} />);
      expect(picture()).toBeNull();

      await tick(149);
      expect(picture()).toBeNull();

      await tick(1);
      expect(picture()).toHaveAttribute('loading', 'lazy');
      expect(picture()).toHaveAttribute('fetchpriority', 'low');
    });

    it('waits one step longer for each position, up to 1.5 s', async () => {
      render(
        <>
          <RemoteImage src="/five.png" alt="Five" index={5} />
          <RemoteImage src="/far.png" alt="Far" index={90} />
        </>
      );

      await tick(299);
      expect(screen.queryByAltText('Five')).toBeNull();
      await tick(1);
      expect(screen.getByAltText('Five')).toBeInTheDocument();

      await tick(1199);
      expect(screen.queryByAltText('Far')).toBeNull();
      await tick(1);
      expect(screen.getByAltText('Far')).toBeInTheDocument();
    });

    it('leaves no timer running when it is closed before its turn', async () => {
      const { unmount } = render(<RemoteImage src="/a.png" alt="Cover" index={9} />);
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('leaves no timer running once it has started', async () => {
      render(<RemoteImage src="/a.png" alt="Cover" index={6} />);

      await tick(2000);

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('showing the picture', () => {
    it('stays invisible (so the box behind it shows) until it has loaded, then fades in', () => {
      render(<RemoteImage src="/a.png" alt="Cover" />);
      expect(picture()).toHaveStyle({ opacity: '0' });

      fireEvent.load(picture());

      expect(picture()).toHaveStyle({ opacity: '1' });
    });

    it('stays invisible if the picture cannot be loaded', () => {
      render(<RemoteImage src="/missing.png" alt="Cover" />);

      fireEvent.error(picture());

      expect(picture()).toHaveStyle({ opacity: '0' });
    });

    it('starts again from invisible when the same place gets a different picture', () => {
      const { rerender } = render(<RemoteImage src="/a.png" alt="Cover" />);
      fireEvent.load(picture());
      expect(picture()).toHaveStyle({ opacity: '1' });

      rerender(<RemoteImage src="/b.png" alt="Cover" />);

      expect(picture()).toHaveAttribute('src', '/b.png');
      expect(picture()).toHaveStyle({ opacity: '0' });
    });

    it('shows a picture the browser already has, even if no load event reaches it', () => {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640);
      const onLoad = vi.fn();

      render(<RemoteImage src="/cached.png" alt="Cover" onLoad={onLoad} />);

      expect(picture()).toHaveStyle({ opacity: '1' });
      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('renders nothing when there is no address', () => {
      const { container } = render(<RemoteImage src={null} alt="Cover" />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('for pages that need the picture itself', () => {
    it('passes the load event to onLoad', () => {
      let loadedElement = null;
      const onLoad = vi.fn((event) => {
        loadedElement = event.currentTarget;
      });
      render(<RemoteImage src="/a.png" alt="Cover" onLoad={onLoad} />);

      fireEvent.load(picture());

      expect(onLoad).toHaveBeenCalledTimes(1);
      expect(loadedElement).toBe(picture());
    });

    it('hands the picture element to imgRef, as an object or a function', () => {
      const objectRef = { current: null };
      const { unmount } = render(<RemoteImage src="/a.png" alt="Cover" imgRef={objectRef} />);
      expect(objectRef.current).toBe(picture());
      unmount();

      const callbackRef = vi.fn();
      render(<RemoteImage src="/a.png" alt="Cover" imgRef={callbackRef} />);
      expect(callbackRef).toHaveBeenCalledWith(picture());
    });

    it('applies the style it is given and keeps its own fade', () => {
      render(<RemoteImage src="/a.png" alt="Cover" sx={{ objectFit: 'cover', width: '100%' }} />);

      expect(picture()).toHaveStyle({ objectFit: 'cover', width: '100%' });
      fireEvent.load(picture());
      expect(picture()).toHaveStyle({ opacity: '1' });
    });
  });
});
