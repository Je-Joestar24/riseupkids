import { BUNNY_EMBED_HOSTS } from './bunnyExploreEmbed';

/**
 * A small two-way link with a Bunny embed, using the Player.js messages Bunny's player understands
 * (https://bunny.net/docs/stream/playback-api). The phone app reaches into the embed page with injected
 * scripts; a browser cannot do that across sites, so on the web the embed is told what to do by message.
 *
 * It is an add-on: if the embed never answers (older player, blocked, an unexpected reply) nothing here
 * ever fires, and the player behaves as it did before.
 *
 *   const bridge = createBunnyPlayerBridge(iframeElement, { onEvent: (event) => ... });
 *   bridge.play(); bridge.pause(); bridge.destroy();
 *
 * `onEvent` gets { type: 'ready' | 'play' | 'pause' | 'ended' | 'timeupdate' | 'error', value }.
 */
const CONTEXT = 'player.js';
const VERSION = '0.0.11';
const LISTENED_EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'error'];

const parse = (data) => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' ? data : null;
};

export function createBunnyPlayerBridge(iframe, { onEvent } = {}) {
  let origin = '*';
  try {
    origin = new URL(iframe?.src).origin;
  } catch {
    // keep '*': the reply is still filtered by the frame and the host below
  }

  const post = (message) => {
    try {
      iframe?.contentWindow?.postMessage(JSON.stringify({ context: CONTEXT, version: VERSION, ...message }), origin);
    } catch {
      // a closed or navigated frame: nothing to tell
    }
  };

  const handleMessage = (event) => {
    if (!iframe || event.source !== iframe.contentWindow) return;
    let host = '';
    try {
      host = new URL(event.origin).hostname.toLowerCase();
    } catch {
      return;
    }
    if (!BUNNY_EMBED_HOSTS.includes(host)) return;

    const message = parse(event.data);
    if (!message || message.context !== CONTEXT || typeof message.event !== 'string') return;

    if (message.event === 'ready') {
      LISTENED_EVENTS.forEach((name) => post({ method: 'addEventListener', value: name, listener: name }));
    }
    onEvent?.({ type: message.event, value: message.value });
  };

  window.addEventListener('message', handleMessage);

  return {
    play: () => post({ method: 'play' }),
    pause: () => post({ method: 'pause' }),
    destroy: () => window.removeEventListener('message', handleMessage),
  };
}
