import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
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
}) => {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  const imgRef = useRef(null);

  const applyNaturalAspect = useCallback((naturalWidth, naturalHeight) => {
    setAspectRatio(resolveExploreCoverAspectRatio(naturalWidth, naturalHeight));
  }, []);

  useEffect(() => {
    setAspectRatio(DEFAULT_ASPECT);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) {
      applyNaturalAspect(img.naturalWidth, img.naturalHeight);
    }
  }, [src, applyNaturalAspect]);

  const handleLoad = useCallback(
    (event) => {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      applyNaturalAspect(naturalWidth, naturalHeight);
    },
    [applyNaturalAspect]
  );

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        overflow: 'hidden',
        backgroundColor,
        ...containerSx,
      }}
    >
      {src ? (
        <Box
          component="img"
          ref={imgRef}
          src={src}
          alt={alt}
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
