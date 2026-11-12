/**
 * Validation rules for admin-managed Experiences (title, description, list of Bunny videos, optional
 * printable). Pure functions: no database, no network, so every rule can be tested on its own.
 *
 * Every function that checks input returns `{ value, errors }` where `errors` is a list of
 * `{ field, message }` (empty = valid) so the admin screen can show each message next to its field.
 */

const { BUNNY_IFRAME_HOST, assertBunnyIframeEmbedUrl } = require('./bunnyEmbed.util');

const LIMITS = Object.freeze({
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  VIDEO_TITLE_MAX: 200,
  MAX_VIDEOS: 20,
  PRINTABLE_BUTTON_MAX: 60,
  URL_MAX: 2048,
  SEARCH_MAX: 100,
  PAGE_SIZE_DEFAULT: 20,
  PAGE_SIZE_MAX: 100,
});

const DEFAULT_PRINTABLE_BUTTON = 'Print here';

/** The Bunny "player" host serves the same videos as the "iframe" host; links are always stored on the iframe host. */
const BUNNY_PLAYER_HOST = 'player.mediadelivery.net';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** An error that is safe to show to the admin: it carries the HTTP status and a stable code. */
class ExperienceError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} code stable machine-readable code, e.g. EXPERIENCE_NOT_FOUND
   * @param {string} message readable message for the admin
   * @param {Array<{field:string,message:string}>} [errors] field-level problems
   */
  constructor(statusCode, code, message, errors = []) {
    super(message);
    this.name = 'ExperienceError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function isValidExperienceUuid(value) {
  return typeof value === 'string' && UUID_V4.test(value);
}

/** A video row id: 24 hex characters (the database would also accept any 12-character text, which is not one). */
function isValidVideoId(value) {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
}

/** Hosts a printable may be served from: our own domain only (store rules: no outside links). */
function getPrintableHosts() {
  const fromEnv = String(process.env.EXPERIENCE_PRINTABLE_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : ['riseup.kids', 'www.riseup.kids', 'app.riseup.kids'];
}

/**
 * A Bunny embed link on the iframe host. A "player" link is converted (same video); anything else that
 * is not an https Bunny embed link throws.
 * @param {unknown} raw
 * @returns {string} canonical link
 */
function normalizeBunnyEmbedUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Video link is required.');
  }
  const trimmed = raw.trim();
  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.toLowerCase() === BUNNY_PLAYER_HOST) {
      parsed.hostname = BUNNY_IFRAME_HOST;
      candidate = parsed.toString();
    }
  } catch {
    // assertBunnyIframeEmbedUrl reports the invalid link below
  }
  try {
    return assertBunnyIframeEmbedUrl(candidate);
  } catch (error) {
    throw new Error(
      `Video link must be a Bunny embed link like https://${BUNNY_IFRAME_HOST}/embed/LIBRARY/VIDEO (${String(
        error.message
      )
        .replace(/^embedUrl\s*/i, '')
        .replace(/\.$/, '')}).`
    );
  }
}

function checkText(value, { field, label, required, max, errors }) {
  if (value === undefined || value === null) {
    if (required) errors.push({ field, message: `${label} is required.` });
    return '';
  }
  if (typeof value !== 'string') {
    errors.push({ field, message: `${label} must be text.` });
    return '';
  }
  const text = value.trim();
  if (!text) {
    if (required) errors.push({ field, message: `${label} is required.` });
    return '';
  }
  if (text.length > max) {
    errors.push({ field, message: `${label} cannot exceed ${max} characters.` });
  }
  return text;
}

function checkPrintableLink(raw, errors) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return '';
  if (typeof raw !== 'string') {
    errors.push({ field: 'printable.link', message: 'Printable link must be text.' });
    return '';
  }
  const text = raw.trim();
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    errors.push({ field: 'printable.link', message: 'Printable link is not a valid link.' });
    return '';
  }
  if (parsed.protocol !== 'https:') {
    errors.push({ field: 'printable.link', message: 'Printable link must use https.' });
    return '';
  }
  if (!getPrintableHosts().includes(parsed.hostname.toLowerCase())) {
    errors.push({
      field: 'printable.link',
      message: 'Printable link must be a file on our own website (no outside links).',
    });
    return '';
  }
  if (text.length > LIMITS.URL_MAX) {
    errors.push({ field: 'printable.link', message: 'Printable link is too long.' });
    return '';
  }
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  return parsed.toString();
}

function checkVideos(raw, errors) {
  if (!Array.isArray(raw)) {
    errors.push({ field: 'videos', message: 'Videos must be a list.' });
    return [];
  }
  if (raw.length > LIMITS.MAX_VIDEOS) {
    errors.push({ field: 'videos', message: `An experience can have at most ${LIMITS.MAX_VIDEOS} videos.` });
    return [];
  }
  const videos = [];
  const seen = new Map();
  raw.forEach((item, index) => {
    const base = `videos[${index}]`;
    if (!isPlainObject(item)) {
      errors.push({ field: base, message: 'Each video needs a title and a link.' });
      return;
    }
    const title = checkText(item.title, {
      field: `${base}.title`,
      label: 'Video title',
      required: true,
      max: LIMITS.VIDEO_TITLE_MAX,
      errors,
    });
    let embedUrl = '';
    try {
      embedUrl = normalizeBunnyEmbedUrl(item.embedUrl);
    } catch (error) {
      errors.push({ field: `${base}.embedUrl`, message: error.message });
    }
    if (embedUrl) {
      if (seen.has(embedUrl)) {
        errors.push({
          field: `${base}.embedUrl`,
          message: `This video is already in the list (video ${seen.get(embedUrl) + 1}).`,
        });
      } else {
        seen.set(embedUrl, index);
      }
    }
    // The order of the list is the order (and the position) of each video. A `position` that comes along
    // with a row, e.g. from an editor that loaded the experience, is only checked, never used to move it:
    // to move a video, send the list in the new order or use the video reorder / move routes.
    if (item.position !== undefined && item.position !== null) {
      if (!Number.isInteger(item.position) || item.position < 1) {
        errors.push({ field: `${base}.position`, message: 'Position must be a whole number of 1 or more.' });
      }
    }
    const video = { title, embedUrl };
    // A known id keeps the same row when an experience is edited (the screen keys its rows on it).
    if (isValidVideoId(item.id)) video._id = item.id;
    videos.push(video);
  });
  return videos;
}

function checkPrintable(raw, errors) {
  if (raw === undefined || raw === null) return null;
  if (!isPlainObject(raw)) {
    errors.push({ field: 'printable', message: 'Printable must be an object with a link and a button text.' });
    return null;
  }
  const link = checkPrintableLink(raw.link, errors);
  let button = DEFAULT_PRINTABLE_BUTTON;
  if (raw.button !== undefined && raw.button !== null && String(raw.button).trim() !== '') {
    button = checkText(raw.button, {
      field: 'printable.button',
      label: 'Printable button text',
      required: false,
      max: LIMITS.PRINTABLE_BUTTON_MAX,
      errors,
    }) || DEFAULT_PRINTABLE_BUTTON;
  }
  return { link, button };
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * Checks the fields an admin may send when creating or editing an experience. Only the fields that are
 * present are checked and returned when `partial` is true (editing); on create `title` is required.
 *
 * @param {object} input request body
 * @param {{ partial?: boolean }} [options]
 * @returns {{ value: object, errors: Array<{field:string,message:string}> }}
 */
function validateExperienceInput(input, { partial = false } = {}) {
  const errors = [];
  const value = {};
  const body = isPlainObject(input) ? input : {};

  if (!isPlainObject(input)) {
    errors.push({ field: 'body', message: 'Send the experience as an object.' });
    return { value, errors };
  }

  if (!partial || hasOwn(body, 'title')) {
    value.title = checkText(body.title, { field: 'title', label: 'Title', required: true, max: LIMITS.TITLE_MAX, errors });
  }
  if (hasOwn(body, 'description')) {
    value.description = checkText(body.description, {
      field: 'description',
      label: 'Description',
      required: false,
      max: LIMITS.DESCRIPTION_MAX,
      errors,
    });
  }
  if (hasOwn(body, 'videos')) {
    value.videos = checkVideos(body.videos, errors);
  }
  if (hasOwn(body, 'printable')) {
    const printable = checkPrintable(body.printable, errors);
    if (printable) value.printable = printable;
  }
  if (hasOwn(body, 'isPublished')) {
    const flag = toBoolean(body.isPublished);
    if (flag === undefined) errors.push({ field: 'isPublished', message: 'Published must be true or false.' });
    else value.isPublished = flag;
  }
  return { value, errors };
}

/**
 * What stops an experience from being published (empty = it can be). Children must never see an empty page.
 * @param {{ title?: string, videos?: Array<{title?: string, embedUrl?: string}> }} experience
 * @returns {Array<{field:string,message:string}>}
 */
function findPublishProblems(experience) {
  const problems = [];
  if (!experience || !String(experience.title || '').trim()) {
    problems.push({ field: 'title', message: 'Add a title before publishing.' });
  }
  const videos = Array.isArray(experience && experience.videos) ? experience.videos : [];
  if (videos.length === 0) {
    problems.push({ field: 'videos', message: 'Add at least one video before publishing.' });
  }
  videos.forEach((video, index) => {
    if (!video || !String(video.title || '').trim() || !String(video.embedUrl || '').trim()) {
      problems.push({ field: `videos[${index}]`, message: `Video ${index + 1} needs a title and a link.` });
    }
  });
  return problems;
}

/**
 * List filters from a query string.
 * @param {object} query
 * @returns {{ value: { status: string, search: string, page: number, limit: number }, errors: Array<{field:string,message:string}> }}
 */
function parseListQuery(query) {
  const errors = [];
  const source = isPlainObject(query) ? query : {};
  const value = { status: 'all', search: '', page: 1, limit: LIMITS.PAGE_SIZE_DEFAULT };

  if (source.status !== undefined) {
    if (typeof source.status === 'string' && ['all', 'published', 'draft'].includes(source.status)) {
      value.status = source.status;
    } else {
      errors.push({ field: 'status', message: 'Status must be all, published or draft.' });
    }
  }
  if (source.search !== undefined) {
    if (typeof source.search !== 'string') {
      errors.push({ field: 'search', message: 'Search must be text.' });
    } else {
      value.search = source.search.trim().slice(0, LIMITS.SEARCH_MAX);
    }
  }
  for (const [name, fallback] of [['page', 1], ['limit', LIMITS.PAGE_SIZE_DEFAULT]]) {
    if (source[name] === undefined) continue;
    const text = String(source[name]);
    if (!/^[0-9]+$/.test(text) || Number(text) < 1) {
      errors.push({ field: name, message: `${name === 'page' ? 'Page' : 'Limit'} must be a whole number of 1 or more.` });
    } else {
      value[name] = Math.min(Number(text), name === 'limit' ? LIMITS.PAGE_SIZE_MAX : Number.MAX_SAFE_INTEGER);
    }
    if (errors.some((e) => e.field === name)) value[name] = fallback;
  }
  return { value, errors };
}

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  LIMITS,
  DEFAULT_PRINTABLE_BUTTON,
  ExperienceError,
  isValidExperienceUuid,
  isValidVideoId,
  getPrintableHosts,
  normalizeBunnyEmbedUrl,
  validateExperienceInput,
  findPublishProblems,
  parseListQuery,
  escapeRegex,
};
