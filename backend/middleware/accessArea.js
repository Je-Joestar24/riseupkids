/**
 * Access-area lock for content creators (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md).
 *
 * Put it AFTER `protect` and `authorize(...)`:
 *
 *   router.use(protect);
 *   router.use(authorize('admin', 'teacher', 'content_creator'));
 *   router.use(requireAccessArea('contents'));
 *
 * `authorize` decides which ROLES may enter a route; this only narrows a CONTENT CREATOR down to the areas an admin
 * gave her. Every other role passes straight through (admins and teachers are never limited, and a parent or child
 * that `authorize` let in is not this middleware's business).
 *
 * A creator without the area gets a 403 with code ACCESS_AREA_REQUIRED, from the central error handler. Always 403,
 * never 401: the web app logs a person out on a 401.
 */
const { CONTENT_CREATOR_ROLE, isKnownArea, userHasArea } = require('../utils/accessAreas');
const { AccessAreaError } = require('../utils/accessErrors');

/**
 * Passes a creator who has AT LEAST ONE of the areas (for the few shared reads, e.g. the list of built-in books that
 * both the Built-in Books page and the Contents page need).
 * @param {...string} areas
 */
const requireAnyAccessArea = (...areas) => {
  // A typo in a route file must stop the server from starting, not silently lock (or open) a route.
  if (areas.length === 0 || !areas.every(isKnownArea)) {
    throw new Error(`requireAccessArea: unknown access area in [${areas.join(', ')}]`);
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please authenticate first.',
      });
    }

    if (req.user.role !== CONTENT_CREATOR_ROLE) {
      return next();
    }

    if (areas.some((area) => userHasArea(req.user, area))) {
      return next();
    }

    return next(new AccessAreaError(areas[0]));
  };
};

/** @param {string} area one of the keys in utils/accessAreas.js */
const requireAccessArea = (area) => requireAnyAccessArea(area);

module.exports = { requireAccessArea, requireAnyAccessArea };
