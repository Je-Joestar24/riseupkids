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

const filePathToUploadsUrl = (absolutePath) => {
  const uploadsIndex = absolutePath.indexOf('uploads');
  if (uploadsIndex === -1) return absolutePath;
  const relativePath = absolutePath
    .substring(uploadsIndex + 'uploads'.length)
    .replace(/\\/g, '/');
  return `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
};

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
    .populate('chant', 'title instructions coverImage starsAwarded badgeAwarded instructionVideo')
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
    .populate('chant', 'title instructions coverImage starsAwarded badgeAwarded instructionVideo')
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
  if (!recordedAudioFile) {
    throw new Error('Recorded audio file is required');
  }

  const chant = await Chant.findById(chantId).select('title starsAwarded badgeAwarded').lean();
  if (!chant) throw new Error('Chant not found');

  const child = await ChildProfile.findById(childId).select('_id displayName').lean();
  if (!child) throw new Error('Child not found');

  const audioUrl = filePathToUploadsUrl(recordedAudioFile.path);
  const recordedAudioMedia = await Media.create({
    type: 'audio',
    title: recordedAudioFile.originalname || `chant-${chantId}`,
    filePath: recordedAudioFile.path,
    url: audioUrl,
    mimeType: recordedAudioFile.mimetype,
    size: recordedAudioFile.size,
    uploadedBy: uploadedByUserId,
  });

  const progress = await getOrCreateProgress({ childId, chantId });

  progress.recordedAudio = recordedAudioMedia._id;
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
    .populate('chant', 'title instructions coverImage starsAwarded badgeAwarded instructionVideo')
    .lean();
};

module.exports = {
  startChant,
  getChantProgress,
  completeChant,
};

