/**
 * Child side of the Experiences (/api/experiences): turns the service's outcomes into HTTP answers.
 *
 *   200 { success, data }                    the list, or one experience
 *   401 (login middleware)                   not signed in
 *   404 EXPERIENCE_NOT_FOUND                 no such experience, not published, or a malformed id
 *
 * Anything unexpected (a database error, a bug) goes to the central error handler as a 500, never as a 401,
 * so a server problem can never log a child's app out.
 */

const service = require('../services/experienceChild.service');
const { ExperienceError } = require('../utils/experienceValidation.util');

// The answer depends on who is signed in and must reflect an unpublish straight away, so nothing keeps a copy.
const noCopies = (res) => res.set('Cache-Control', 'private, no-cache');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof ExperienceError) {
      const body = { success: false, code: error.code, message: error.message };
      if (req.id) body.requestId = req.id;
      return res.status(error.statusCode).json(body);
    }
    return next(error);
  }
};

/** @route GET /api/experiences */
const list = handle(async (req, res) => {
  const data = await service.listPublished();
  noCopies(res);
  res.status(200).json({ success: true, data });
});

/** @route GET /api/experiences/:uuid */
const getOne = handle(async (req, res) => {
  const data = await service.getPublished(req.params.uuid);
  noCopies(res);
  res.status(200).json({ success: true, data });
});

module.exports = { list, getOne };
