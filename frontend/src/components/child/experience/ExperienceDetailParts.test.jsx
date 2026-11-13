/**
 * The building blocks of the experience detail page on their own: the band, the pill button, one video, the "not
 * available" and "could not load" screens, and the skeleton.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import { readResponsiveCss } from '../../../test/readResponsiveCss';
import ExperienceBackButton from './ExperienceBackButton';
import ExperienceBand from './ExperienceBand';
import ExperiencePillButton from './ExperiencePillButton';
import ExperienceVideoBlock from './ExperienceVideoBlock';
import { ExperienceDetailSkeleton, ExperienceLoadFailed, ExperienceNotFound } from './ExperienceDetailStates';

afterEach(() => cleanup());

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const wrap = (ui, path = '/child/kid1/explore/experience/u1') =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('ExperienceBand', () => {
  it('is a region named by its label, with its content inside', () => {
    wrap(
      <ExperienceBand color="#d1e2df" label="Videos">
        <p>Inside</p>
      </ExperienceBand>
    );
    expect(within(screen.getByRole('region', { name: 'Videos' })).getByText('Inside')).toBeInTheDocument();
  });

  it('takes the colour it is given', () => {
    wrap(<ExperienceBand color="rgb(209, 226, 223)" label="Videos">x</ExperienceBand>);
    expect(getComputedStyle(screen.getByRole('region', { name: 'Videos' })).backgroundColor).toBe('rgb(209, 226, 223)');
  });

  it('a compact band is shorter than a normal one', () => {
    wrap(
      <>
        <ExperienceBand color="#fff" label="Normal">x</ExperienceBand>
        <ExperienceBand color="#fff" label="Short" compact>x</ExperienceBand>
      </>
    );
    const padding = (name) => readResponsiveCss(screen.getByRole('region', { name })).desktop['padding-top'];
    expect(padding('Normal')).toBe('40px');
    expect(padding('Short')).toBe('20px');
  });
});

describe('ExperiencePillButton', () => {
  it('without an address it is a button and calls onClick', async () => {
    const onClick = vi.fn();
    wrap(<ExperiencePillButton color="#f2af10" label="Back to home" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('with an address it is a link that opens in a new tab, safely', () => {
    wrap(<ExperiencePillButton color="#e98a68" label="Print" href="https://riseup.kids/a.pdf" />);
    const link = screen.getByRole('link', { name: 'Print' });
    expect(link).toHaveAttribute('href', 'https://riseup.kids/a.pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows its icon next to the label, hidden from screen readers by the icon itself', () => {
    wrap(<ExperiencePillButton color="#e98a68" label="Print" icon={<svg data-testid="icon" aria-hidden="true" />} onClick={() => {}} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });
});

describe('ExperienceVideoBlock', () => {
  const video = { key: 'a', title: 'The story', url: 'https://iframe.mediadelivery.net/embed/1/abc', playable: true, band: '#d1e2df' };

  it('a playable video is a play button named after it, and no player yet', () => {
    wrap(<ExperienceVideoBlock video={video} playing={false} onPlay={() => {}} />);
    expect(screen.getByRole('button', { name: 'Play The story' })).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('pressing play tells the page which video was chosen', async () => {
    const onPlay = vi.fn();
    wrap(<ExperienceVideoBlock video={video} playing={false} onPlay={onPlay} />);
    await userEvent.click(screen.getByRole('button', { name: 'Play The story' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('a playing video is the player (autoplay on) and no longer a play button', () => {
    wrap(<ExperienceVideoBlock video={video} playing onPlay={() => {}} />);
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(new URL(iframe.getAttribute('src')).searchParams.get('autoplay')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Play The story' })).not.toBeInTheDocument();
  });

  it('a video that cannot be played shows its title but never a play button or a player', () => {
    wrap(<ExperienceVideoBlock video={{ ...video, playable: false, url: '' }} playing onPlay={() => {}} />);
    expect(screen.getByRole('img', { name: 'The story' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('ExperienceBackButton', () => {
  it("is an arrow button named Back to Experiences that goes to this child's list", async () => {
    wrap(<ExperienceBackButton childId="kid1" />);
    const button = screen.getByRole('button', { name: 'Back to Experiences' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(button);
    expect(screen.getByTestId('where').textContent).toBe('/child/kid1/explore/experience');
  });
});

describe('ExperienceNotFound', () => {
  it('says so, and has Back to Experiences and See all experiences, both going to the list', async () => {
    wrap(<ExperienceNotFound childId="kid1" />);
    expect(screen.getByRole('heading', { level: 1, name: 'This experience is not available' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See all experiences' }));
    expect(screen.getByTestId('where').textContent).toBe('/child/kid1/explore/experience');
  });

  it('has nothing to try again', () => {
    wrap(<ExperienceNotFound childId="kid1" />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});

describe('ExperienceLoadFailed', () => {
  it('shows the message and Try again, and Try again calls back', async () => {
    const onRetry = vi.fn();
    wrap(<ExperienceLoadFailed childId="kid1" message="Network Error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('still has the way back to the list', async () => {
    wrap(<ExperienceLoadFailed childId="kid1" message="x" onRetry={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Back to Experiences/ }));
    expect(screen.getByTestId('where').textContent).toBe('/child/kid1/explore/experience');
  });
});

describe('ExperienceDetailSkeleton', () => {
  it('has the way back from the first moment', () => {
    wrap(<ExperienceDetailSkeleton childId="kid1" />);
    expect(screen.getByRole('button', { name: /Back to Experiences/ })).toBeInTheDocument();
  });

  it('holds back the placeholders for a moment (so a quick answer never flashes them)', () => {
    wrap(<ExperienceDetailSkeleton childId="kid1" />);
    expect(screen.queryByRole('status', { name: 'Loading experience' })).not.toBeInTheDocument();
  });
});
