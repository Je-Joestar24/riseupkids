/**
 * The drag-and-drop page's "Try again" button is 40% smaller on a touch phone held sideways, and exactly as
 * before everywhere else (computers, tablets, a phone held upright, the admin preview).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import { PHONE_LANDSCAPE_QUERY } from '../../../../hooks/usePlayerViewport';
import InteractiveTest from './InteractiveTest';

const page = {
  pageId: 'drag',
  type: 'activity_drag_2x1',
  interaction: {
    options: [{ optionId: 'o1', label: 'Cat' }],
    dropZones: [{ zoneId: 'z1', label: 'Home', correctOptionId: 'o1' }],
  },
};

const show = () =>
  render(
    <ThemeProvider theme={theme}>
      <InteractiveTest page={page} isPreloading={false} onPickOption={() => {}} onRetry={() => {}} onCorrectDrop={() => {}} />
    </ThemeProvider>
  );

/** What the browser is told for one element, split into "sideways phone only" and "everything else". */
const rulesFor = (element) => {
  const classes = [...element.classList].filter((name) => name.startsWith('css-'));
  const squash = (text) => text.replace(/\s+/g, ' ').trim();
  const phoneQuery = squash(`(${PHONE_LANDSCAPE_QUERY})`.replace(/^\(|\)$/g, ''));
  const out = { phone: [], other: [] };
  const walk = (rules, inPhone) => {
    for (const rule of rules) {
      if (rule.media) {
        const mine = squash(rule.media.mediaText) === phoneQuery;
        walk(rule.cssRules, inPhone || mine);
      } else if (classes.some((name) => (rule.selectorText || '').startsWith(`.${name}`))) {
        (inPhone ? out.phone : out.other).push(squash(rule.cssText));
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules, false);
    } catch {
      /* not readable */
    }
  }
  return out;
};

describe('drag-and-drop page: Try again button', () => {
  it('is 40% smaller (60% of its size), from its own corner, on a touch phone held sideways', () => {
    show();
    const rules = rulesFor(screen.getByRole('button', { name: 'Try again' }));
    const phone = rules.phone.join(' ');
    expect(phone).toContain('scale(0.6)');
    expect(phone).toMatch(/transform-origin: bottom right/);
  });

  it('is not changed anywhere else: no shrinking outside the sideways-phone rule', () => {
    show();
    const rules = rulesFor(screen.getByRole('button', { name: 'Try again' }));
    const rest = rules.other.join(' ');
    expect(rest).not.toContain('scale(');
    expect(rest).not.toContain('transform');
    // its usual size and place are still written as before
    expect(rest).toContain('116px');
    expect(rest).toContain('144px');
    expect(rest).toContain('right: 0.9375%');
    expect(rest).toContain('bottom: 5.1852%');
  });
});
