/**
 * HTML5 Handler Service
 *
 * Handles upload and hosting of HTML5 (e.g. Captivate) packages only.
 * No SCORM logic; no Book/Course coupling.
 * When S3 is configured: extract to temp → upload to S3 only → delete temp (no local copy).
 * When S3 is not configured: legacy extract to uploads/html5/<id>/ for backward compat.
 */

const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const s3Service = require('./s3.service');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const HTML5_BASE = path.join(UPLOADS_DIR, 'html5');
const HTML5_TEMP_BASE = path.join(UPLOADS_DIR, 'temp', 'html5');
const ENTRY_CANDIDATES = ['index.html', 'index.htm', 'story.html', 'story.htm'];

/**
 * Generate a unique id for the package folder (safe for filesystem).
 * @returns {string}
 */
function generatePackageId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Detect entry point (first existing of index.html, story.html, etc.) in the extracted root.
 * @param {string} extractedPath - Full path to extracted folder
 * @returns {string} Entry filename (e.g. 'index.html')
 */
function detectEntryPoint(extractedPath) {
  for (const name of ENTRY_CANDIDATES) {
    const fullPath = path.join(extractedPath, name);
    if (fs.existsSync(fullPath)) {
      return name;
    }
  }
  return 'index.html';
}

/**
 * Extract zip to temp, upload to S3 only, then delete temp. No persistent local copy.
 * Use this for new HTML5 uploads when S3 is configured (recommended).
 * @param {Buffer|string} zipInput - Zip file as Buffer or path to zip file
 * @returns {Promise<{ id: string, entryPoint: string, baseUrl: string|null }>}
 */
async function extractAndUploadToS3Only(zipInput) {
  if (!zipInput) {
    throw new Error('No ZIP file provided for HTML5 package.');
  }

  if (typeof zipInput === 'string' && !(await fs.pathExists(zipInput))) {
    throw new Error('HTML5 package file was not found on server. Please try uploading again.');
  }

  const id = generatePackageId();
  const tempDir = path.join(HTML5_TEMP_BASE, id);

  let zip;
  try {
    zip = new AdmZip(zipInput);
  } catch (e) {
    throw new Error('Invalid or corrupted ZIP file. Please upload a valid HTML5 (ZIP) package.');
  }

  await fs.ensureDir(tempDir);
  try {
    zip.extractAllTo(tempDir, true);
  } catch (e) {
    await fs.remove(tempDir).catch(() => {});
    throw new Error('Failed to extract HTML5 package. The file may be corrupted or not a valid ZIP.');
  }

  const entryPoint = detectEntryPoint(tempDir);
  let baseUrl = null;

  if (s3Service.isConfigured()) {
    const result = await s3Service.uploadDirectory(tempDir, `html5/${id}`);
    baseUrl = result.baseUrl;
    await fs.remove(tempDir).catch(() => {});
  } else {
    await fs.ensureDir(HTML5_BASE);
    const legacyDir = path.join(HTML5_BASE, id);
    try {
      await fs.move(tempDir, legacyDir);
    } catch (e) {
      if (e.code === 'EXDEV') {
        await fs.copy(tempDir, legacyDir);
        await fs.remove(tempDir);
      } else {
        throw e;
      }
    }
  }

  return { id, entryPoint, baseUrl };
}

/**
 * Legacy: extract zip to uploads/html5/<id>/ and return id + entry point.
 * Only use when S3 is not configured or for backward compatibility.
 * @param {Buffer|string} zipInput - Zip file as Buffer or path to zip file
 * @returns {Promise<{ id: string, entryPoint: string }>}
 */
async function extractAndStore(zipInput) {
  if (!zipInput) {
    throw new Error('No ZIP file provided for HTML5 package.');
  }

  if (typeof zipInput === 'string') {
    if (!(await fs.pathExists(zipInput))) {
      throw new Error('HTML5 package file was not found on server. Please try uploading again.');
    }
    const stat = await fs.stat(zipInput).catch(() => null);
    if (!stat || !stat.isFile()) {
      throw new Error('HTML5 package path is not a valid file. Please upload a ZIP file.');
    }
  }

  await fs.ensureDir(HTML5_BASE);

  const id = generatePackageId();
  const extractDir = path.join(HTML5_BASE, id);

  let zip;
  try {
    zip = new AdmZip(zipInput);
  } catch (e) {
    throw new Error('Invalid or corrupted ZIP file. Please upload a valid HTML5 (ZIP) package.');
  }

  try {
    zip.extractAllTo(extractDir, true);
  } catch (e) {
    await fs.remove(extractDir).catch(() => {});
    throw new Error('Failed to extract HTML5 package. The file may be corrupted or not a valid ZIP.');
  }

  const entryPoint = detectEntryPoint(extractDir);

  return { id, entryPoint };
}

/**
 * @deprecated Use extractAndUploadToS3Only for new uploads (no local copy). Kept for legacy.
 */
async function uploadExtractedToS3(packageId) {
  if (!s3Service.isConfigured()) {
    return { baseUrl: null };
  }
  const packageDir = path.join(HTML5_BASE, packageId);
  if (!(await fs.pathExists(packageDir))) {
    throw new Error('HTML5 package folder not found for S3 upload');
  }
  const { baseUrl } = await s3Service.uploadDirectory(packageDir, `html5/${packageId}`);
  return { baseUrl };
}

/**
 * Build launch URL for a package. When S3 is configured, always returns CloudFront URL so the app never hits backend /html5/.
 * @param {string} id - Package id
 * @param {string} baseUrl - Backend origin (used only when S3 not configured and package on disk)
 * @param {string} [entryPoint] - e.g. index.html
 * @returns {Promise<{ launchUrl: string, entryPoint: string }>}
 */
async function getLaunchUrl(id, baseUrl, entryPoint = null) {
  const Book = require('../models/Book');
  const book = await Book.findOne({ html5PackageId: id }).select('html5BaseUrl html5EntryPoint').lean();
  const resolved = (entryPoint || book?.html5EntryPoint || 'index.html').replace(/^\//, '');

  if (s3Service.isConfigured()) {
    if (book?.html5BaseUrl) {
      const base = book.html5BaseUrl.replace(/\/$/, '');
      return { launchUrl: `${base}/${resolved}`, entryPoint: resolved };
    }
    const base = (s3Service.getConfig().baseUrl || '').replace(/\/$/, '');
    if (base) {
      return { launchUrl: `${base}/html5/${id}/${resolved}`, entryPoint: resolved };
    }
  }

  const packageDir = path.join(HTML5_BASE, id);
  if (!(await fs.pathExists(packageDir))) {
    throw new Error('HTML5 package not found');
  }

  const fromDisk = entryPoint || detectEntryPoint(packageDir);
  const backendLaunchUrl = `${baseUrl.replace(/\/$/, '')}/html5/${id}/${fromDisk}`;
  return { launchUrl: backendLaunchUrl, entryPoint: fromDisk };
}

/**
 * Check if a package id exists (for optional validation).
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function packageExists(id) {
  const packageDir = path.join(HTML5_BASE, id);
  return fs.pathExists(packageDir);
}

module.exports = {
  extractAndUploadToS3Only,
  extractAndStore,
  getLaunchUrl,
  uploadExtractedToS3,
  packageExists,
  detectEntryPoint,
  HTML5_BASE,
};
