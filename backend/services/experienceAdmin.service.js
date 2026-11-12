/**
 * Admin side of the Experiences (title, description, cover, ordered list of Bunny videos, optional
 * printable). All the rules live here; the controller only turns the outcome into an HTTP answer.
 *
 * Problems an admin can fix are thrown as `ExperienceError` (status + stable code + readable message,
 * and the field-level problems when there are some). Anything else is unexpected and is left to the
 * central error handler.
 */

const Experience = require('../models/Experience');
const s3Service = require('./s3.service');
const logger = require('../config/logger');
const {
  ExperienceError,
  LIMITS,
  isValidExperienceUuid,
  isValidVideoId,
  validateExperienceInput,
  findPublishProblems,
  escapeRegex,
} = require('../utils/experienceValidation.util');

const IMAGE_FOLDER = 'experiences/images';

// ---------------------------------------------------------------- output shapes

const asId = (value) => (value === undefined || value === null ? null : String(value));

/** The whole experience, as the editor needs it. The internal database id is never returned. */
function toDetail(doc) {
  return {
    uuid: doc.uuid,
    title: doc.title,
    description: doc.description || '',
    coverImage: doc.coverImage || null,
    videos: (doc.videos || []).map((video, index) => ({
      id: asId(video._id),
      title: video.title,
      embedUrl: video.embedUrl,
      // Stored positions are kept in step with the list; the place in the list covers an older record without one.
      position: video.position || index + 1,
    })),
    printable: {
      image: (doc.printable && doc.printable.image) || null,
      link: (doc.printable && doc.printable.link) || '',
      button: (doc.printable && doc.printable.button) || '',
    },
    order: doc.order || 0,
    isPublished: Boolean(doc.isPublished),
    publishedAt: doc.publishedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** One row of the list page. */
function toSummary(doc) {
  return {
    uuid: doc.uuid,
    title: doc.title,
    description: doc.description || '',
    coverImage: doc.coverImage || null,
    videoCount: Array.isArray(doc.videos) ? doc.videos.length : 0,
    order: doc.order || 0,
    isPublished: Boolean(doc.isPublished),
    publishedAt: doc.publishedAt || null,
    updatedAt: doc.updatedAt,
  };
}

// ---------------------------------------------------------------- helpers

function notFound() {
  return new ExperienceError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found.');
}

async function findByUuidOrThrow(uuid) {
  // A malformed id can never match, so it is "not found" (and never reaches the database).
  if (!isValidExperienceUuid(uuid)) throw notFound();
  const doc = await Experience.findOne({ uuid });
  if (!doc) throw notFound();
  return doc;
}

async function uploadImage(file) {
  try {
    const { url } = await s3Service.uploadFileFromMulter(file, IMAGE_FOLDER);
    return url;
  } catch (error) {
    logger.error({ err: error.message }, '[Experience] picture upload failed');
    throw new ExperienceError(502, 'IMAGE_UPLOAD_FAILED', 'We could not save the picture. Please try again.');
  }
}

/** Removes a picture from storage. Never throws: a leftover file must not fail the admin's request. */
async function deleteImageQuietly(url) {
  if (!url || typeof url !== 'string') return;
  try {
    const key = s3Service.getS3KeyFromUrl(url);
    if (key) await s3Service.deleteByKey(key);
  } catch (error) {
    logger.warn({ err: error.message }, '[Experience] could not delete a stored picture');
  }
}

const STALE_MESSAGE = 'Someone else changed this experience while you were editing. Reload it and try again.';

/**
 * Refuses the request when the editor's copy is out of date (`expectedUpdatedAt` is what the editor loaded).
 * Without it nothing is checked: the last save wins.
 */
function assertNotStale(doc, expectedUpdatedAt) {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === null || expectedUpdatedAt === '') return;
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw validationFailed([{ field: 'expectedUpdatedAt', message: 'expectedUpdatedAt must be a date.' }]);
  }
  if (expected.getTime() !== new Date(doc.updatedAt).getTime()) {
    throw new ExperienceError(409, 'EXPERIENCE_CONFLICT', STALE_MESSAGE);
  }
}

/** Saves, turning a concurrent change of the video list (Mongoose VersionError) into the same 409. */
async function saveOrConflict(doc) {
  try {
    await doc.save();
  } catch (error) {
    if (error && error.name === 'VersionError') {
      throw new ExperienceError(409, 'EXPERIENCE_CONFLICT', STALE_MESSAGE);
    }
    throw error;
  }
}

function validationFailed(errors) {
  return new ExperienceError(400, 'VALIDATION_FAILED', 'Please fix the highlighted fields.', errors);
}

function publishBlocked(problems, message = 'This experience cannot be published yet.') {
  return new ExperienceError(422, 'PUBLISH_BLOCKED', message, problems);
}

// ---------------------------------------------------------------- operations

/**
 * The list page: filters, search by title, paging, and counts for the tabs.
 * @param {{ status: 'all'|'published'|'draft', search: string, page: number, limit: number }} query already checked
 */
async function listExperiences({ status = 'all', search = '', page = 1, limit = LIMITS.PAGE_SIZE_DEFAULT } = {}) {
  const filter = {};
  if (status === 'published') filter.isPublished = true;
  if (status === 'draft') filter.isPublished = false;
  if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

  const [total, items, all, published] = await Promise.all([
    Experience.countDocuments(filter),
    Experience.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Experience.countDocuments({}),
    Experience.countDocuments({ isPublished: true }),
  ]);

  return {
    items: items.map(toSummary),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    counts: { all, published, draft: all - published },
  };
}

async function getExperience(uuid) {
  return toDetail(await findByUuidOrThrow(uuid));
}

/**
 * @param {object} input request body
 * @param {{ files?: { coverImage?: object, printableImage?: object }, userId?: unknown }} [context]
 */
async function createExperience(input, { files = {}, userId = null } = {}) {
  const { value, errors } = validateExperienceInput(input);
  if (errors.length) throw validationFailed(errors);

  const wantsPublish = value.isPublished === true;
  if (wantsPublish) {
    const problems = findPublishProblems(value);
    if (problems.length) throw publishBlocked(problems);
  }

  const uploaded = [];
  try {
    let coverImage = null;
    let printableImage = null;
    if (files.coverImage) {
      coverImage = await uploadImage(files.coverImage);
      uploaded.push(coverImage);
    }
    if (files.printableImage) {
      printableImage = await uploadImage(files.printableImage);
      uploaded.push(printableImage);
    }

    // New experiences go to the end of the list.
    const last = await Experience.findOne().sort({ order: -1 }).select('order').lean();

    const printable = value.printable || {};
    const doc = await Experience.create({
      title: value.title,
      description: value.description || '',
      coverImage,
      videos: value.videos || [],
      printable: { image: printableImage, link: printable.link || '', button: printable.button || undefined },
      order: ((last && last.order) || 0) + 1,
      isPublished: wantsPublish,
      publishedAt: wantsPublish ? new Date() : null,
      createdBy: userId,
      updatedBy: userId,
    });
    return toDetail(doc);
  } catch (error) {
    // Do not leave pictures behind for an experience that was never saved.
    await Promise.all(uploaded.map(deleteImageQuietly));
    throw error;
  }
}

/**
 * Edits the fields that are sent; the others stay as they are.
 * `expectedUpdatedAt` (optional) is the `updatedAt` the editor loaded: when someone else saved in the
 * meantime the edit is refused instead of silently overwriting their work.
 */
async function updateExperience(
  uuid,
  input,
  { files = {}, userId = null, removeCoverImage = false, removePrintableImage = false, expectedUpdatedAt } = {}
) {
  const doc = await findByUuidOrThrow(uuid);

  assertNotStale(doc, expectedUpdatedAt);

  const { value, errors } = validateExperienceInput(input, { partial: true });
  if (errors.length) throw validationFailed(errors);

  const changesPictures = Boolean(files.coverImage || files.printableImage || removeCoverImage || removePrintableImage);
  if (Object.keys(value).length === 0 && !changesPictures) {
    throw new ExperienceError(400, 'NOTHING_TO_UPDATE', 'There is nothing to change. Send at least one field.');
  }

  if (value.title !== undefined) doc.title = value.title;
  if (value.description !== undefined) doc.description = value.description;
  if (value.videos !== undefined) doc.videos = value.videos;
  if (value.printable !== undefined) {
    doc.printable.link = value.printable.link;
    doc.printable.button = value.printable.button;
  }

  const willBePublished = value.isPublished !== undefined ? value.isPublished : doc.isPublished;
  if (willBePublished) {
    const problems = findPublishProblems(doc);
    if (problems.length) {
      throw publishBlocked(
        problems,
        doc.isPublished
          ? 'A published experience must keep a title and at least one video. Unpublish it first.'
          : 'This experience cannot be published yet.'
      );
    }
  }
  if (value.isPublished !== undefined && value.isPublished !== doc.isPublished) {
    doc.isPublished = value.isPublished;
    doc.publishedAt = value.isPublished ? new Date() : null;
  }

  const uploaded = [];
  const replaced = [];
  try {
    if (files.coverImage) {
      const url = await uploadImage(files.coverImage);
      uploaded.push(url);
      if (doc.coverImage) replaced.push(doc.coverImage);
      doc.coverImage = url;
    } else if (removeCoverImage && doc.coverImage) {
      replaced.push(doc.coverImage);
      doc.coverImage = null;
    }
    if (files.printableImage) {
      const url = await uploadImage(files.printableImage);
      uploaded.push(url);
      if (doc.printable.image) replaced.push(doc.printable.image);
      doc.printable.image = url;
    } else if (removePrintableImage && doc.printable.image) {
      replaced.push(doc.printable.image);
      doc.printable.image = null;
    }

    doc.updatedBy = userId;
    await doc.save();
  } catch (error) {
    await Promise.all(uploaded.map(deleteImageQuietly));
    if (error && error.name === 'VersionError') {
      throw new ExperienceError(409, 'EXPERIENCE_CONFLICT', STALE_MESSAGE);
    }
    throw error;
  }

  // Only after the save worked: the pictures that were replaced or removed.
  await Promise.all(replaced.map(deleteImageQuietly));
  return toDetail(doc);
}

/** The videos of an experience as plain rows, so they can be put in a new order. */
const plainVideos = (doc) => doc.videos.map((video) => ({ _id: video._id, title: video.title, embedUrl: video.embedUrl }));

/**
 * Puts the videos of one experience in a new order: the full list of video ids, every one exactly once.
 * If the videos no longer match (another admin added or removed one) nothing is saved. Positions are
 * numbered from the new order. This is an edit, so it changes `updatedAt`.
 * @param {string} uuid
 * @param {unknown} order video ids in the new order
 */
async function reorderVideos(uuid, order, { userId = null, expectedUpdatedAt } = {}) {
  const doc = await findByUuidOrThrow(uuid);
  assertNotStale(doc, expectedUpdatedAt);

  if (!Array.isArray(order) || order.length === 0) {
    throw validationFailed([{ field: 'order', message: 'Send the full list of video ids in the new order.' }]);
  }
  const errors = [];
  const seen = new Set();
  order.forEach((id, index) => {
    if (!isValidVideoId(id)) errors.push({ field: `order[${index}]`, message: 'Not a valid video id.' });
    else if (seen.has(id.toLowerCase())) errors.push({ field: `order[${index}]`, message: 'This video is listed twice.' });
    else seen.add(id.toLowerCase());
  });
  if (errors.length) throw validationFailed(errors);

  const byId = new Map(doc.videos.map((video) => [String(video._id), video]));
  if (order.length !== byId.size || order.some((id) => !byId.has(id.toLowerCase()))) {
    throw new ExperienceError(
      409,
      'VIDEO_REORDER_STALE',
      'The videos have changed since you opened this experience. Reload it and try again.'
    );
  }

  doc.videos = order.map((id) => {
    const video = byId.get(id.toLowerCase());
    return { _id: video._id, title: video.title, embedUrl: video.embedUrl };
  });
  doc.updatedBy = userId;
  await saveOrConflict(doc);
  return toDetail(doc);
}

/**
 * Moves one video to a position (1 = first); the others shift to make room. Asking for the place it is
 * already in changes nothing.
 * @returns {Promise<{ experience: object, changed: boolean }>}
 */
async function moveVideo(uuid, videoId, position, { userId = null, expectedUpdatedAt } = {}) {
  const doc = await findByUuidOrThrow(uuid);
  assertNotStale(doc, expectedUpdatedAt);

  const from = isValidVideoId(videoId) ? doc.videos.findIndex((video) => String(video._id) === videoId.toLowerCase()) : -1;
  if (from === -1) throw new ExperienceError(404, 'VIDEO_NOT_FOUND', 'Video not found in this experience.');

  const count = doc.videos.length;
  if (!Number.isInteger(position) || position < 1 || position > count) {
    throw validationFailed([{ field: 'position', message: `Position must be a whole number from 1 to ${count}.` }]);
  }
  if (from === position - 1) return { experience: toDetail(doc), changed: false };

  const videos = plainVideos(doc);
  const [moved] = videos.splice(from, 1);
  videos.splice(position - 1, 0, moved);
  doc.videos = videos;
  doc.updatedBy = userId;
  await saveOrConflict(doc);
  return { experience: toDetail(doc), changed: true };
}

/**
 * Publish or unpublish. Asking for the state it already has is not an error: nothing changes.
 * @returns {Promise<{ experience: object, changed: boolean }>}
 */
async function setPublished(uuid, publish, { userId = null } = {}) {
  const doc = await findByUuidOrThrow(uuid);
  if (doc.isPublished === publish) return { experience: toDetail(doc), changed: false };

  if (publish) {
    const problems = findPublishProblems(doc);
    if (problems.length) throw publishBlocked(problems);
  }
  doc.isPublished = publish;
  doc.publishedAt = publish ? new Date() : null;
  doc.updatedBy = userId;
  await doc.save();
  return { experience: toDetail(doc), changed: true };
}

/**
 * Saves a new order. The list must be complete: every experience exactly once. If it no longer matches
 * what is in the database (another admin added or deleted one) nothing is saved and the screen reloads.
 * @param {unknown} uuids experience ids in the new order
 */
async function reorderExperiences(uuids) {
  if (!Array.isArray(uuids) || uuids.length === 0) {
    throw validationFailed([{ field: 'order', message: 'Send the full list of experience ids in the new order.' }]);
  }
  const errors = [];
  const seen = new Set();
  uuids.forEach((id, index) => {
    if (!isValidExperienceUuid(id)) errors.push({ field: `order[${index}]`, message: 'Not a valid experience id.' });
    else if (seen.has(id)) errors.push({ field: `order[${index}]`, message: 'This experience is listed twice.' });
    else seen.add(id);
  });
  if (errors.length) throw validationFailed(errors);

  const existing = await Experience.find().select('uuid').lean();
  const known = new Set(existing.map((item) => item.uuid));
  if (uuids.length !== known.size || uuids.some((id) => !known.has(id))) {
    throw new ExperienceError(
      409,
      'REORDER_STALE',
      'The list has changed since you opened it. Refresh the page and try again.'
    );
  }

  // `timestamps: false`: moving an experience is not an edit, so it must not make other open editors conflict.
  await Experience.bulkWrite(
    uuids.map((uuid, index) => ({
      updateOne: { filter: { uuid }, update: { $set: { order: index + 1 } }, timestamps: false },
    }))
  );
  return uuids.map((uuid, index) => ({ uuid, order: index + 1 }));
}

/** Deletes for good (the admin confirms in the screen). The videos stay in Bunny: only links are stored. */
async function deleteExperience(uuid) {
  const doc = await findByUuidOrThrow(uuid);
  const pictures = [doc.coverImage, doc.printable && doc.printable.image];
  const deleted = await Experience.deleteOne({ _id: doc._id });
  // Someone else deleted it between our read and our delete: it is gone, which is what was asked.
  if (!deleted || deleted.deletedCount === 0) throw notFound();
  await Promise.all(pictures.map(deleteImageQuietly));
  return { uuid: doc.uuid, title: doc.title };
}

module.exports = {
  toDetail,
  toSummary,
  listExperiences,
  getExperience,
  createExperience,
  updateExperience,
  reorderVideos,
  moveVideo,
  setPublished,
  reorderExperiences,
  deleteExperience,
};
