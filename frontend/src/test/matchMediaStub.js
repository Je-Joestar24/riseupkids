/**
 * A fake `window.matchMedia` for tests, driven by a pretend screen. It understands the queries the app
 * and MUI use: min/max width and height, orientation, hover and pointer, joined with `and`.
 *
 *   const screenStub = installMatchMedia(PHONES.sideways);   // call in a test or beforeEach
 *   screenStub.set(PHONES.upright);                          // "rotate": listeners are told
 *   screenStub.restore();                                    // afterEach
 */

export const SCREENS = {
  desktop: { width: 1366, height: 768, touch: false },
  desktopFull: { width: 1920, height: 1080, touch: false },
  desktopSmallWindow: { width: 700, height: 400, touch: false },
  tablet: { width: 768, height: 1024, touch: true },
  tabletSideways: { width: 1024, height: 768, touch: true },
  phoneUpright: { width: 390, height: 844, touch: true },
  phoneSmallUpright: { width: 375, height: 667, touch: true },
  phoneSideways: { width: 844, height: 390, touch: true },
  phoneSmallSideways: { width: 667, height: 375, touch: true },
  phoneTinySideways: { width: 640, height: 360, touch: true },
};

const px = (text) => parseFloat(text);

function evaluate(query, screen) {
  const { width, height, touch } = screen;
  return String(query)
    .split(/\s+and\s+/i)
    .every((part) => {
      const match = part.trim().match(/^\(\s*([a-z-]+)\s*(?::\s*([^)]+?))?\s*\)$/i);
      if (!match) return false; // `screen`, `all`… are not used by the app; unknown means "no"
      const [, feature, rawValue] = match;
      const value = rawValue?.trim();
      switch (feature) {
        case 'min-width':
          return width >= px(value);
        case 'max-width':
          return width <= px(value);
        case 'min-height':
          return height >= px(value);
        case 'max-height':
          return height <= px(value);
        case 'orientation':
          return value === (width > height ? 'landscape' : 'portrait');
        case 'hover':
          return value === (touch ? 'none' : 'hover');
        case 'any-hover':
          return value === (touch ? 'none' : 'hover');
        case 'pointer':
        case 'any-pointer':
          return value === (touch ? 'coarse' : 'fine');
        default:
          return false;
      }
    });
}

export function installMatchMedia(initial = SCREENS.desktop) {
  const original = window.matchMedia;
  let screen = { ...initial };
  const lists = new Set();

  window.matchMedia = (query) => {
    const listeners = new Set();
    // Only lists somebody listens to are remembered, so asking again and again does not pile them up.
    const track = (fn) => {
      listeners.add(fn);
      lists.add(list);
    };
    const untrack = (fn) => {
      listeners.delete(fn);
      if (!listeners.size) lists.delete(list);
    };
    const list = {
      media: query,
      get matches() {
        return evaluate(query, screen);
      },
      onchange: null,
      addListener: (fn) => track(fn),
      removeListener: (fn) => untrack(fn),
      addEventListener: (_type, fn) => track(fn),
      removeEventListener: (_type, fn) => untrack(fn),
      dispatchEvent: () => true,
      _last: evaluate(query, screen),
      _notify() {
        const now = evaluate(query, screen);
        if (now === this._last) return;
        this._last = now;
        listeners.forEach((fn) => fn({ matches: now, media: query }));
      },
    };
    return list;
  };

  return {
    /** Turn the pretend screen (width, height, touch) and tell everybody who is listening. */
    set(next) {
      screen = { ...next };
      [...lists].forEach((list) => list._notify());
    },
    get current() {
      return { ...screen };
    },
    restore() {
      window.matchMedia = original;
      lists.clear();
    },
  };
}
