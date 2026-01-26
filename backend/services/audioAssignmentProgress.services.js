const mongoose = require('mongoose');

const {
  AudioAssignment,
  AudioAssignmentProgress,
  ChildProfile,
  ChildStats,
  Media,
  StarEarning,
} = require('../models');

/**
 * Convert an absolute uploaded file path to a public /uploads URL.
 * Example: D:\...\backend\uploads\media\audio\file.webm -> /uploads/media/audio/file.webm
 */
const filePathToUploadsUrl = (absolutePath) => {
  const uploadsIndex = absolutePath.indexOf('uploads');
  if (uploadsIndex === -1) return absolutePath;
  const relativePath = absolutePath
    .substring(uploadsIndex + 'uploads'.length)
    .replace(/\\/g, '/');
  return `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
};

const getOrCreateProgress = async ({ childId, audioAssignmentId }) => {
  const progress = await AudioAssignmentProgress.findOne({
    child: childId,
    audioAssignment: audioAssignmentId,
  });

  if (progress) return progress;

  return await AudioAssignmentProgress.create({
    child: childId,
    audioAssignment: audioAssignmentId,
    status: 'not_started',
  });
};

const startAudioAssignment = async ({ childId, audioAssignmentId }) => {
  // Verify child + assignment exist
  const [child, assignment] = await Promise.all([
    ChildProfile.findById(childId).select('_id').lean(),
    AudioAssignment.findById(audioAssignmentId).select('_id').lean(),
  ]);
  if (!child) throw new Error('Child not found');
  if (!assignment) throw new Error('Audio assignment not found');

  const progress = await getOrCreateProgress({ childId, audioAssignmentId });

  if (progress.status === 'not_started') {
    progress.status = 'in_progress';
    await progress.save();
  }

  return await AudioAssignmentProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'audioAssignment',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo referenceAudio',
      populate: [
        { path: 'instructionVideo', select: 'type title url mimeType size duration' },
        { path: 'referenceAudio', select: 'type title url mimeType size duration' },
      ],
    })
    .lean();
};

const getAudioAssignmentProgress = async ({ childId, audioAssignmentId }) => {
  // Verify child + assignment exist
  const [child, assignment] = await Promise.all([
    ChildProfile.findById(childId).select('_id').lean(),
    AudioAssignment.findById(audioAssignmentId).select('_id').lean(),
  ]);
  if (!child) throw new Error('Child not found');
  if (!assignment) throw new Error('Audio assignment not found');

  const progress = await getOrCreateProgress({ childId, audioAssignmentId });

  return await AudioAssignmentProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'audioAssignment',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo referenceAudio',
      populate: [
        { path: 'instructionVideo', select: 'type title url mimeType size duration' },
        { path: 'referenceAudio', select: 'type title url mimeType size duration' },
      ],
    })
    .lean();
};

const submitAudioAssignmentRecording = async ({
  childId,
  audioAssignmentId,
  uploadedByUserId,
  recordedAudioFile,
  timeSpent,
  metadata,
}) => {
  if (!recordedAudioFile) {
    throw new Error('Recorded audio file is required');
  }

  const assignment = await AudioAssignment.findById(audioAssignmentId).select('title').lean();
  if (!assignment) throw new Error('Audio assignment not found');

  const child = await ChildProfile.findById(childId).select('_id displayName').lean();
  if (!child) throw new Error('Child not found');

  // Create media for recorded audio
  const audioUrl = filePathToUploadsUrl(recordedAudioFile.path);
  const recordedAudioMedia = await Media.create({
    type: 'audio',
    title: recordedAudioFile.originalname || `audio-assignment-${audioAssignmentId}`,
    filePath: recordedAudioFile.path,
    url: audioUrl,
    mimeType: recordedAudioFile.mimetype,
    size: recordedAudioFile.size,
    uploadedBy: uploadedByUserId,
  });

  const progress = await getOrCreateProgress({ childId, audioAssignmentId });

  // Reset review info when re-submitting
  progress.recordedAudio = recordedAudioMedia._id;
  progress.status = 'submitted';
  progress.timeSpent = typeof timeSpent === 'number' ? timeSpent : parseInt(timeSpent || '0', 10) || 0;
  progress.reviewedBy = null;
  progress.reviewedAt = null;
  progress.adminFeedback = null;
  progress.metadata = metadata && typeof metadata === 'object' ? metadata : progress.metadata || {};

  await progress.save();

  return await AudioAssignmentProgress.findById(progress._id)
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate({
      path: 'audioAssignment',
      select: 'title instructions coverImage starsAwarded badgeAwarded instructionVideo referenceAudio',
      populate: [
        { path: 'instructionVideo', select: 'type title url mimeType size duration' },
        { path: 'referenceAudio', select: 'type title url mimeType size duration' },
      ],
    })
    .lean();
};

const listAudioAssignmentSubmissions = async (queryParams = {}) => {
  const {
    status = 'submitted',
    audioAssignmentId,
    childId,
    page = 1,
    limit = 10,
  } = queryParams;

  const query = {};
  if (status) query.status = status;
  if (audioAssignmentId && mongoose.Types.ObjectId.isValid(audioAssignmentId)) {
    query.audioAssignment = audioAssignmentId;
  }
  if (childId && mongoose.Types.ObjectId.isValid(childId)) {
    query.child = childId;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const submissions = await AudioAssignmentProgress.find(query)
    .populate('child', 'displayName avatar parent')
    .populate('audioAssignment', 'title coverImage')
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate('reviewedBy', 'name email role')
    .sort({ submittedAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await AudioAssignmentProgress.countDocuments(query);

  return {
    submissions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

const reviewAudioAssignmentSubmission = async ({
  childId,
  audioAssignmentId,
  reviewerUserId,
  decision,
  feedback,
}) => {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error('Invalid decision. Must be "approved" or "rejected"');
  }

  const progress = await AudioAssignmentProgress.findOne({
    child: childId,
    audioAssignment: audioAssignmentId,
  });

  if (!progress) {
    throw new Error('Submission not found');
  }

  if (!progress.recordedAudio) {
    throw new Error('Submission has no recorded audio');
  }

  progress.status = decision;
  progress.reviewedBy = reviewerUserId;
  progress.reviewedAt = new Date();
  progress.adminFeedback = feedback?.trim() || null;

  // Award stars only once, and only on approval
  if (decision === 'approved' && !progress.starsAwarded) {
    const assignment = await AudioAssignment.findById(audioAssignmentId).select('title starsAwarded').lean();
    if (!assignment) throw new Error('Audio assignment not found');

    const starsToAward = assignment.starsAwarded || 0;

    const existingEarning = await StarEarning.findOne({
      child: childId,
      'source.type': 'audio_assignment',
      'source.contentId': audioAssignmentId,
    }).lean();

    if (existingEarning && starsToAward > 0) {
      // Stars were already awarded previously; sync progress flags
      progress.starsEarned = progress.starsEarned || starsToAward;
      progress.starsAwarded = true;
      progress.starsAwardedAt = progress.starsAwardedAt || existingEarning.createdAt || new Date();
    } else if (!existingEarning && starsToAward > 0) {
      await StarEarning.create({
        child: childId,
        stars: starsToAward,
        source: {
          type: 'audio_assignment',
          contentId: audioAssignmentId,
          contentType: 'AudioAssignment',
          metadata: {
            audioAssignmentTitle: assignment.title,
          },
        },
        description: `Earned ${starsToAward} stars for completing "${assignment.title}"`,
      });

      const stats = await ChildStats.getOrCreate(childId);
      stats.totalAudioAssignmentsCompleted = (stats.totalAudioAssignmentsCompleted || 0) + 1;
      await stats.addStars(starsToAward);

      // Check for badges after awarding stars
      try {
        const badgeCheck = require('./badgeCheck.service');
        await badgeCheck.updateBadges(childId, { silent: false });
      } catch (badgeError) {
        console.error(`[AudioAssignmentProgress] Error checking badges after star award:`, badgeError);
        // Don't throw - badge checking failure shouldn't block audio assignment completion
      }

      progress.starsEarned = starsToAward;
      progress.starsAwarded = true;
      progress.starsAwardedAt = new Date();
    }
  }

  await progress.save();

  return await AudioAssignmentProgress.findById(progress._id)
    .populate('child', 'displayName avatar parent')
    .populate('audioAssignment', 'title instructions coverImage starsAwarded badgeAwarded instructionVideo referenceAudio')
    .populate('recordedAudio', 'type title url mimeType size duration')
    .populate('reviewedBy', 'name email role')
    .lean();
};

module.exports = {
  startAudioAssignment,
  getAudioAssignmentProgress,
  submitAudioAssignmentRecording,
  listAudioAssignmentSubmissions,
  reviewAudioAssignmentSubmission,
};

