/**
 * The reward pop-ups were too big on a phone (2.2rem title, 2.4rem stars, a 1.5rem button). On a phone they now
 * shrink with the screen; from a tablet up they keep their old sizes.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import { readResponsiveCss } from '../../../test/readResponsiveCss';
import CmsCompletionDialog from './cmsCompletionDialog';
import RewardStarIcon from './RewardStarIcon';
import { rewardFont, rewardBox, rewardPaperSx } from './rewardDialogStyles';

const wrap = (node) => render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe('the reward helpers', () => {
  it('a text is fluid on a phone and keeps its old size from a tablet up', () => {
    const font = rewardFont(22, 26, '2.5rem');
    expect(font.fontSize.xs).toMatch(/^clamp\(22px,.*26px\)$/);
    expect(font.fontSize.sm).toBe('2.5rem');
  });

  it('an icon is fluid on a phone and keeps its old size from a tablet up', () => {
    const box = rewardBox(34, 40, 52);
    expect(box.width.xs).toMatch(/^clamp\(34px,.*40px\)$/);
    expect(box.width.sm).toBe(52);
    expect(box.height.sm).toBe(52);
  });

  it('the card sits closer to the edge on a phone', () => {
    expect(rewardPaperSx.m.xs).toBe('12px');
    expect(rewardPaperSx.m.sm).toBe('32px');
  });
});

describe('the book reward pop-up on a phone', () => {
  it('shows the stars it was given, with a phone-sized title and a smaller big "+N"', () => {
    wrap(
      <CmsCompletionDialog
        open
        onClose={() => {}}
        data={{ score: 3, maxScore: 3, starsAwarded: true, starsToAward: 2, totalStars: 12, readingCount: 6, requiredReadingCount: 5, requirementMet: true }}
      />
    );
    const title = document.querySelector('.MuiDialogTitle-root');
    const plus = [...document.querySelectorAll('h4')].find((el) => el.textContent === '+2');
    expect(title).not.toBeNull();
    expect(plus).toBeTruthy();

    const titleCss = readResponsiveCss(title);
    const plusCss = readResponsiveCss(plus);
    expect(titleCss.phone['font-size']).toMatch(/clamp\(22px/);
    expect(titleCss.desktop['font-size']).toBe('2.2rem');
    expect(plusCss.phone['font-size']).toMatch(/clamp\(26px/);
    expect(plusCss.desktop['font-size']).toBe('2.4rem');
  });
});

describe('the video reward star', () => {
  it('is a phone-sized star that is 52px from a tablet up', () => {
    const { container } = wrap(<RewardStarIcon min={34} max={40} desktop={52} />);
    const css = readResponsiveCss(container.querySelector('svg'));
    expect(css.phone.width).toMatch(/clamp\(34px/);
    expect(css.desktop.width).toBe('52px');
    expect(css.desktop.height).toBe('52px');
  });
});
