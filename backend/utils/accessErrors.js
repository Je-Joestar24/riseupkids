/**
 * Errors for content creator access areas.
 *
 * Each one carries the HTTP status and a `publicCode`: a short fixed string the web app reads (never the message
 * wording) to decide what to show. `publicCode` is an explicit opt-in: the central error handler only sends a code
 * to the client when an error has one, so a raw library error (e.g. a Mongo code 11000, or ECONNREFUSED) never leaks
 * through by accident.
 *
 * A refusal because of missing access is ALWAYS 403, never 401: the web app logs a person out on a 401.
 */
const { ACCESS_AREAS, ACCESS_ERROR_CODES, isKnownArea, validateAreas } = require('./accessAreas');

class AccessError extends Error {
  constructor(statusCode, publicCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.publicCode = publicCode;
  }
}

/** 403: the creator does not have this area. */
class AccessAreaError extends AccessError {
  constructor(area) {
    const label = isKnownArea(area) ? ACCESS_AREAS.find((item) => item.key === area).label : null;
    super(
      403,
      ACCESS_ERROR_CODES.AREA_REQUIRED,
      label
        ? `You don't have access to ${label}. Ask an admin if you need it.`
        : "You don't have access to this area. Ask an admin if you need it."
    );
    this.area = isKnownArea(area) ? area : null;
  }
}

/** 400: the access list (or a bulk request) sent by an admin is not acceptable. */
class AccessValidationError extends AccessError {
  constructor(publicCode, message) {
    super(400, publicCode, message);
  }
}

/** 404: no content creator with that id. */
class ContentCreatorNotFoundError extends AccessError {
  // The default text is the same one the creator screens have always shown, so nothing reads differently.
  constructor(message = 'Content creator not found') {
    super(404, ACCESS_ERROR_CODES.CREATOR_NOT_FOUND, message);
  }
}

/**
 * Checks a list from a request and returns the clean list (no duplicates, canonical order), or throws the matching
 * AccessValidationError. Call it BEFORE any write.
 * @param {*} input
 * @returns {string[]}
 */
const assertValidAreas = (input) => {
  const result = validateAreas(input);
  if (!result.ok) {
    throw new AccessValidationError(result.code, result.message);
  }
  return result.areas;
};

/** An access list was sent for someone who is not a content creator (a parent, a teacher, ...). */
const accessAreasNotForRoleError = () =>
  new AccessValidationError(ACCESS_ERROR_CODES.AREAS_NOT_FOR_ROLE, 'Access areas only apply to content creators.');

/** A bulk request that cannot be run (empty, too many, a bad id...). */
const bulkRequestError = (message) => new AccessValidationError(ACCESS_ERROR_CODES.BULK_INVALID, message);

const isAccessError = (error) => error instanceof AccessError;

/**
 * The JSON body for an access error, in the shape the whole API uses: { success, message, code }.
 * @param {AccessError} error
 */
const accessErrorBody = (error) => ({
  success: false,
  message: error.message,
  code: error.publicCode,
});

/**
 * For controllers that catch their own errors: answers with the right status and body when the error is an access
 * error, and says whether it did. When it returns false the caller handles the error as before.
 *
 *   } catch (error) {
 *     if (respondWithAccessError(res, error)) return;
 *     ...
 */
const respondWithAccessError = (res, error) => {
  if (!isAccessError(error)) return false;
  res.status(error.statusCode).json(accessErrorBody(error));
  return true;
};

module.exports = {
  AccessError,
  AccessAreaError,
  AccessValidationError,
  ContentCreatorNotFoundError,
  assertValidAreas,
  accessAreasNotForRoleError,
  bulkRequestError,
  isAccessError,
  accessErrorBody,
  respondWithAccessError,
};
