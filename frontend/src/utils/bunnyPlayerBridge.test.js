import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBunnyPlayerBridge } from './bunnyPlayerBridge';

const SRC = 'https://iframe.mediadelivery.net/embed/123/abc?autoplay=true';
const ORIGIN = 'https://iframe.mediadelivery.net';

let iframe;
let post;
let bridge;
let events;

const fromPlayer = (message, { origin = ORIGIN, source } = {}) =>
  window.dispatchEvent(
    new MessageEvent('message', {
      data: typeof message === 'string' ? message : JSON.stringify({ context: 'player.js', version: '0.0.11', ...message }),
      origin,
      source: source ?? iframe.contentWindow,
    })
  );
const sent = () => post.mock.calls.map(([text, target]) => ({ ...JSON.parse(text), target }));

beforeEach(() => {
  iframe = document.createElement('iframe');
  iframe.src = SRC;
  document.body.appendChild(iframe);
  post = vi.spyOn(iframe.contentWindow, 'postMessage').mockImplementation(() => {});
  events = [];
  bridge = createBunnyPlayerBridge(iframe, { onEvent: (event) => events.push(event) });
});
afterEach(() => {
  bridge.destroy();
  iframe.remove();
  vi.restoreAllMocks();
});

describe('telling the embed what to do', () => {
  it('sends play and pause as Player.js messages, only to the embed\'s own address', () => {
    bridge.play();
    bridge.pause();

    expect(sent()).toEqual([
      { context: 'player.js', version: '0.0.11', method: 'play', target: ORIGIN },
      { context: 'player.js', version: '0.0.11', method: 'pause', target: ORIGIN },
    ]);
  });

  it('does not throw when the frame is gone', () => {
    post.mockImplementation(() => {
      throw new Error('gone');
    });
    expect(() => bridge.play()).not.toThrow();
  });

  it('does not throw for a frame with no window', () => {
    const empty = createBunnyPlayerBridge({ src: SRC, contentWindow: null }, {});
    expect(() => empty.play()).not.toThrow();
    empty.destroy();
  });
});

describe('listening to the embed', () => {
  it('when the embed says it is ready, subscribes to the events and passes "ready" on', () => {
    fromPlayer({ event: 'ready', value: { src: SRC } });

    expect(sent().map((message) => [message.method, message.value, message.listener])).toEqual([
      ['addEventListener', 'play', 'play'],
      ['addEventListener', 'pause', 'pause'],
      ['addEventListener', 'ended', 'ended'],
      ['addEventListener', 'timeupdate', 'timeupdate'],
      ['addEventListener', 'error', 'error'],
    ]);
    expect(events).toEqual([{ type: 'ready', value: { src: SRC } }]);
  });

  it.each(['play', 'pause', 'ended', 'timeupdate', 'error'])('passes "%s" on with its value', (type) => {
    fromPlayer({ event: type, value: { seconds: 3, code: 5 } });

    expect(events).toEqual([{ type, value: { seconds: 3, code: 5 } }]);
  });

  it('understands a message sent as an object as well as one sent as text', () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { context: 'player.js', event: 'play' },
        origin: ORIGIN,
        source: iframe.contentWindow,
      })
    );

    expect(events).toEqual([{ type: 'play', value: undefined }]);
  });

  it('also accepts the newer player host', () => {
    fromPlayer({ event: 'play' }, { origin: 'https://player.mediadelivery.net' });
    expect(events).toHaveLength(1);
  });

  it.each([
    ['another window', () => ({ source: window })],
    ['another site', () => ({ origin: 'https://evil.example.com' })],
    ['a site that only looks like Bunny', () => ({ origin: 'https://iframe.mediadelivery.net.evil.com' })],
    ['a missing origin', () => ({ origin: '' })],
  ])('ignores a message from %s', (_name, extra) => {
    fromPlayer({ event: 'play' }, extra());

    expect(events).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    ['text that is not JSON', 'hello'],
    ['JSON that is not a Player.js message', JSON.stringify({ event: 'play' })],
    ['a message from another library', JSON.stringify({ context: 'other', event: 'play' })],
    ['a reply with no event name', JSON.stringify({ context: 'player.js', method: 'getPaused', value: true })],
    ['an event name that is not text', JSON.stringify({ context: 'player.js', event: 5 })],
    ['null', 'null'],
  ])('ignores %s', (_name, data) => {
    fromPlayer(data);

    expect(events).toEqual([]);
  });

  it('stops listening after destroy', () => {
    bridge.destroy();

    fromPlayer({ event: 'play' });

    expect(events).toEqual([]);
  });
});
