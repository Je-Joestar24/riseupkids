/**
 * Access areas: the parts of the site a content creator can be given, one checkbox each in the admin screen.
 *
 * This is the ONE place that knows the list. The route locks, the admin form (through GET /access-areas) and the
 * migration script all read it from here, so adding an area later is a single entry.
 *
 * Who is limited by it:
 *  - content_creator: only the areas on their saved list.
 *  - admin and teacher: never limited (every area).
 *  - everyone else (parent, child): no areas.
 *
 * "Missing" list: every creator that existed before this feature has no saved list. They are treated as having the
 * LEGACY set, exactly what they could use before, so deploying changes nothing for anyone. Note that Mongoose gives
 * an unset array field the value [], so an empty / non-array saved value also counts as "missing". (A real saved list
 * always has at least one area; the validation below refuses an empty one.)
 */

const CONTENT_CREATOR_ROLE = 'content_creator';
const FULL_ACCESS_ROLES = ['admin', 'teacher'];

// Order matters: it is the order of the checkboxes, of the sidebar, and the order the landing page is picked in.
const ACCESS_AREAS = Object.freeze([
  Object.freeze({
    key: 'dashboard',
    label: 'Dashboard',
    help: 'The home page with shortcuts to the areas they can use',
  }),
  Object.freeze({
    key: 'contents',
    label: 'Contents',
    help: 'Add and edit activities, videos, chants, audio assignments and books',
  }),
  Object.freeze({
    key: 'built_in_books',
    label: 'Built-in Books',
    help: 'Build and edit the built-in books',
  }),
  Object.freeze({
    key: 'explore',
    label: 'Explore',
    help: 'Add and edit the Explore videos',
  }),
  Object.freeze({
    key: 'star_cam_missions',
    label: 'Star Cam Missions',
    help: 'Create and edit Star Cam missions and their label list',
  }),
  Object.freeze({
    key: 'notifications',
    label: 'Notifications',
    help: 'Create, test and send push notifications to families',
  }),
  Object.freeze({
    key: 'experiences',
    label: 'Experiences',
    help: 'Manage the Experiences children see under Explore',
  }),
]);

const ACCESS_AREA_KEYS = Object.freeze(ACCESS_AREAS.map((area) => area.key));

// What every content creator could use before access areas existed. No Notifications, no Experiences.
const LEGACY_CREATOR_AREAS = Object.freeze([
  'dashboard',
  'contents',
  'built_in_books',
  'explore',
  'star_cam_missions',
]);

// The error codes the API answers with (the web app reads these, never the message wording).
const ACCESS_ERROR_CODES = Object.freeze({
  AREA_REQUIRED: 'ACCESS_AREA_REQUIRED', // 403: the creator does not have this area
  AREAS_REQUIRED: 'ACCESS_AREAS_REQUIRED', // 400: no list was sent
  AREAS_EMPTY: 'ACCESS_AREAS_EMPTY', // 400: an empty list
  AREAS_INVALID: 'ACCESS_AREAS_INVALID', // 400: not a list, or an unknown area
  AREAS_NOT_FOR_ROLE: 'ACCESS_AREAS_NOT_FOR_ROLE', // 400: sent for a parent / teacher
  BULK_INVALID: 'ACCESS_BULK_INVALID', // 400: a bad bulk request
  CREATOR_NOT_FOUND: 'CONTENT_CREATOR_NOT_FOUND', // 404
});

const MAX_NAME_LENGTH_IN_MESSAGE = 40;

const isKnownArea = (value) => typeof value === 'string' && ACCESS_AREA_KEYS.includes(value);

// Safe to put in an error message: never trust the caller's text to be short or printable.
const describeValue = (value) => {
  if (typeof value !== 'string') return typeof value === 'object' ? 'a non-text value' : `a ${typeof value} value`;
  const cleaned = value.replace(/[^\x20-\x7E]/g, '?');
  return cleaned.length > MAX_NAME_LENGTH_IN_MESSAGE
    ? `${cleaned.slice(0, MAX_NAME_LENGTH_IN_MESSAGE)}...`
    : cleaned;
};

const canonicalOrder = (keys) => ACCESS_AREA_KEYS.filter((key) => keys.includes(key));

/**
 * Checks an access list coming from a request. Never throws; says what is wrong with a code and a message.
 *
 * @param {*} input what the caller sent
 * @returns {{ ok: true, areas: string[] } | { ok: false, code: string, message: string }}
 *   On success `areas` has no duplicates and is in the canonical order, whatever order was sent.
 */
const validateAreas = (input) => {
  if (input === undefined || input === null) {
    return { ok: false, code: ACCESS_ERROR_CODES.AREAS_REQUIRED, message: 'Choose at least one area.' };
  }

  if (!Array.isArray(input)) {
    return {
      ok: false,
      code: ACCESS_ERROR_CODES.AREAS_INVALID,
      message: 'Access areas must be a list.',
    };
  }

  if (input.length === 0) {
    return {
      ok: false,
      code: ACCESS_ERROR_CODES.AREAS_EMPTY,
      message: 'Choose at least one area. To stop this person using the site, archive them.',
    };
  }

  // findIndex, not find: the bad item can itself be `undefined` (a hole in the list), which find cannot tell apart
  // from "nothing found".
  const badIndex = input.findIndex((value) => !isKnownArea(value));
  if (badIndex !== -1) {
    return {
      ok: false,
      code: ACCESS_ERROR_CODES.AREAS_INVALID,
      message: `Unknown area: ${describeValue(input[badIndex])}.`,
    };
  }

  return { ok: true, areas: canonicalOrder(input) };
};

/**
 * The areas a user can use right now.
 * @param {{ role?: string, accessAreas?: string[] } | null} user
 * @returns {string[]} in the canonical order
 */
const effectiveAreas = (user) => {
  if (!user) return [];

  if (FULL_ACCESS_ROLES.includes(user.role)) return [...ACCESS_AREA_KEYS];

  if (user.role !== CONTENT_CREATOR_ROLE) return [];

  const saved = user.accessAreas;
  if (!Array.isArray(saved) || saved.length === 0) return [...LEGACY_CREATOR_AREAS];

  // A saved list is trusted as it is, minus any area that no longer exists. It is NOT padded with the legacy set
  // (a creator left with nothing really has nothing).
  return canonicalOrder(saved.filter(isKnownArea));
};

const userHasArea = (user, area) => isKnownArea(area) && effectiveAreas(user).includes(area);

/** The list the admin form draws (GET /access-areas). A copy, so nobody can change the shared list by accident. */
const describeAccessAreas = () =>
  ACCESS_AREAS.map(({ key, label, help }) => ({
    key,
    label,
    help,
    // true for what every creator had before access areas existed (the web app can say "what current creators have")
    legacy: LEGACY_CREATOR_AREAS.includes(key),
  }));

module.exports = {
  CONTENT_CREATOR_ROLE,
  FULL_ACCESS_ROLES,
  ACCESS_AREAS,
  ACCESS_AREA_KEYS,
  LEGACY_CREATOR_AREAS,
  ACCESS_ERROR_CODES,
  isKnownArea,
  validateAreas,
  effectiveAreas,
  userHasArea,
  describeAccessAreas,
};
