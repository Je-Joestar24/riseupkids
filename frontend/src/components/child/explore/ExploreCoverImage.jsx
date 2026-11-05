import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import RemoteImage from '../common/RemoteImage';
import { EXPLORE_COVER_ASPECT_RATIO } from '../../../constants/exploreVideoTypes';

const DEFAULT_ASPECT = EXPLORE_COVER_ASPECT_RATIO;

/** Wider than 4:3 landscape — use the image's own aspect so full width is shown. */
const MAX_WIDE_WIDTH_TO_HEIGHT = 4 / 3;

/**
 * Pick container aspect: wide images use natural ratio (full width, no side crop);
 * taller images cap at 4:3 and crop top/bottom only.
 */
export function resolveExploreCoverAspectRatio(naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight) return DEFAULT_ASPECT;
  const widthToHeight = naturalWidth / naturalHeight;
  if (widthToHeight > MAX_WIDE_WIDTH_TO_HEIGHT) {
    return `${naturalWidth} / ${naturalHeight}`;
  }
  return DEFAULT_ASPECT;
}

/**
 * Explore video cover — full card width, height fits image (no empty band),
 * vertical overflow cropped when the image is taller than 4:3.
 */
const ExploreCoverImage = ({
  src,
  alt,
  children,
  backgroundColor = '#f0f0f0',
  containerSx = {},
  imageSx = {},
  index = 0,
  phoneHeight = null, // phones only: a fixed picture height in px (like the app) instead of the usual proportions
}) => {
  const [measured, setMeasured] = useState(null);
  const aspectRatio =
    measured?.src === src
      ? resolveExploreCoverAspectRatio(measured.width, measured.height)
      : DEFAULT_ASPECT;

  const handleLoad = useCallback(
    (event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      setMeasured({ src, width: naturalWidth, height: naturalHeight });
    },
    [src]
  );

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        ...(phoneHeight
          ? { aspectRatio: { xs: 'auto', sm: aspectRatio }, height: { xs: `${phoneHeight}px`, sm: 'auto' } }
          : { aspectRatio }),
        overflow: 'hidden',
        backgroundColor,
        ...containerSx,
      }}
    >
      {src ? (
        <RemoteImage
          src={src}
          alt={alt}
          index={index}
          onLoad={handleLoad}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            ...imageSx,
          }}
        />
      ) : null}
      {children}
    </Box>
  );
};

export default ExploreCoverImage;
