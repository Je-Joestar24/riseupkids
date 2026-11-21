/**
 * Content creator access errors on the web (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md).
 *
 * The server answers every access problem with `{ success: false, message, code }`. The screen reads the CODE, never
 * the wording, to decide what to do; the message is only used when it carries detail worth showing (which area is
 * unknown, how many people at most). Everything has a plain-language message here, so the admin never sees a code.
 */

export const ACCESS_ERROR_CODES = Object.freeze({
  AREA_REQUIRED: 'ACCESS_AREA_REQUIRED',
  AREAS_REQUIRED: 'ACCESS_AREAS_REQUIRED',
  AREAS_EMPTY: 'ACCESS_AREAS_EMPTY',
  AREAS_INVALID: 'ACCESS_AREAS_INVALID',
  AREAS_NOT_FOR_ROLE: 'ACCESS_AREAS_NOT_FOR_ROLE',
  BULK_INVALID: 'ACCESS_BULK_INVALID',
  CREATOR_NOT_FOUND: 'CONTENT_CREATOR_NOT_FOUND',
});

export const NETWORK_MESSAGE = 'Could not reach the server. Check your connection and try again.';

const MESSAGES = Object.freeze({
  [ACCESS_ERROR_CODES.AREA_REQUIRED]: "You don't have access to this area. Ask an admin if you need it.",
  [ACCESS_ERROR_CODES.AREAS_REQUIRED]: 'Choose at least one area.',
  [ACCESS_ERROR_CODES.AREAS_EMPTY]: 'Choose at least one area. To stop this person using the site, archive them.',
  [ACCESS_ERROR_CODES.AREAS_INVALID]: 'One of the chosen areas is not valid. Please refresh the page and try again.',
  [ACCESS_ERROR_CODES.AREAS_NOT_FOR_ROLE]: 'Access areas only apply to content creators.',
  [ACCESS_ERROR_CODES.BULK_INVALID]: 'Those people could not be updated. Please refresh the list and try again.',
  [ACCESS_ERROR_CODES.CREATOR_NOT_FOUND]: 'This content creator could not be found. They may have been removed.',
});

// For these the server's own sentence names the thing that is wrong ("Notifications", "billing", "at most 100"), so
// it is better than the general one, whenever it is there.
const PREFER_SERVER_DETAIL = new Set([
  ACCESS_ERROR_CODES.AREA_REQUIRED,
  ACCESS_ERROR_CODES.AREAS_INVALID,
  ACCESS_ERROR_CODES.BULK_INVALID,
]);

const isText = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * The sentence to show for an answer from the server.
 * @param {string|null|undefined} code the code the server sent
 * @param {string|null|undefined} serverMessage the message the server sent
 * @param {string} fallback shown when there is neither a known code nor a message
 */
export const accessErrorMessage = (code, serverMessage, fallback) => {
  // Own properties only: a code like "constructor" must not find something on the object's prototype
  const known = typeof code === 'string' && Object.prototype.hasOwnProperty.call(MESSAGES, code) ? MESSAGES[code] : undefined;
  if (known) {
    return PREFER_SERVER_DETAIL.has(code) && isText(serverMessage) ? serverMessage : known;
  }
  return isText(serverMessage) ? serverMessage : fallback;
};

/** The code of an error, whether it is an axios error or one of our own API errors. */
export const errorCodeOf = (error) => {
  const code = error?.response?.data?.code ?? error?.code;
  return typeof code === 'string' ? code : null;
};

export const errorStatusOf = (error) => {
  const status = error?.response?.status ?? error?.status;
  return Number.isInteger(status) ? status : null;
};

/**
 * True when the server refused because a content creator does not have the area (a 403 with that code).
 * Not true for any other 403, and never for a 401 (a 401 means signed out, which is a different thing).
 */
export const isAccessAreaRequiredError = (error) =>
  errorStatusOf(error) === 403 && errorCodeOf(error) === ACCESS_ERROR_CODES.AREA_REQUIRED;
