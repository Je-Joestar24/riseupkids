/**
 * The picture shown for an experience with no cover: decoration only, three colour sets taken in turn.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ExperienceCoverPlaceholder, { COVER_PALETTES, coverPalette } from './ExperienceCoverPlaceholder';

afterEach(() => cleanup());

describe('coverPalette', () => {
  it('takes the three colour sets in turn, then starts over', () => {
    expect(COVER_PALETTES).toHaveLength(3);
    expect([0, 1, 2, 3, 4, 5].map((i) => COVER_PALETTES.indexOf(coverPalette(i)))).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it.each([[undefined], [null], ['x'], [-1], [1.5], [NaN]])('never fails for the place %j', (index) => {
    expect(COVER_PALETTES).toContain(coverPalette(index));
  });
});

describe('ExperienceCoverPlaceholder', () => {
  it('is decoration: hidden from screen readers, with no picture role and nothing to read', () => {
    render(<ExperienceCoverPlaceholder index={0} />);
    const art = screen.getByTestId('experience-cover-placeholder');
    expect(art).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(art).toHaveTextContent('');
  });

  it("uses its place's colours, so neighbours differ", () => {
    const { container, rerender } = render(<ExperienceCoverPlaceholder index={0} />);
    const badge = () => container.querySelector('svg circle[r="40"]').getAttribute('fill');
    expect(badge()).toBe(COVER_PALETTES[0].main);
    rerender(<ExperienceCoverPlaceholder index={1} />);
    expect(badge()).toBe(COVER_PALETTES[1].main);
    expect(COVER_PALETTES[0].main).not.toBe(COVER_PALETTES[1].main);
  });
});
