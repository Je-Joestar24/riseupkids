/**
 * Chunk 11 — Mobile App Security: WebView hardening.
 * getOrigin() backs html5-modal.tsx's originWhitelist and onShouldStartLoadWithRequest guard —
 * the WebView must only ever load pages on the exact origin the backend told us to load the
 * HTML5 package from, never follow a navigation elsewhere.
 */
import { getOrigin } from '@/utils/webViewOrigin';

describe('getOrigin', () => {
  it('extracts protocol + host, dropping path/query/hash', () => {
    expect(getOrigin('https://api.riseup.kids/html5/pkg-1/index.html?x=1#frag')).toBe(
      'https://api.riseup.kids'
    );
  });

  it('preserves a non-default port as part of the origin', () => {
    expect(getOrigin('http://192.168.1.50:5000/html5/pkg-1/index.html')).toBe(
      'http://192.168.1.50:5000'
    );
  });

  it('treats different hosts as different origins', () => {
    expect(getOrigin('https://a.cloudfront.net/x')).not.toBe(getOrigin('https://b.cloudfront.net/x'));
  });

  it('returns null for an unparsable URL instead of throwing', () => {
    expect(getOrigin('not a url')).toBeNull();
  });
});
