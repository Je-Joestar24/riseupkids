const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

/**
 * S3 Service
 * Uses AWS_REGION, AWS_S3_BUCKET, AWS_S3_BASE_URL (CloudFront), AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from env.
 * Public URLs are built with AWS_S3_BASE_URL (CloudFront) for delivery.
 */

const getConfig = () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET,
  baseUrl: (process.env.AWS_S3_BASE_URL || '').replace(/\/$/, ''),
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

let _client = null;

const getClient = () => {
  if (_client) return _client;
  const config = getConfig();
  if (!config.bucket || !config.credentials) {
    throw new Error('S3 not configured: AWS_S3_BUCKET and AWS credentials required');
  }
  _client = new S3Client({
    region: config.region,
    credentials: config.credentials,
  });
  return _client;
};

/**
 * Generate filename with date/time formatter (same as upload.js)
 * Format: YYYYMMDD-HHMMSS-random.ext
 */
const generateFileName = (originalname) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalname);
  const dateTime = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  return `${dateTime}-${random}${ext}`;
};

/**
 * Get public URL for an S3 key (CloudFront or S3 direct)
 * @param {string} key - S3 object key (no leading slash)
 * @returns {string} Full public URL
 */
const getPublicUrl = (key) => {
  const base = getConfig().baseUrl;
  if (!base) throw new Error('AWS_S3_BASE_URL is not set');
  const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
  return `${base}/${normalizedKey}`;
};

/**
 * Upload a buffer to S3 and return public URL and key.
 * @param {Buffer} buffer - File buffer
 * @param {string} s3Folder - Folder prefix (e.g. 'media/images', 'courses')
 * @param {string} originalname - Original filename (for extension)
 * @param {string} contentType - MIME type
 * @returns {Promise<{ url: string, s3Key: string }>}
 */
const uploadBuffer = async (buffer, s3Folder, originalname, contentType) => {
  const client = getClient();
  const bucket = getConfig().bucket;
  const filename = generateFileName(originalname);
  const key = `${s3Folder.replace(/\/$/, '')}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    })
  );

  const url = getPublicUrl(key);
  return { url, s3Key: key };
};

/**
 * Upload from a Multer file object (must have .buffer, .originalname, .mimetype).
 * @param {Object} file - Multer file (memory storage: file.buffer, file.originalname, file.mimetype)
 * @param {string} s3Folder - S3 prefix (e.g. 'media/images')
 * @returns {Promise<{ url: string, s3Key: string }>}
 */
const uploadFileFromMulter = async (file, s3Folder) => {
  if (!file || !file.buffer) {
    throw new Error('Invalid multer file: buffer required (use memoryStorage)');
  }
  return uploadBuffer(
    file.buffer,
    s3Folder,
    file.originalname || 'file',
    file.mimetype
  );
};

/**
 * Download object from S3 to a Buffer.
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>}
 */
const getObjectBuffer = async (key) => {
  const client = getClient();
  const bucket = getConfig().bucket;
  const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: normalizedKey })
  );
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * Upload all files from a local directory to S3 under the given prefix.
 * Preserves relative paths (e.g. dir/index.html -> prefix/index.html).
 * @param {string} localDirPath - Full path to extracted folder
 * @param {string} s3Prefix - S3 prefix (e.g. 'html5/abc123')
 * @returns {Promise<{ baseUrl: string }>} Base URL for the prefix (no trailing slash)
 */
const uploadDirectory = async (localDirPath, s3Prefix) => {
  const client = getClient();
  const bucket = getConfig().bucket;
  const baseUrl = getPublicUrl(s3Prefix.replace(/\/$/, ''));
  const prefix = s3Prefix.replace(/\/$/, '');

  const mimeTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };

  const walkDir = (dir, fileList = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full, fileList);
      } else {
        fileList.push(full);
      }
    }
    return fileList;
  };

  const files = walkDir(localDirPath);
  for (const filePath of files) {
    const relative = path.relative(localDirPath, filePath).replace(/\\/g, '/');
    const key = `${prefix}/${relative}`;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const body = fs.readFileSync(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  return { baseUrl };
};

/**
 * Delete object by S3 key.
 * @param {string} key - S3 object key
 */
const deleteByKey = async (key) => {
  if (!key) return;
  const client = getClient();
  const bucket = getConfig().bucket;
  const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
    })
  );
};

/**
 * Extract S3 key from a CloudFront or S3 URL (same bucket/base).
 * @param {string} url - Full URL (e.g. https://xxx.cloudfront.net/media/images/xxx.jpg)
 * @returns {string|null} S3 key or null
 */
const getS3KeyFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const base = getConfig().baseUrl;
  if (base && url.startsWith(base + '/')) {
    return url.slice(base.length + 1);
  }
  // Fallback: parse pathname from URL
  try {
    const u = new URL(url);
    const pathname = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
    return pathname || null;
  } catch {
    return null;
  }
};

/**
 * Check S3 connection (HeadBucket). Used by health endpoint.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
const checkConnection = async () => {
  try {
    const client = getClient();
    const bucket = getConfig().bucket;
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (err) {
    const code = err.name || err.Code || err.code;
    const msg = err.message || err.Message || String(err);
    const status = err.$metadata?.httpStatusCode;
    const detail = status ? `${code || 'Error'}: ${msg} (HTTP ${status})` : (code ? `${code}: ${msg}` : msg);
    return { ok: false, error: detail, code: code || null };
  }
};

/**
 * Whether S3 is configured (env vars present).
 */
const isConfigured = () => {
  const c = getConfig();
  return !!(c.bucket && c.baseUrl && c.credentials);
};

module.exports = {
  getClient,
  getConfig,
  getPublicUrl,
  uploadBuffer,
  uploadFileFromMulter,
  getObjectBuffer,
  uploadDirectory,
  deleteByKey,
  getS3KeyFromUrl,
  checkConnection,
  isConfigured,
  generateFileName,
};
