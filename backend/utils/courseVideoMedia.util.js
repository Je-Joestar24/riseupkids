const {
  Activity,
  AudioAssignment,
  Book,
  Chant,
  CmsBook,
  Course,
  Media,
} = require('../models');
const { COURSE_VIDEO_MEDIA_TAG } = require('../constants/courseVideoMedia');
const { EXPLORE_VIDEO_MEDIA_TAG } = require('../constants/exploreVideoTypes');
const { getExploreVideoMediaIds } = require('./exploreVideoMedia.util');
const { getStarCamMissionVideoMediaIds } = require('./starCamMissionMedia.util');

function addId(set, value) {
  if (value) set.add(String(value));
}

function collectCmsBookVideoIds(books = []) {
  const ids = new Set();
  for (const book of books) {
    for (const page of book.pages || []) {
      addId(ids, page?.media?.videoMediaId);
    }
  }
  return ids;
}

function collectReferenceIds(rows = [], fields = []) {
  const ids = new Set();
  for (const row of rows) {
    for (const field of fields) {
      addId(ids, row?.[field]);
    }
  }
  return ids;
}

/**
 * Media IDs that belong to other features (CMS books, SCORM packages, explore, missions, etc.)
 * and must never appear on the course Videos content admin list.
 */
async function getInternalVideoMediaIds() {
  const [
    exploreIds,
    missionIds,
    activities,
    books,
    chants,
    audioAssignments,
    videoScormChildren,
    cmsBooks,
  ] = await Promise.all([
    getExploreVideoMediaIds(),
    getStarCamMissionVideoMediaIds(),
    Activity.find({}).select('scormFile').lean(),
    Book.find({ scormFile: { $ne: null } }).select('scormFile').lean(),
    Chant.find({}).select('instructionVideo scormFile').lean(),
    AudioAssignment.find({}).select('instructionVideo scormFile').lean(),
    Media.find({ scormFile: { $ne: null } }).select('scormFile').lean(),
    CmsBook.find({}).select('pages').lean(),
  ]);

  const ids = new Set([...exploreIds, ...missionIds]);

  for (const id of collectReferenceIds(activities, ['scormFile'])) ids.add(id);
  for (const id of collectReferenceIds(books, ['scormFile'])) ids.add(id);
  for (const id of collectReferenceIds(chants, ['instructionVideo', 'scormFile'])) ids.add(id);
  for (const id of collectReferenceIds(audioAssignments, ['instructionVideo', 'scormFile'])) ids.add(id);
  for (const row of videoScormChildren) addId(ids, row.scormFile);
  for (const id of collectCmsBookVideoIds(cmsBooks)) ids.add(id);

  return [...ids];
}

/**
 * Media IDs that are eligible to be tagged as course Videos content.
 */
async function getCourseVideoCandidateMediaIds() {
  const internalIds = await getInternalVideoMediaIds();
  const internalIdSet = new Set(internalIds);

  const courses = await Course.find({ 'contents.contentType': 'video' })
    .select('contents')
    .lean();

  const courseVideoIds = new Set();
  for (const course of courses) {
    for (const item of course.contents || []) {
      if (item?.contentType === 'video' && item?.contentId) {
        const id = String(item.contentId);
        if (!internalIdSet.has(id)) {
          courseVideoIds.add(id);
        }
      }
    }
  }

  const legacyCandidates = await Media.find({
    type: 'video',
    _id: { $nin: internalIds },
    tags: { $nin: [EXPLORE_VIDEO_MEDIA_TAG] },
    videoSource: { $in: ['upload', 'embed'] },
  })
    .select('_id')
    .lean();

  const candidateIds = new Set(courseVideoIds);
  for (const media of legacyCandidates) {
    candidateIds.add(String(media._id));
  }

  return [...candidateIds];
}

function isCourseVideoMedia(video) {
  return Array.isArray(video?.tags) && video.tags.includes(COURSE_VIDEO_MEDIA_TAG);
}

module.exports = {
  COURSE_VIDEO_MEDIA_TAG,
  getInternalVideoMediaIds,
  getCourseVideoCandidateMediaIds,
  isCourseVideoMedia,
};
