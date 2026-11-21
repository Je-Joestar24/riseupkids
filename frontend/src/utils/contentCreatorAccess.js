/**
 * Content creator access areas on the web (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md).
 *
 * ONE place decides what a content creator can see and open, so the sidebar, the route guard and the redirects can
 * never disagree. The server is the real lock (every route refuses an area the creator was not given); this is what
 * makes the screen match it: what she cannot use is simply not there.
 *
 * `user.accessAreas` arrives with every sign-in and /auth/me: the creator's saved list, or the legacy set when she has
 * never been given one. The same fallback is repeated here so a user object that has not been refreshed yet (or an old
 * response) still shows a creator exactly what she had before.
 */

const CREATOR_ROLE = 'content_creator';

/**
 * The areas and where they live, in the order of the sidebar and of the landing page.
 * `match: 'exact'` = only that address; `'prefix'` = that address and everything under it (create / edit pages).
 * The keys are the server's; a test keeps this list identical to backend/utils/accessAreas.js.
 */
export const CREATOR_PAGES = Object.freeze([
  Object.freeze({ key: 'dashboard', label: 'Dashboard', path: '/content-creator/dashboard', match: 'exact' }),
  Object.freeze({ key: 'contents', label: 'My Contents', path: '/content-creator/contents', match: 'prefix' }),
  Object.freeze({ key: 'built_in_books', label: 'Built-in Books', path: '/content-creator/built-in-books', match: 'prefix' }),
  Object.freeze({ key: 'explore', label: 'Explore', path: '/content-creator/explore', match: 'prefix' }),
  Object.freeze({ key: 'star_cam_missions', label: 'Star Cam Missions', path: '/content-creator/star-cam-missions', match: 'prefix' }),
  Object.freeze({ key: 'notifications', label: 'Notifications', path: '/content-creator/notifications', match: 'prefix' }),
  Object.freeze({ key: 'experiences', label: 'Experiences', path: '/content-creator/experiences', match: 'prefix' }),
]);

export const CREATOR_AREA_KEYS = Object.freeze(CREATOR_PAGES.map((page) => page.key));

/** What every creator could use before access areas existed: no Notifications, no Experiences. */
export const LEGACY_CREATOR_AREAS = Object.freeze(['dashboard', 'contents', 'built_in_books', 'explore', 'star_cam_missions']);

const isKnownArea = (value) => typeof value === 'string' && CREATOR_AREA_KEYS.includes(value);

export const isContentCreator = (user) => user?.role === CREATOR_ROLE;

/**
 * The areas this creator can use right now, in sidebar order. Anyone who is not a content creator has none here
 * (admins and teachers have their own layouts and are not limited by areas).
 * @param {{ role?: string, accessAreas?: string[] } | null | undefined} user
 * @returns {string[]}
 */
export const creatorAreas = (user) => {
  if (!isContentCreator(user)) return [];

  const saved = user.accessAreas;
  if (!Array.isArray(saved) || saved.length === 0) return [...LEGACY_CREATOR_AREAS];

  // A saved list is trusted as it is, minus areas that no longer exist. It is not padded with the legacy set.
  return CREATOR_AREA_KEYS.filter((key) => saved.includes(key) && isKnownArea(key));
};

export const hasCreatorArea = (user, area) => isKnownArea(area) && creatorAreas(user).includes(area);

const clean = (pathname) => {
  if (typeof pathname !== 'string') return '';
  const withoutQuery = pathname.split(/[?#]/)[0];
  return withoutQuery.length > 1 && withoutQuery.endsWith('/') ? withoutQuery.slice(0, -1) : withoutQuery;
};

/**
 * Which area an address belongs to, or null when it belongs to none (an unknown address, or one outside
 * /content-creator).
 * @param {string} pathname
 * @returns {string | null}
 */
export const areaForPath = (pathname) => {
  const path = clean(pathname);
  const page = CREATOR_PAGES.find((candidate) =>
    candidate.match === 'exact' ? path === candidate.path : path === candidate.path || path.startsWith(`${candidate.path}/`)
  );
  return page ? page.key : null;
};

/** Can this creator open this address? An address that belongs to no area cannot be opened. */
export const canOpenCreatorPath = (user, pathname) => {
  const area = areaForPath(pathname);
  return area !== null && hasCreatorArea(user, area);
};

/** The sidebar items this creator gets, in order. */
export const creatorMenu = (user) => {
  const allowed = creatorAreas(user);
  return CREATOR_PAGES.filter((page) => allowed.includes(page.key));
};

/**
 * Where a creator lands after signing in, and where she is sent when she asks for something she cannot open: her first
 * allowed item. null when she has no area at all (the screen then says so, rather than looping).
 */
export const creatorLandingPath = (user) => {
  const [first] = creatorMenu(user);
  return first ? first.path : null;
};

/**
 * Where to send a creator after her access changed (or after a refusal): nowhere (null) when she can still open
 * the page she is on, otherwise her landing page. Only ever moves her inside her own area of the site, and never to
 * the page she is already on (no loop).
 * @param {{ role?: string, accessAreas?: string[] } | null | undefined} user the FRESH user
 * @param {string} pathname where she is now
 * @returns {string | null}
 */
export const pathAfterAccessChange = (user, pathname) => {
  if (!isContentCreator(user)) return null;

  const here = clean(pathname);
  if (here !== '/content-creator' && !here.startsWith('/content-creator/')) return null;
  if (canOpenCreatorPath(user, here)) return null;

  const landing = creatorLandingPath(user);
  return landing && landing !== here ? landing : null;
};
