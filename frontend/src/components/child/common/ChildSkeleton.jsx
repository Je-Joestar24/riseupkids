import React, { useEffect, useState } from 'react';
import { Box, Skeleton } from '@mui/material';

/** A response faster than this never shows a skeleton, so a quick load does not flash one frame. */
export const SKELETON_DELAY_MS = 150;

/** True once `delayMs` has passed since mount (immediately when 0). */
export const useAfterDelay = (delayMs = SKELETON_DELAY_MS) => {
  const [elapsed, setElapsed] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return undefined;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return elapsed;
};

/**
 * Wrapper for a page skeleton: announces itself to screen readers and appears only after a short
 * delay. Show it only on a first load (nothing cached yet); a refresh keeps the real content.
 */
export const SkeletonFrame = ({ label, delayMs = SKELETON_DELAY_MS, sx, children }) => {
  const visible = useAfterDelay(delayMs);

  if (!visible) return null;

  return (
    <Box role="status" aria-busy="true" aria-label={label} sx={sx}>
      {children}
    </Box>
  );
};

/** One grey placeholder shape. The pulse is switched off when the device asks for reduced motion. */
export const Bone = ({ sx, ...props }) => (
  <Skeleton
    variant="rounded"
    animation="pulse"
    sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' }, ...sx }}
    {...props}
  />
);

/**
 * A placeholder for one value inside a line of text (a name, a count). Until the delay has passed
 * it holds the line open with a blank, so the card does not change height when the bone appears.
 */
export const InlineBone = ({ width, sx }) => {
  const visible = useAfterDelay();

  if (!visible) return '\u00A0';
  return <Bone component="span" aria-hidden="true" sx={{ display: 'inline-block', width, height: '0.8em', verticalAlign: 'middle', ...sx }} />;
};
