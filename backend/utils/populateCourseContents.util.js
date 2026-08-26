/**
 * Batch-populate course.contents (one query per content type) instead of
 * findById per item. Response shape matches the previous sequential populate.
 */

const { Activity, Book, Media, AudioAssignment, Chant } = require('../models');

function idKey(id) {
  return id == null ? '' : String(id);
}

function indexById(docs) {
  const map = {};
  for (const doc of docs || []) {
    if (doc && doc._id != null) {
      map[idKey(doc._id)] = doc;
    }
  }
  return map;
}

async function safeQuery(label, promise) {
  try {
    return await promise;
  } catch (error) {
    console.error(`Error populating course ${label}:`, error);
    return [];
  }
}

/**
 * @param {Array<{ contentId?: unknown, contentType?: string, order?: number, step?: number, addedAt?: unknown }>} contents
 * @returns {Promise<Array<object>>}
 */
async function populateCourseContents(contents) {
  const items = Array.isArray(contents) ? contents : [];
  const idsByType = {
    activity: [],
    book: [],
    video: [],
    audioAssignment: [],
    chant: [],
  };

  for (const item of items) {
    const type = item.contentType;
    if (idsByType[type] && item.contentId) {
      idsByType[type].push(item.contentId);
    }
  }

  const [activities, books, videos, audios, chants] = await Promise.all([
    idsByType.activity.length
      ? safeQuery(
          'activities',
          Activity.find({ _id: { $in: idsByType.activity } })
            .populate('scormFile', 'type title url mimeType size')
            .populate('badgeAwarded', 'name description icon image category rarity')
            .lean()
        )
      : Promise.resolve([]),
    idsByType.book.length
      ? safeQuery(
          'books',
          Book.find({ _id: { $in: idsByType.book } })
            .populate('scormFile', 'type title url mimeType size')
            .populate('cmsBookId', 'title description status language version isArchived')
            .populate('badgeAwarded', 'name description icon image category rarity')
            .lean()
        )
      : Promise.resolve([]),
    idsByType.video.length
      ? safeQuery(
          'videos',
          Media.find({ _id: { $in: idsByType.video }, type: 'video' })
            .populate('scormFile', 'type title url mimeType size')
            .populate('cmsBookId', 'title description status language version isArchived pages')
            .populate('badgeAwarded', 'name description icon image category rarity')
            .lean()
        )
      : Promise.resolve([]),
    idsByType.audioAssignment.length
      ? safeQuery(
          'audio assignments',
          AudioAssignment.find({ _id: { $in: idsByType.audioAssignment } })
            .populate('referenceAudio', 'type title url mimeType size duration')
            .populate('scormFile', 'type title url mimeType size')
            .populate('badgeAwarded', 'name description icon image category rarity')
            .lean()
        )
      : Promise.resolve([]),
    idsByType.chant.length
      ? safeQuery(
          'chants',
          Chant.find({ _id: { $in: idsByType.chant } })
            .populate('audio', 'type title url mimeType size duration')
            .populate({
              path: 'instructionVideo',
              select: 'type title url mimeType size duration embedUrl cloudUrl filePath videoSource',
            })
            .populate('scormFile', 'type title url mimeType size')
            .populate('badgeAwarded', 'name description icon image category rarity')
            .lean()
        )
      : Promise.resolve([]),
  ]);

  const activityMap = indexById(activities);
  const bookMap = indexById(books);
  const videoMap = indexById(videos);
  const audioMap = indexById(audios);
  const chantMap = indexById(chants);

  const populatedContents = [];

  for (const contentItem of items) {
    const key = idKey(contentItem.contentId);
    let contentData = null;

    if (contentItem.contentType === 'activity') {
      const activity = activityMap[key];
      contentData = activity ? { ...activity, _contentType: 'activity' } : null;
    } else if (contentItem.contentType === 'book') {
      const book = bookMap[key];
      contentData = book ? { ...book, _contentType: 'book' } : null;
    } else if (contentItem.contentType === 'video') {
      const video = videoMap[key];
      if (video) {
        contentData = {
          ...video,
          _contentType: 'video',
          coverImage: video.thumbnail || video.coverImage,
        };
      }
    } else if (contentItem.contentType === 'audioAssignment') {
      const audio = audioMap[key];
      contentData = audio ? { ...audio, _contentType: 'audioAssignment' } : null;
    } else if (contentItem.contentType === 'chant') {
      const chant = chantMap[key];
      contentData = chant ? { ...chant, _contentType: 'chant' } : null;
    }

    if (contentData) {
      populatedContents.push({
        ...contentData,
        _order: contentItem.order,
        _step: contentItem.step || 1,
        _addedAt: contentItem.addedAt,
        _contentId: contentItem.contentId,
        _contentType: contentItem.contentType,
      });
    }
  }

  populatedContents.sort((a, b) => {
    const stepA = a._step || 1;
    const stepB = b._step || 1;
    if (stepA !== stepB) return stepA - stepB;
    const typeA = a._contentType || '';
    const typeB = b._contentType || '';
    if (typeA !== typeB) return typeA.localeCompare(typeB);
    return (a._order || 0) - (b._order || 0);
  });

  return populatedContents;
}

module.exports = { populateCourseContents, idKey, indexById };
