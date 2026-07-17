/** Inline HTML5 looping video document for CMS demo/reward WebView backgrounds. */

export const CMS_LOOPING_VIDEO_READY_MESSAGE = 'cms-video-ready';
export const CMS_LOOPING_VIDEO_ERROR_PREFIX = 'cms-video-error:';

export function buildLoopingVideoHtml(videoUrl: string, posterUrl?: string | null): string {
  const src = JSON.stringify(videoUrl);
  const poster = posterUrl ? JSON.stringify(posterUrl) : 'null';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
  video { position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; background: transparent; }
</style>
</head>
<body>
  <video id="cms-bg-video" muted loop playsinline webkit-playsinline autoplay preload="auto" aria-label="Tutorial video"></video>
  <script>
    (function () {
      var video = document.getElementById('cms-bg-video');
      if (!video) return;
      video.src = ${src};
      var poster = ${poster};
      if (poster) video.poster = poster;
      var notified = false;
      var notifyReady = function () {
        if (notified) return;
        notified = true;
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('${CMS_LOOPING_VIDEO_READY_MESSAGE}');
        }
      };
      video.addEventListener('loadeddata', notifyReady);
      video.addEventListener('canplay', notifyReady);
      video.addEventListener('error', function () {
        var code = video.error ? String(video.error.code) : 'unknown';
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('${CMS_LOOPING_VIDEO_ERROR_PREFIX}' + code);
        }
      });
      var play = function () {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      };
      play();
    })();
  </script>
</body>
</html>`;
}
