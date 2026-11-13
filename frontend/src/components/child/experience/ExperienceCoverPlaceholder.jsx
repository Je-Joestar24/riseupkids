import React from 'react';
import { Box } from '@mui/material';

/**
 * Three colour sets for the picture shown when an experience has no cover. Cards take them in turn (by their place in the
 * list), so a row of cover-less experiences looks lively instead of repeating one grey box. All colours are the child
 * pages' own (cream, peach, pale green, coral, yellow, teal).
 */
export const COVER_PALETTES = Object.freeze([
  { from: '#fde8de', to: '#f1ebd4', main: '#e98a68', accent: '#f2af10', dot: '#85c2b9' },
  { from: '#d1e2df', to: '#f1ebd4', main: '#5aa79b', accent: '#f2af10', dot: '#e98a68' },
  { from: '#fff3c9', to: '#fde8de', main: '#f2af10', accent: '#e98a68', dot: '#85c2b9' },
]);

/** The palette for a card in place `index` (wraps around, and tolerates a missing or odd index). */
export const coverPalette = (index) => COVER_PALETTES[((Number.isInteger(index) ? index : 0) % COVER_PALETTES.length + COVER_PALETTES.length) % COVER_PALETTES.length];

/**
 * A cheerful, clean picture for an experience with no cover: a soft gradient, a bright round badge with a white sparkle
 * in the middle, and a few small stars and dots around it. It fills its (positioned) parent and is only decoration, so
 * screen readers skip it (the card's title says what it is).
 */
const ExperienceCoverPlaceholder = ({ index = 0 }) => {
  const { from, to, main, accent, dot } = coverPalette(index);

  return (
    <Box
      data-testid="experience-cover-placeholder"
      aria-hidden="true"
      sx={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        focusable="false"
        style={{ display: 'block' }}
      >
        <circle cx="160" cy="100" r="62" fill="#fff" opacity="0.55" />
        <circle cx="160" cy="100" r="40" fill={main} />
        <path d="M160 78 L166.5 93.5 L182 100 L166.5 106.5 L160 122 L153.5 106.5 L138 100 L153.5 93.5 Z" fill="#fff" />
        <path d="M62 32 L66.5 43.5 L78 48 L66.5 52.5 L62 64 L57.5 52.5 L46 48 L57.5 43.5 Z" fill={accent} />
        <path d="M70 138 L73 146 L81 149 L73 152 L70 160 L67 152 L59 149 L67 146 Z" fill={main} opacity="0.85" />
        <circle cx="262" cy="46" r="9" fill={dot} />
        <circle cx="254" cy="152" r="6" fill={accent} opacity="0.9" />
        <circle cx="286" cy="104" r="4" fill={main} opacity="0.7" />
      </svg>
    </Box>
  );
};

export default ExperienceCoverPlaceholder;
