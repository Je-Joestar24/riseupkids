const { Media } = require('../models');
const s3Service = require('../services/s3.service');
const { assertBunnyIframeEmbedUrl } = require('./bunnyEmbed.util');
const { INSTRUCTION_VIDEO_MEDIA_TAG } = require('../constants/instructionVideoMedia');

const INSTRUCTION_VIDEO_POPULATE_SELECT =
  'type title url mimeType size duration videoSource embedUrl cloudUrl';

function parseInstructionVideoSource(raw) {
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'embed' ? 'embed' : 'upload';
}

async function deleteInstructionVideoMedia(mediaId) {
  if (!mediaId) return;
  try {
    const videoMedia = await Media.findById(mediaId);
    if (!videoMedia) return;
    if ((videoMedia.videoSource || 'upload') !== 'embed' && videoMedia.filePath) {
      await s3Service.deleteByKey(videoMedia.filePath);
    }
    await Media.findByIdAndDelete(mediaId);
  } catch (error) {
    console.error('Error deleting instruction video media:', error);
  }
}

/**
 * Create or update optional instruction video media from upload or Bunny embed.
 */
async function resolveInstructionVideoMedia({
  userId,
  files = {},
  payload = {},
  titleFallback = 'Instruction video',
  existingMediaId = null,
}) {
  const videoSource = parseInstructionVideoSource(payload.instructionVideoSource);
  const hasFile =
    files.instructionVideo && Array.isArray(files.instructionVideo) && files.instructionVideo.length > 0;
  const embedUrlRaw = payload.instructionVideoEmbedUrl;

  if (videoSource === 'embed') {
    if (hasFile) {
      throw new Error('Do not attach an instruction video file when using Bunny embed');
    }
    if (!embedUrlRaw || !String(embedUrlRaw).trim()) {
      return null;
    }

    const canonical = assertBunnyIframeEmbedUrl(embedUrlRaw);

    if (existingMediaId) {
      const existing = await Media.findById(existingMediaId);
      if (existing) {
        if ((existing.videoSource || 'upload') === 'embed') {
          existing.embedUrl = canonical;
          existing.cloudUrl = canonical;
          existing.url = canonical;
          await existing.save();
          return existing;
        }
        await deleteInstructionVideoMedia(existingMediaId);
      }
    }

    return Media.create({
      type: 'video',
      videoSource: 'embed',
      embedUrl: canonical,
      cloudUrl: canonical,
      url: canonical,
      title: titleFallback,
      uploadedBy: userId,
      tags: [INSTRUCTION_VIDEO_MEDIA_TAG],
    });
  }

  if (hasFile) {
    const instructionVideo = files.instructionVideo[0];
    const { url: videoFileUrl, s3Key: videoS3Key } = await s3Service.uploadFileFromMulter(
      instructionVideo,
      'media/videos'
    );

    if (existingMediaId) {
      await deleteInstructionVideoMedia(existingMediaId);
    }

    return Media.create({
      type: 'video',
      videoSource: 'upload',
      title: instructionVideo.originalname,
      filePath: videoS3Key,
      url: videoFileUrl,
      mimeType: instructionVideo.mimetype,
      size: instructionVideo.size,
      uploadedBy: userId,
      tags: [INSTRUCTION_VIDEO_MEDIA_TAG],
    });
  }

  if (embedUrlRaw !== undefined && existingMediaId) {
    const existing = await Media.findById(existingMediaId);
    if (!existing) {
      throw new Error('Instruction video not found');
    }
    if ((existing.videoSource || 'upload') !== 'embed') {
      throw new Error('Instruction video embed URL can only be updated for Bunny embed videos');
    }
    const canonical = assertBunnyIframeEmbedUrl(
      typeof embedUrlRaw === 'string' ? embedUrlRaw : String(embedUrlRaw ?? '')
    );
    existing.embedUrl = canonical;
    existing.cloudUrl = canonical;
    existing.url = canonical;
    await existing.save();
    return existing;
  }

  return null;
}

module.exports = {
  INSTRUCTION_VIDEO_POPULATE_SELECT,
  resolveInstructionVideoMedia,
  deleteInstructionVideoMedia,
};
