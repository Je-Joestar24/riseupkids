const mongoose = require('mongoose');

const {
  Chant,
  ChantProgress,
  ChildProfile,
  ChildStats,
  Media,
  StarEarning,
} = require('../models');

const { awardBadgeForChant } = require('./badgeAward.service');
const s3Service = require('./s3.service');
const { INSTRUCTION_VIDEO_POPULATE_SELECT } = require('../utils/instructionVideoMedia.util');
const { scheduleBadgeUpdate } = require('../utils/scheduleBadgeUpdate.util');

const getOrCreateProgress = async ({ childId, chantId }) => {
  const progress = await ChantProgress.findOne({ child: childId, chant: chantId });
  if (progress) return progress;

  return await ChantProgress.create({
    child: childId,
    chant: chantId,
    status: 'not_started',
  });
};

const startChant = async ({ childId, chantId }) => {
  const [child, chant] = await Promise.all([
    ChildProfile.findById(childId).select('_id').lean(),
    Chant.findById(chantId).select('_id').lean(),
  ]);
  if (!child) throw new Error('Child not found');
  if (!chant) throw new Error('Chant not found');

  const progress = await getOrCreateProgress({ childId, chantId });
  if (progress.status === 'not_started') {
    progress.status = 'in_progress';
    await progress.save();
  }

  return await ChantProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'chant',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo audio',
      populate: [
        {
          path: 'instructionVideo',
          select: INSTRUCTION_VIDEO_POPULATE_SELECT,
        },
        {
          path: 'audio',
          select: 'type title url mimeType size duration',
        },
      ],
    })
    .lean();
};

const getChantProgress = async ({ childId, chantId }) => {
  const [child, chant] = await Promise.all([
    ChildProfile.findById(childId).select('_id').lean(),
    Chant.findById(chantId).select('_id').lean(),
  ]);
  if (!child) throw new Error('Child not found');
  if (!chant) throw new Error('Chant not found');

  const progress = await getOrCreateProgress({ childId, chantId });

  return await ChantProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'chant',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo audio',
      populate: [
        {
          path: 'instructionVideo',
          select: INSTRUCTION_VIDEO_POPULATE_SELECT,
        },
        {
          path: 'audio',
          select: 'type title url mimeType size duration',
        },
      ],
    })
    .lean();
};

const completeChant = async ({
  childId,
  chantId,
  uploadedByUserId,
  recordedAudioFile,
  timeSpent,
  metadata,
}) => {
  const chant = await Chant.findById(chantId).select('title starsAwarded badgeAwarded').lean();
  if (!chant) throw new Error('Chant not found');

  const child = await ChildProfile.findById(childId).select('_id displayName').lean();
  if (!child) throw new Error('Child not found');

  const progress = await getOrCreateProgress({ childId, chantId });

  if (recordedAudioFile) {
    const { url: audioUrl, s3Key } = await s3Service.uploadFileFromMulter(recordedAudioFile, 'scorm/chants');
    const recordedAudioMedia = await Media.create({
      type: 'audio',
      title: recordedAudioFile.originalname || `chant-${chantId}`,
      filePath: s3Key,
      url: audioUrl,
      mimeType: recordedAudioFile.mimetype,
      size: recordedAudioFile.size,
      uploadedBy: uploadedByUserId,
    });
    progress.recordedAudio = recordedAudioMedia._id;
  }
  progress.status = 'completed';
  progress.timeSpent = typeof timeSpent === 'number' ? timeSpent : parseInt(timeSpent || '0', 10) || 0;
  progress.metadata = metadata && typeof metadata === 'object' ? metadata : progress.metadata || {};

  // Award stars once
  const starsToAward = chant.starsAwarded || 0;
  if (!progress.starsAwarded && starsToAward > 0) {
    const existingEarning = await StarEarning.findOne({
      child: childId,
      'source.type': 'chant',
      'source.contentId': chantId,
    }).lean();

    if (existingEarning) {
      progress.starsEarned = progress.starsEarned || starsToAward;
      progress.starsAwarded = true;
      progress.starsAwardedAt = progress.starsAwardedAt || existingEarning.createdAt || new Date();
    } else {
      await StarEarning.create({
        child: childId,
        stars: starsToAward,
        source: {
          type: 'chant',
          contentId: chantId,
          contentType: 'Chant',
          metadata: {
            chantTitle: chant.title,
          },
        },
        description: `Earned ${starsToAward} stars for completing "${chant.title}"`,
      });

      const stats = await ChildStats.getOrCreate(childId);
      await stats.addStars(starsToAward);

      // Badges must not delay the star-reward response
      scheduleBadgeUpdate(childId);

      progress.starsEarned = starsToAward;
      progress.starsAwarded = true;
      progress.starsAwardedAt = new Date();
    }
  }

  await progress.save();

  // Award badge if configured (deduped in stats.addBadge)
  try {
    await awardBadgeForChant(childId, chant);
  } catch (e) {
    // Non-blocking
    console.warn('[ChantProgress] Badge award skipped:', e.message);
  }

  return await ChantProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'chant',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo audio',
      populate: [
        {
          path: 'instructionVideo',
          select: INSTRUCTION_VIDEO_POPULATE_SELECT,
        },
        {
          path: 'audio',
          select: 'type title url mimeType size duration',
        },
      ],
    })
    .lean();
};

module.exports = {
  startChant,
  getChantProgress,
  completeChant,
};

