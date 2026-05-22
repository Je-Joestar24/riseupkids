const s3Service = require('../services/s3.service');

/**
 * Upload optional cover image from multer files map.
 * @param {Object} files - req.files from multer
 * @returns {Promise<string|null>} S3 URL or null
 */
const uploadCoverFromFiles = async (files) => {
  if (!files?.coverImage?.length) return null;
  const { url } = await s3Service.uploadFileFromMulter(files.coverImage[0], 'media/images');
  return url;
};

/**
 * Delete cover image from S3 when present (best-effort).
 * @param {string|null|undefined} coverUrl
 */
const deleteCoverByUrl = async (coverUrl) => {
  if (!coverUrl || typeof coverUrl !== 'string') return;
  try {
    const key = s3Service.getS3KeyFromUrl(coverUrl);
    if (key) await s3Service.deleteByKey(key);
  } catch (err) {
    console.error('[coverImage] Failed to delete cover from S3:', err.message);
  }
};

module.exports = {
  uploadCoverFromFiles,
  deleteCoverByUrl,
};
