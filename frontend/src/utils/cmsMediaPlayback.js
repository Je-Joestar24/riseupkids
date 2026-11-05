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

/**
 * Retry media once after an error. Normally that is the same address with a cache-bust param
 * (ERR_CACHE_OPERATION_NOT_SUPPORTED). When `url` is the reader's local copy (a `blob:` address, which takes no
 * query), the retry is the original internet address, `fallbackUrl`, instead.
 */
export const useMediaLoadRecovery = (url, fallbackUrl) => {
  const [src, setSrc] = useState(url || '');
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    setSrc(url || '');
    setRetried(false);
  }, [url]);

  const onMediaError = useCallback(() => {
    if (retried || !url) return;
    setRetried(true);
    if (url.startsWith('blob:')) {
      if (fallbackUrl && fallbackUrl !== url) setSrc(fallbackUrl);
      return;
    }
    setSrc(withMediaCacheBust(url));
  }, [retried, url, fallbackUrl]);

  return { src, onMediaError, retried };
};
