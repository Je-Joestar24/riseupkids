const { StarEarning, ChildStats } = require('../models');
const { scheduleBadgeUpdate } = require('../utils/scheduleBadgeUpdate.util');
const {
  MAX_REPLAYS,
  REPLAY_DUPLICATE_WINDOW_MS,
  getReplayStars,
  getReplaysLeft,
} = require('../utils/contentReplayStars.util');

/**
 * Pays the replay reward (2 stars, at most 5 times: see utils/contentReplayStars.util.js) for a book or video the
 * child has already finished every required time.
 *
 * Every replay is a StarEarning marked `metadata.replay: true` with its own number, so the count is simply how many
 * of those exist for this child and this content; nothing else has to be stored.
 *
 * Never pays twice for the same moment: a second call within a few seconds, or for a replay number that is already
 * recorded, pays nothing.
 *
 * @param {{ childId: any, sourceType: 'book'|'video', contentId: any, contentType: 'Book'|'Media', title?: string }} input
 * @returns {Promise<{ stars: number, replayNumber: number, replaysLeft: number, maxReplays: number, totalStars: number|null, skipped: 'max'|'duplicate'|null }>}
 */
async function awardReplayStars({ childId, sourceType, contentId, contentType, title = '' }) {
  const base = { child: childId, 'source.type': sourceType, 'source.contentId': contentId, 'source.metadata.replay': true };

  const paid = await StarEarning.countDocuments(base);
  const stars = getReplayStars(paid);

  if (stars <= 0) {
    return { stars: 0, replayNumber: paid, replaysLeft: 0, maxReplays: MAX_REPLAYS, totalStars: null, skipped: 'max' };
  }

  const replayNumber = paid + 1;
  const tooSoon = await StarEarning.findOne({
    ...base,
    createdAt: { $gte: new Date(Date.now() - REPLAY_DUPLICATE_WINDOW_MS) },
  });
  const alreadyRecorded = await StarEarning.findOne({ ...base, 'source.metadata.replayNumber': replayNumber });

  if (tooSoon || alreadyRecorded) {
    return { stars: 0, replayNumber: paid, replaysLeft: getReplaysLeft(paid), maxReplays: MAX_REPLAYS, totalStars: null, skipped: 'duplicate' };
  }

  await StarEarning.create({
    child: childId,
    stars,
    source: {
      type: sourceType,
      contentId,
      contentType,
      metadata: { replay: true, replayNumber, maxReplays: MAX_REPLAYS, title },
    },
    description: `Earned ${stars} stars for replaying "${title}" (replay ${replayNumber} of ${MAX_REPLAYS})`,
  });

  const childStats = await ChildStats.getOrCreate(childId);
  await childStats.addStars(stars);

  // Badges must not delay the star-reward response
  scheduleBadgeUpdate(childId);

  return {
    stars,
    replayNumber,
    replaysLeft: getReplaysLeft(replayNumber),
    maxReplays: MAX_REPLAYS,
    totalStars: childStats.totalStars,
    skipped: null,
  };
}

module.exports = { awardReplayStars };
