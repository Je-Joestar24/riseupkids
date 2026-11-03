import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { imageLoadPlan } from '../../../utils/remoteImage';

const FADE_IN_MS = 150;

/**
 * A picture from the server that loads in the order of its position on the page (see
 * utils/remoteImage.js) and fades in once it has arrived. Until then it draws nothing, so the box
 * around it (which must already have its final size) shows through and the layout does not jump.
 *
 * `index` is the picture's position on the page (0 = first). `onLoad` and `imgRef` are for callers
 * that need the loaded picture's size.
 */
const RemoteImage = ({ src, alt, index = 0, sx, onLoad, imgRef, ...rest }) => {
  const { delayMs, priority } = imageLoadPlan(index);
  const [started, setStarted] = useState(delayMs === 0);
  const [loaded, setLoaded] = useState(false);
  const elementRef = useRef(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (started) return undefined;
    const timer = setTimeout(() => setStarted(true), delayMs);
    return () => clearTimeout(timer);
  }, [started, delayMs]);

  // A new picture in the same place starts from the placeholder again.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const setElement = useCallback(
    (element) => {
      elementRef.current = element;
      if (typeof imgRef === 'function') imgRef(element);
      else if (imgRef) imgRef.current = element;
    },
    [imgRef]
  );

  // A picture already in the browser cache can be complete before its load event reaches us.
  useEffect(() => {
    const element = elementRef.current;
    if (started && element?.complete && element.naturalWidth) {
      setLoaded(true);
      onLoadRef.current?.({ currentTarget: element });
    }
  }, [started, src]);

  if (!started || !src) return null;

  return (
    <Box
      component="img"
      ref={setElement}
      src={src}
      alt={alt}
      loading={priority === 'high' ? 'eager' : 'lazy'}
      fetchPriority={priority}
      decoding="async"
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      sx={{
        opacity: loaded ? 1 : 0,
        transition: `opacity ${FADE_IN_MS}ms ease`,
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...sx,
      }}
      {...rest}
    />
  );
};

export default RemoteImage;
