/**
 * Bunny Stream child WebView playback helpers.
 * The embed URL is loaded as the WebView document (Media Chrome + optional Plyr).
 * We hide Bunny's default chrome and toggle play/pause from an in-page wall so
 * the tap is a real user gesture on iOS.
 */

export const BUNNY_EMBED_PLAY_WALL_ID = 'riseup-kids-bunny-play-wall';
export const BUNNY_EMBED_HIDE_STYLE_ID = 'riseup-kids-bunny-hide-ui';
export const BUNNY_EMBED_PLAY_WALL_READY_MESSAGE = 'BUNNY_PLAY_WALL_READY';

export interface BunnyEmbedPlayScriptOptions {
  /** CMS background loops must stay muted. Watch-only child videos play with sound. */
  keepMuted?: boolean;
  /** Child watch surface toggles pause. CMS background loops only resume. */
  allowPause?: boolean;
}

/** Hide Bunny Media Chrome / legacy Plyr chrome so children only see the video. */
export const BUNNY_EMBED_HIDE_CONTROLS_CSS = [
  'media-control-bar',
  'bunny-media-control-bar',
  'media-play-button',
  'media-mute-button',
  'media-volume-range',
  'media-time-range',
  'bunny-media-time-range',
  'media-time-display',
  'media-duration-display',
  'media-fullscreen-button',
  'media-pip-button',
  'media-captions-button',
  'media-airplay-button',
  'media-cast-button',
  'media-seek-forward-button',
  'media-seek-backward-button',
  'media-playback-rate-button',
  'bunny-settings-menu-button',
  'bunny-quality-menu-button',
  'bunny-playback-rate-menu-button',
  '.plyr__controls',
  '.plyr__control',
  '.plyr__control--overlaid',
].join(',\n') + ` {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
media-controller {
  --media-control-bar-display: none;
}
[part='media-control-bar'],
[part='control-bar'] {
  display: none !important;
}
`;

function buildPlaybackControlJs(keepMuted: boolean, allowPause: boolean): string {
  const mutedSetup = keepMuted
    ? `media.muted = true;`
    : `try { media.muted = false; media.volume = 1; } catch (eUnmuteSetup) {}`;
  const unmuteAfterPlay = keepMuted
    ? ''
    : `try { media.muted = false; media.volume = 1; } catch (eUnmutePlay) {}`;
  const playCatch = keepMuted
    ? `p.catch(function () {});`
    : `p.then(function () { ${unmuteAfterPlay} }).catch(function () {
            try {
              media.muted = true;
              var p2 = media.play();
              if (p2 && typeof p2.then === 'function') {
                p2.then(function () { media.muted = false; media.volume = 1; }).catch(function () {});
              }
            } catch (e2) {}
          });`;
  const unmutePost = keepMuted
    ? ''
    : `
      var unmute = { context: 'player.js', version: '0.0.11', method: 'unmute' };
      try { target.postMessage(JSON.stringify(unmute), '*'); } catch (e3) {}`;
  const pauseBranch = allowPause
    ? `
      function pauseMedia(media) {
        if (!media) return;
        try { media.pause(); } catch (e) {}
      }
      function pauseAllBunnyMedia() {
        var list = findAllMedia();
        for (var i = 0; i < list.length; i++) pauseMedia(list[i]);
        postMethod('pause');
      }
      function anyPaused(list) {
        if (!list.length) return true;
        for (var i = 0; i < list.length; i++) {
          if (list[i] && list[i].paused && !list[i].ended) return true;
        }
        return false;
      }
      function toggleBunnyPlayback() {
        var list = findAllMedia();
        if (anyPaused(list)) playAllBunnyMedia();
        else pauseAllBunnyMedia();
      }
      window.__riseUpKidsPlayBunnyEmbed = playAllBunnyMedia;
      window.__riseUpKidsToggleBunnyEmbed = toggleBunnyPlayback;
    `
    : `
      window.__riseUpKidsPlayBunnyEmbed = playAllBunnyMedia;
      window.__riseUpKidsToggleBunnyEmbed = playAllBunnyMedia;
    `;

  return `
    function eachRoot(root, visit) {
      if (!root) return;
      visit(root);
      if (!root.querySelectorAll) return;
      var nodes = root.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].shadowRoot) eachRoot(nodes[i].shadowRoot, visit);
      }
    }
    function queryAllDeep(selector) {
      var out = [];
      eachRoot(document, function (root) {
        if (!root.querySelectorAll) return;
        var list = root.querySelectorAll(selector);
        for (var i = 0; i < list.length; i++) out.push(list[i]);
      });
      return out;
    }
    function findAllMedia() {
      var out = [];
      var seen = [];
      function add(media) {
        if (!media || seen.indexOf(media) !== -1) return;
        seen.push(media);
        out.push(media);
      }
      eachRoot(document, function (root) {
        if (!root.querySelectorAll) return;
        var videos = root.querySelectorAll('video, audio');
        for (var i = 0; i < videos.length; i++) add(videos[i]);
        var controllers = root.querySelectorAll('media-controller');
        for (var c = 0; c < controllers.length; c++) {
          try { add(controllers[c].media); } catch (e) {}
        }
      });
      return out;
    }
    function playMedia(media) {
      if (!media) return;
      try {
        try { media.playsInline = true; } catch (eInline) {}
        try { media.controls = false; } catch (eCtrl) {}
        media.setAttribute('playsinline', 'true');
        media.setAttribute('webkit-playsinline', 'true');
        media.setAttribute('x-webkit-airplay', 'deny');
        media.removeAttribute('controls');
        ${mutedSetup}
        if (media.ended) return;
        var p = media.play();
        if (p && typeof p.then === 'function') {
          ${playCatch}
        } else {
          ${unmuteAfterPlay}
        }
      } catch (e) {}
    }
    function postMethod(method) {
      var payload = { context: 'player.js', version: '0.0.11', method: method };
      function send(target) {
        if (!target) return;
        try { target.postMessage(JSON.stringify(payload), '*'); } catch (e) {}
        try { target.postMessage(payload, '*'); } catch (e2) {}
        if (method === 'play') {
          ${unmutePost}
        }
      }
      send(window);
      if (window.parent && window.parent !== window) send(window.parent);
      var iframes = document.querySelectorAll('iframe');
      for (var f = 0; f < iframes.length; f++) {
        try { send(iframes[f].contentWindow); } catch (e4) {}
      }
    }
    function playAllBunnyMedia() {
      var list = findAllMedia();
      for (var i = 0; i < list.length; i++) playMedia(list[i]);
      postMethod('play');
      try {
        if (window.player && typeof window.player.play === 'function') window.player.play();
      } catch (e6) {}
      if (!list.length) {
        var btn = queryAllDeep('media-play-button, [data-plyr="play"]')[0];
        if (btn && btn.click) btn.click();
      }
    }
    ${pauseBranch}
  `;
}

function buildHideControlsJs(): string {
  const styleId = BUNNY_EMBED_HIDE_STYLE_ID;
  return `
    var HIDE_CSS = ${JSON.stringify(BUNNY_EMBED_HIDE_CONTROLS_CSS)};
    function hideBunnyChromeInRoot(root) {
      if (!root) return;
      var host = root.head || root.documentElement || root;
      if (!host || !host.querySelector) return;
      var style = host.querySelector('#${styleId}');
      if (!style) {
        style = document.createElement('style');
        style.id = '${styleId}';
        try { host.appendChild(style); } catch (e) { return; }
      }
      style.textContent = HIDE_CSS;
    }
    function hideBunnyChrome() {
      hideBunnyChromeInRoot(document);
      eachRoot(document, function (root) {
        hideBunnyChromeInRoot(root);
      });
      var controllers = queryAllDeep('media-controller, bunny-player, bunny-stream-player');
      for (var i = 0; i < controllers.length; i++) {
        try {
          controllers[i].setAttribute('nohotkeys', '');
          controllers[i].style.setProperty('--media-control-bar-display', 'none');
          controllers[i].style.setProperty('--media-control-padding', '0');
        } catch (e) {}
      }
      var media = findAllMedia();
      for (var m = 0; m < media.length; m++) {
        try { media[m].removeAttribute('controls'); } catch (e2) {}
      }
    }
  `;
}

/** Injected on overlay tap — toggles or resumes Bunny playback immediately. */
export function buildBunnyEmbedTogglePlaybackScript(
  options: BunnyEmbedPlayScriptOptions = {}
): string {
  const keepMuted = options.keepMuted === true;
  const allowPause = options.allowPause !== false;
  return `(function(){
    try {
      ${buildPlaybackControlJs(keepMuted, allowPause)}
      if (typeof window.__riseUpKidsToggleBunnyEmbed === 'function') {
        window.__riseUpKidsToggleBunnyEmbed();
      } else {
        window.__riseUpKidsPlayBunnyEmbed();
      }
    } catch (e) {}
    true;
  })();`;
}

/** @deprecated Use buildBunnyEmbedTogglePlaybackScript */
export function buildBunnyEmbedResumePlaybackScript(
  options: BunnyEmbedPlayScriptOptions = {}
): string {
  return buildBunnyEmbedTogglePlaybackScript({ ...options, allowPause: false });
}

/**
 * Hides Bunny chrome and installs an in-page invisible wall.
 * Wall taps toggle play/pause with a real WebView user gesture (needed on iOS).
 */
export function buildBunnyEmbedPlayWallInstallerScript(
  options: BunnyEmbedPlayScriptOptions = {}
): string {
  const keepMuted = options.keepMuted === true;
  const allowPause = options.allowPause !== false;
  const wallId = BUNNY_EMBED_PLAY_WALL_ID;
  const readyType = BUNNY_EMBED_PLAY_WALL_READY_MESSAGE;
  return `(function(){
    try {
      ${buildPlaybackControlJs(keepMuted, allowPause)}
      ${buildHideControlsJs()}
      function notifyReady() {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: '${readyType}' }));
          }
        } catch (e) {}
      }
      window.__riseUpKidsOnUserToggle = function (e) {
        var now = Date.now();
        if (window.__riseUpKidsLastToggleAt && now - window.__riseUpKidsLastToggleAt < 350) return;
        window.__riseUpKidsLastToggleAt = now;
        try {
          if (e && e.stopPropagation) e.stopPropagation();
        } catch (eStop) {}
        try { window.__riseUpKidsToggleBunnyEmbed(); } catch (err) {}
      };
      function mountWall() {
        var parent = document.body || document.documentElement;
        if (!parent) return null;
        var wall = document.getElementById('${wallId}');
        if (!wall) {
          wall = document.createElement('div');
          wall.id = '${wallId}';
          wall.setAttribute('role', 'button');
          wall.setAttribute('aria-label', '${allowPause ? 'Play or pause video' : 'Play video'}');
          wall.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.001);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none;';
          parent.appendChild(wall);
        } else if (wall.parentNode !== parent || parent.lastChild !== wall) {
          parent.appendChild(wall);
        }
        wall.onclick = function (e) { window.__riseUpKidsOnUserToggle(e); };
        wall.ontouchstart = function (e) { window.__riseUpKidsOnUserToggle(e); };
        return wall;
      }
      hideBunnyChrome();
      mountWall();
      ${keepMuted ? '' : 'try { playAllBunnyMedia(); } catch (ePlay) {}'}
      if (!window.__riseUpKidsBunnyGestureBound) {
        window.__riseUpKidsBunnyGestureBound = true;
        document.addEventListener('touchstart', function (e) {
          if (window.__riseUpKidsOnUserToggle) window.__riseUpKidsOnUserToggle(e);
        }, { capture: true, passive: true });
        document.addEventListener('click', function (e) {
          if (window.__riseUpKidsOnUserToggle) window.__riseUpKidsOnUserToggle(e);
        }, true);
      }
      notifyReady();
    } catch (err) {}
    true;
  })();`;
}

export function isBunnyEmbedPlayWallReadyMessage(data: string): boolean {
  if (!data) return false;
  if (data === BUNNY_EMBED_PLAY_WALL_READY_MESSAGE) return true;
  try {
    const parsed = JSON.parse(data) as { type?: string };
    return parsed?.type === BUNNY_EMBED_PLAY_WALL_READY_MESSAGE;
  } catch {
    return false;
  }
}

/** One delayed re-apply after Bunny Media Chrome hydrates. Do not poll during load. */
export const BUNNY_EMBED_IOS_INSTALLER_RETRY_MS = [800] as const;

/** Hide the loading overlay even if WKWebView never fires onLoadEnd. */
export const BUNNY_EMBED_LOADING_TIMEOUT_MS = 6000;

export function isFatalBunnyEmbedHttpError(
  requestUrl: string | undefined,
  statusCode: number | undefined,
  embedUrl: string | null
): boolean {
  if (!statusCode || statusCode < 400 || !requestUrl || !embedUrl) return false;
  try {
    const loaded = new URL(requestUrl);
    const embed = new URL(embedUrl);
    return loaded.origin === embed.origin && loaded.pathname === embed.pathname;
  } catch {
    return false;
  }
}

/**
 * iOS WKWebView pauses HTML5 video when a native view covers it, and native
 * injectJavaScript is not a user gesture. Uncover the WebView after load so
 * touchstart inside the page can play/pause.
 */
export function shouldUncoverBunnyWebViewForGestures(input: {
  blockTouch: boolean;
  allowPause: boolean;
  playWallReady: boolean;
  isLoading: boolean;
  hasError: boolean;
  platformOs: string;
}): boolean {
  if (!input.blockTouch || !input.allowPause || input.isLoading || input.hasError) {
    return false;
  }
  if (input.platformOs === 'ios') return true;
  return input.playWallReady;
}
