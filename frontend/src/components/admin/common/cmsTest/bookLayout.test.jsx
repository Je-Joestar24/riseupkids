/**
 * The book pages are shared by the child player and the admin preview, so the phone work on them must not
 * change anything for a computer. This records today's base layout and checks that every phone change is
 * written as a rule that only applies to a touch phone held sideways.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import { pageFrameSx, phoneLandscapeOnly } from './shared';
import { PHONE_LANDSCAPE_QUERY } from '../../../../hooks/usePlayerViewport';
import ContentTest from './ContentTest';

vi.mock('../../../../utils/cmsMediaPlayback', () => ({ useMediaLoadRecovery: () => ({ onError: () => {} }) }));

const page = {
  type: 'content',
  id: 'c1',
  title: 'Content',
  readingText: 'The little rocket flew over the sleepy town.',
};

const show = (pageProps = page) =>
  render(
    <ThemeProvider theme={theme}>
      <ContentTest page={pageProps} hasPrev hasNext onPrev={() => {}} onNext={() => {}} />
    </ThemeProvider>
  );

const allCss = () =>
  Array.from(document.querySelectorAll('style'))
    .map((style) => style.textContent)
    .join('\n');

/** The text of every `@media` block whose condition is the phone-sideways one. */
const phoneBlocks = () => {
  const css = allCss();
  const header = `@media ${PHONE_LANDSCAPE_QUERY.replace(/\s+/g, ' ')}`;
  const blocks = [];
  let from = 0;
  const normal = css.replace(/\s+/g, ' ');
  while (true) {
    const start = normal.indexOf(header, from);
    if (start === -1) break;
    const open = normal.indexOf('{', start);
    let depth = 1;
    let i = open + 1;
    while (i < normal.length && depth > 0) {
      if (normal[i] === '{') depth += 1;
      if (normal[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push(normal.slice(open + 1, i - 1));
    from = i;
  }
  return blocks;
};
const withoutPhoneBlocks = () => {
  let css = allCss().replace(/\s+/g, ' ');
  const header = `@media ${PHONE_LANDSCAPE_QUERY.replace(/\s+/g, ' ')}`;
  let start = css.indexOf(header);
  while (start !== -1) {
    const open = css.indexOf('{', start);
    let depth = 1;
    let i = open + 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') depth -= 1;
      i += 1;
    }
    css = css.slice(0, start) + css.slice(i);
    start = css.indexOf(header);
  }
  return css;
};

describe('the book page frame (today)', () => {
  it('keeps its 16:9 sizing rules exactly', () => {
    expect(pageFrameSx).toMatchObject({
      width: 'min(100%, calc(100dvh * 16 / 9))',
      height: 'min(100dvh, calc(100vw * 9 / 16))',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      aspectRatio: '1920 / 1080',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#ffffff',
    });
  });
});

describe('phoneLandscapeOnly', () => {
  it('wraps styles in the touch-phone-held-sideways media query and nothing else', () => {
    const wrapped = phoneLandscapeOnly({ width: 8 });

    expect(Object.keys(wrapped)).toEqual([`@media ${PHONE_LANDSCAPE_QUERY}`]);
    expect(wrapped[`@media ${PHONE_LANDSCAPE_QUERY}`]).toEqual({ width: 8 });
  });

  it('is the same test as the hook, and needs a finger, no hover, sideways and a short screen', () => {
    expect(PHONE_LANDSCAPE_QUERY).toContain('(hover: none)');
    expect(PHONE_LANDSCAPE_QUERY).toContain('(pointer: coarse)');
    expect(PHONE_LANDSCAPE_QUERY).toContain('(orientation: landscape)');
    expect(PHONE_LANDSCAPE_QUERY).toMatch(/\(max-height: \d+px\)/);
  });
});

describe('the content page', () => {
  it('keeps its usual (computer) sizes as the base rules, outside the phone block', () => {
    show();

    // MUI writes {xs, md} values as media rules, which jsdom does not apply, so the CSS text is read instead
    const rest = withoutPhoneBlocks().replace(/:\s+/g, ':');
    expect(rest).toContain('width:176px'); // logo
    expect(rest).toContain('width:240px'); // logo from 900px wide
    expect(rest).toContain('width:10px'); // dots
    expect(rest).toContain('width:14px');
    expect(rest).toContain('font-size:1.7rem'); // reading text
    expect(rest).toContain('font-size:2.4rem');
    expect(window.getComputedStyle(screen.getByAltText('Rise Up Kids logo')).height).toBe('auto');
  });

  it('keeps the size set in the book (up to 72px) as the base rule, and only scales it in the phone block', () => {
    show({ ...page, reading: { fontSizePx: 48 } });

    // the rules of this very element (earlier tests leave their own CSS in the document)
    const classes = screen.getByLabelText('Content subtitle').className.split(' ').filter((name) => name.startsWith('css-'));
    const rulesOf = (css) => classes.flatMap((name) => css.match(new RegExp(`\.${name}\{[^}]*\}`, 'g')) || []).join(' ');
    const base = rulesOf(withoutPhoneBlocks().replace(/:\s+/g, ':'));
    const phone = rulesOf(phoneBlocks().join(' ').replace(/:\s+/g, ':'));

    expect(base).toContain('font-size:48px');
    expect(base).not.toContain('dvh');
    expect(phone).toContain('font-size:max(15px, calc(48px * 100dvh / 720))');
  });

  it('has its phone rules only inside the sideways-phone media block', () => {
    show();

    const blocks = phoneBlocks();
    const phoneCss = blocks.join(' ');
    expect(blocks.length).toBeGreaterThan(0);
    expect(phoneCss).toContain('24dvh'); // logo
    expect(phoneCss).toContain('clamp(15px, 5.4dvh, 24px)'); // reading text
    expect(phoneCss).toMatch(/width: ?8px/); // dots

    // and not one of them is also written outside it
    const rest = withoutPhoneBlocks();
    expect(rest).not.toContain('24dvh');
    expect(rest).not.toContain('clamp(15px, 5.4dvh, 24px)');
  });
});
