import { useCallback, useEffect, useState } from 'react';

/**
 * Chrome + CloudFront can throw ERR_CACHE_OPERATION_NOT_SUPPORTED when a hidden
 * media preload partially caches a file, then the player requests the same URL.
 * A one-time cache-bust query param usually fixes playback.
 */
export const withMediaCacheBust = (url, nonce = Date.now()) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return url;
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}rukcb=${nonce}`;
};

/** Retry media once with a cache-bust param after ERR_CACHE_OPERATION_NOT_SUPPORTED. */
export const useMediaLoadRecovery = (url) => {
  const [src, setSrc] = useState(url || '');
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    setSrc(url || '');
    setRetried(false);
  }, [url]);

  const onMediaError = useCallback(() => {
    if (retried || !url) return;
    setRetried(true);
    setSrc(withMediaCacheBust(url));
  }, [retried, url]);

  return { src, onMediaError, retried };
};
