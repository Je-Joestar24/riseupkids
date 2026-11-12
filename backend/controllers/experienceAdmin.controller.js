/**
 * Admin Experiences (/api/admin/experiences): turns the service's outcomes into HTTP answers.
 *
 * Every answer has `success`. A problem the admin can fix is answered with its own status and a stable
 * `code` (and `errors` listing each field when there are several); anything unexpected goes to the
 * central error handler, which hides the details in production.
 *
 *   400 VALIDATION_FAILED / NOTHING_TO_UPDATE   the input is not acceptable (see `errors`)
 *   401 / 403                                   not signed in / not an admin (from the auth middleware)
 *   404 EXPERIENCE_NOT_FOUND / VIDEO_NOT_FOUND  no such experience or video (also for a malformed id)
 *   409 EXPERIENCE_CONFLICT / REORDER_STALE /   someone else changed it in the meantime
 *       VIDEO_REORDER_STALE
 *   413 / 415 (upload middleware)               picture too large / wrong type
 *   422 PUBLISH_BLOCKED                         it is not complete enough to be published
 *   502 IMAGE_UPLOAD_FAILED                     the picture could not be stored
 */

const logger = require('../config/logger');
const service = require('../services/experienceAdmin.service');
const { ExperienceError, parseListQuery } = require('../utils/experienceValidation.util');

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function respondWithExperienceError(req, res, error) {
  const body = { success: false, code: error.code, message: error.message };
  if (Array.isArray(error.errors) && error.errors.length) body.errors = error.errors;
  if (req.id) body.requestId = req.id;
  return res.status(error.statusCode).json(body);
}

/** Runs a handler; an `ExperienceError` becomes its answer, anything else goes to the central handler. */
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof ExperienceError) return respondWithExperienceError(req, res, error);
    return next(error);
  }
};

/** In a multipart form the list and the printable arrive as JSON text. */
function parseJsonField(value, field) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new ExperienceError(400, 'VALIDATION_FAILED', 'Please fix the highlighted fields.', [
      { field, message: `${field} is not valid JSON.` },
    ]);
  }
}

/** Only the fields an admin may set are read from the body (nothing else can be injected). */
function readInput(req) {
  const body = isObject(req.body) ? req.body : {};
  const input = {};
  for (const key of ['title', 'description', 'isPublished']) {
    if (has(body, key)) input[key] = body[key];
  }
  for (const key of ['videos', 'printable']) {
    if (has(body, key)) input[key] = parseJsonField(body[key], key);
  }
  return input;
}

const truthy = (value) => value === true || value === 'true';

function readFiles(req) {
  const files = req.files || {};
  return {
    coverImage: files.coverImage && files.coverImage[0],
    printableImage: files.printableImage && files.printableImage[0],
  };
}

const list = handle(async (req, res) => {
  const { value, errors } = parseListQuery(req.query);
  if (errors.length) {
    throw new ExperienceError(400, 'VALIDATION_FAILED', 'Please fix the highlighted fields.', errors);
  }
  const { items, pagination, counts } = await service.listExperiences(value);
  res.status(200).json({ success: true, data: items, pagination, counts });
});

const getOne = handle(async (req, res) => {
  const data = await service.getExperience(req.params.uuid);
  res.status(200).json({ success: true, data });
});

const create = handle(async (req, res) => {
  const data = await service.createExperience(readInput(req), {
    files: readFiles(req),
    userId: req.user && req.user._id,
  });
  logger.info({ userId: String(req.user._id), uuid: data.uuid }, '[Experience] created');
  res.status(201).json({ success: true, message: 'Experience created.', data });
});

const update = handle(async (req, res) => {
  const body = isObject(req.body) ? req.body : {};
  const data = await service.updateExperience(req.params.uuid, readInput(req), {
    files: readFiles(req),
    userId: req.user && req.user._id,
    removeCoverImage: truthy(body.removeCoverImage),
    removePrintableImage: truthy(body.removePrintableImage),
    expectedUpdatedAt: body.expectedUpdatedAt,
  });
  logger.info({ userId: String(req.user._id), uuid: data.uuid }, '[Experience] updated');
  res.status(200).json({ success: true, message: 'Experience updated.', data });
});

const publish = handle(async (req, res) => {
  const { experience, changed } = await service.setPublished(req.params.uuid, true, { userId: req.user._id });
  if (changed) logger.info({ userId: String(req.user._id), uuid: experience.uuid }, '[Experience] published');
  res.status(200).json({
    success: true,
    message: changed ? 'Experience published.' : 'Experience was already published.',
    data: experience,
  });
});

const unpublish = handle(async (req, res) => {
  const { experience, changed } = await service.setPublished(req.params.uuid, false, { userId: req.user._id });
  if (changed) logger.info({ userId: String(req.user._id), uuid: experience.uuid }, '[Experience] unpublished');
  res.status(200).json({
    success: true,
    message: changed ? 'Experience unpublished.' : 'Experience was already a draft.',
    data: experience,
  });
});

const reorder = handle(async (req, res) => {
  const body = isObject(req.body) ? req.body : {};
  const data = await service.reorderExperiences(body.order);
  logger.info({ userId: String(req.user._id), count: data.length }, '[Experience] reordered');
  res.status(200).json({ success: true, message: 'Order saved.', data });
});

const reorderVideos = handle(async (req, res) => {
  const body = isObject(req.body) ? req.body : {};
  const data = await service.reorderVideos(req.params.uuid, body.order, {
    userId: req.user._id,
    expectedUpdatedAt: body.expectedUpdatedAt,
  });
  logger.info({ userId: String(req.user._id), uuid: data.uuid }, '[Experience] videos reordered');
  res.status(200).json({ success: true, message: 'Video order saved.', data });
});

const moveVideo = handle(async (req, res) => {
  const body = isObject(req.body) ? req.body : {};
  const { experience, changed } = await service.moveVideo(req.params.uuid, req.params.videoId, body.position, {
    userId: req.user._id,
    expectedUpdatedAt: body.expectedUpdatedAt,
  });
  if (changed) logger.info({ userId: String(req.user._id), uuid: experience.uuid }, '[Experience] video moved');
  res.status(200).json({
    success: true,
    message: changed ? 'Video moved.' : 'Video was already at that position.',
    data: experience,
  });
});

const remove = handle(async (req, res) => {
  const data = await service.deleteExperience(req.params.uuid);
  logger.info({ userId: String(req.user._id), uuid: data.uuid }, '[Experience] deleted');
  res.status(200).json({ success: true, message: 'Experience deleted.', data });
});

module.exports = { list, getOne, create, update, publish, unpublish, reorder, reorderVideos, moveVideo, remove };
