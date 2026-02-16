/**
 * HTML5 Handler Service
 *
 * Handles upload and hosting of HTML5 (e.g. Captivate) packages only.
 * No SCORM logic; no Book/Course coupling.
 */

const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const HTML5_BASE = path.join(UPLOADS_DIR, 'html5');
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
 * Extract zip (from buffer or file path) to uploads/html5/<id>/ and return id + entry point.
 * @param {Buffer|string} zipInput - Zip file as Buffer or path to zip file
 * @returns {Promise<{ id: string, entryPoint: string }>}
 */
async function extractAndStore(zipInput) {
  if (!zipInput) {
    throw new Error('No ZIP file provided for HTML5 package.');
  }

  let zipPath = null;
  if (typeof zipInput === 'string') {
    zipPath = zipInput;
    if (!(await fs.pathExists(zipPath))) {
      throw new Error('HTML5 package file was not found on server. Please try uploading again.');
    }
    const stat = await fs.stat(zipPath).catch(() => null);
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
    await fs.remove(extractDir).catch(() => { });
    throw new Error('Failed to extract HTML5 package. The file may be corrupted or not a valid ZIP.');
  }

  const entryPoint = detectEntryPoint(extractDir);

  return { id, entryPoint };
}

/**
 * Build launch URL for a package (same-origin).
 * @param {string} id - Package id (folder name under uploads/html5)
 * @param {string} baseUrl - e.g. https://api.example.com
 * @param {string} [entryPoint] - e.g. index.html (default from disk if needed, or use default)
 * @returns {Promise<{ launchUrl: string, entryPoint: string }>}
 */
async function getLaunchUrl(id, baseUrl, entryPoint = null) {
  const packageDir = path.join(HTML5_BASE, id);
  if (!(await fs.pathExists(packageDir))) {
    throw new Error('HTML5 package not found');
  }

  const resolved = entryPoint || detectEntryPoint(packageDir);
  const base = baseUrl.replace(/\/$/, '');
  const launchUrl = `${base}/html5/${id}/${resolved}`;

  return { launchUrl, entryPoint: resolved };
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
  extractAndStore,
  getLaunchUrl,
  packageExists,
  detectEntryPoint,
  HTML5_BASE,
};
