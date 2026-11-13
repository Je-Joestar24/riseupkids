/**
 * Child side of the Experiences (what the app and the website read): only the experiences an admin has
 * published, in the order the admin chose, with nothing that belongs to the admin (no internal ids, no
 * draft state, no author, no dates).
 *
 * A draft, a deleted experience, an unknown id and a malformed id are all answered the same way (not found),
 * so a child can never find out that a hidden experience exists.
 */

const Experience = require('../models/Experience');
const { ExperienceError, isValidExperienceUuid } = require('../utils/experienceValidation.util');

/** A safety net, not a page size: the admin list is small, and the app shows it as one list. */
const CHILD_LIST_MAX = 100;

// Only what the child screens use. Everything else stays in the database.
const LIST_FIELDS = 'uuid title description coverImage videos._id';
const DETAIL_FIELDS = 'uuid title description coverImage videos printable';

function notFound() {
  return new ExperienceError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found.');
}

/** One card of the list. */
function toListItem(doc) {
  return {
    uuid: doc.uuid,
    title: doc.title,
    description: doc.description || '',
    coverImage: doc.coverImage || null,
    videoCount: Array.isArray(doc.videos) ? doc.videos.length : 0,
  };
}

/**
 * What a child can print, or null when there is nothing to print.
 * `kind` says what the button opens: an uploaded `file` (with its readable name) or a `link`. A picture
 * alone (no link, no file) has nothing to open, so `kind` and `url` are null and the app shows no button.
 */
function toPrintable(printable) {
  const data = printable || {};
  const image = data.image || null;
  const file = data.file || null;
  const link = data.link || '';
  if (!image && !file && !link) return null;

  // Never both; if an older record somehow holds both, the uploaded file wins.
  const kind = file ? 'file' : link ? 'link' : null;
  return {
    image,
    kind,
    url: kind === 'file' ? file : kind === 'link' ? link : null,
    fileName: kind === 'file' ? data.fileName || '' : '',
    button: data.button || '',
  };
}

/** The whole experience for the page. The order of the list is the order the child sees. */
function toChildDetail(doc) {
  return {
    uuid: doc.uuid,
    title: doc.title,
    description: doc.description || '',
    coverImage: doc.coverImage || null,
    videos: (doc.videos || []).map((video, index) => ({
      id: String(video._id),
      title: video.title,
      embedUrl: video.embedUrl,
      position: index + 1,
    })),
    printable: toPrintable(doc.printable),
  };
}

/** Published experiences, in the order the admin set (ties: oldest first, the same rule the admin list uses). */
async function listPublished() {
  const docs = await Experience.find({ isPublished: true })
    .select(LIST_FIELDS)
    .sort({ order: 1, createdAt: 1 })
    .limit(CHILD_LIST_MAX)
    .lean();
  return docs.map(toListItem);
}

/** One published experience by its public id; not found for anything else. */
async function getPublished(uuid) {
  if (!isValidExperienceUuid(uuid)) throw notFound();
  const doc = await Experience.findOne({ uuid, isPublished: true }).select(DETAIL_FIELDS).lean();
  if (!doc) throw notFound();
  return toChildDetail(doc);
}

module.exports = { listPublished, getPublished, toChildDetail, toPrintable, CHILD_LIST_MAX };
