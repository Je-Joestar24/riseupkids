import React, { createContext, useContext, useRef } from 'react';

/**
 * How a book page finds the local copy of a sound or video.
 *
 * The reader puts a resolver here; a page asks it for the address to play. With no reader around (the admin
 * preview, a test) the default hands the address back unchanged, so those pages behave exactly as before.
 */
const identity = (url) => url;
const CmsMediaSrcContext = createContext(identity);

export const CmsMediaSrcProvider = ({ resolve, children }) => (
  <CmsMediaSrcContext.Provider value={resolve || identity}>{children}</CmsMediaSrcContext.Provider>
);

/** A function `(url) => address to play`. Its identity never changes while the reader is open. */
export const useCmsMediaResolver = () => useContext(CmsMediaSrcContext);

/**
 * The address a media element should use for `url`: the local copy if the reader has one *when the element first
 * asks*. It is then kept for as long as the same `url` is asked for. A copy that arrives while a sound is already
 * playing from the internet must not swap the source under it (the sound would restart).
 */
export const useCmsMediaSrc = (url) => {
  const resolve = useCmsMediaResolver();
  const chosen = useRef({ url: undefined, src: '' });
  if (chosen.current.url !== url) {
    chosen.current = { url, src: url ? resolve(url) : url };
  }
  return chosen.current.src;
};
