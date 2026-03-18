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
const HTML5_BRIDGE_FILENAME = 'ruk-html5-bridge.js';

function escapeForHtmlAttribute(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

/**
 * Inject a small bridge script into the HTML5 entry file so the package can report quiz score/maxScore
 * back to the parent app via postMessage (works on CloudFront / cross-origin).
 */
async function injectScoreBridge(extractedPath, entryPoint) {
  const entry = (entryPoint || detectEntryPoint(extractedPath) || 'index.html').replace(/^\//, '');
  const entryPath = path.join(extractedPath, entry.split('/').join(path.sep));
  if (!(await fs.pathExists(entryPath))) {
    return { entryPoint: entry };
  }

  // Write the bridge JS file next to the entry HTML (ensures relative <script src="./..."> works even when nested)
  const entryDir = path.dirname(entryPath);
  const bridgePath = path.join(entryDir, HTML5_BRIDGE_FILENAME);
  const bridgeJs = `
(function () {
  function safeNumber(x) {
    var n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function readCaptivateQuiz() {
    var score = null, maxScore = null, pass = null;
    try {
      if (window.cpAPIInterface && typeof window.cpAPIInterface.getVariableValue === 'function') {
        score = safeNumber(window.cpAPIInterface.getVariableValue("cpQuizInfoPointsscored"));
        maxScore = safeNumber(window.cpAPIInterface.getVariableValue("cpQuizInfoTotalQuizPoints"));
        var p = window.cpAPIInterface.getVariableValue("cpQuizInfoPassFail");
        if (p != null && p !== "") {
          pass = String(p).toLowerCase().indexOf("pass") !== -1;
        }
      }
    } catch (e) {}
    return { score: score, maxScore: maxScore, pass: pass };
  }

  window.addEventListener("message", function (event) {
    try {
      var data = event && event.data;
      if (!data || (data.type !== "GET_HTML5_SCORE" && data.type !== "GET_HTML5_SCORE_V1")) return;
      var result = readCaptivateQuiz();
      event.source && event.source.postMessage({
        type: "HTML5_SCORE_RESULT",
        score: result.score,
        maxScore: result.maxScore,
        pass: result.pass
      }, "*");
    } catch (e) {}
  });
})();
`;
  await fs.writeFile(bridgePath, bridgeJs, 'utf8');

  // Inject <script src="..."> into entry HTML (best-effort, idempotent)
  let html = await fs.readFile(entryPath, 'utf8');
  if (html.includes(HTML5_BRIDGE_FILENAME)) {
    return { entryPoint: entry };
  }

  const scriptTag = `\n<script src="./${escapeForHtmlAttribute(HTML5_BRIDGE_FILENAME)}"></script>\n`;
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${scriptTag}</body>`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${scriptTag}</head>`);
  } else {
    html = `${html}\n${scriptTag}`;
  }

  await fs.writeFile(entryPath, html, 'utf8');
  return { entryPoint: entry };
}

/**
 * Re-inject the score bridge into an existing S3/CloudFront-hosted package.
 * This is used for packages uploaded before the bridge injection existed.
 * It overwrites the entry HTML and uploads the bridge JS alongside it.
 *
 * @param {string} id - html5PackageId
 * @param {string} baseUrl - backend origin (for resolving launch url)
 * @returns {Promise<{ launchUrl: string, entryPoint: string, updated: boolean }>}
 */
async function reinjectBridgeToS3(id, baseUrl) {
  if (!s3Service.isConfigured()) {
    throw new Error('S3 not configured');
  }

  const { launchUrl, entryPoint } = await getLaunchUrl(id, baseUrl);
  const entryKey = s3Service.getS3KeyFromUrl(launchUrl);
  if (!entryKey) {
    throw new Error('Could not resolve S3 key from launchUrl');
  }

  const htmlBuf = await s3Service.getObjectBuffer(entryKey);
  let html = htmlBuf.toString('utf8');
  const hadBridgeBefore = html.includes(HTML5_BRIDGE_FILENAME);
  if (hadBridgeBefore) {
    return { launchUrl, entryPoint, updated: false, entryKey, hadBridgeBefore, hasBridgeAfter: true };
  }

  const bridgeDirKey = entryKey.split('/').slice(0, -1).join('/');
  const bridgeKey = `${bridgeDirKey}/${HTML5_BRIDGE_FILENAME}`;
  const bridgeJs = Buffer.from(
    `
(function () {
  function safeNumber(x) {
    var n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  function readCaptivateQuiz() {
    var score = null, maxScore = null, pass = null;
    try {
      if (window.cpAPIInterface && typeof window.cpAPIInterface.getVariableValue === 'function') {
        score = safeNumber(window.cpAPIInterface.getVariableValue("cpQuizInfoPointsscored"));
        maxScore = safeNumber(window.cpAPIInterface.getVariableValue("cpQuizInfoTotalQuizPoints"));
        var p = window.cpAPIInterface.getVariableValue("cpQuizInfoPassFail");
        if (p != null && p !== "") pass = String(p).toLowerCase().indexOf("pass") !== -1;
      }
    } catch (e) {}
    return { score: score, maxScore: maxScore, pass: pass };
  }
  window.addEventListener("message", function (event) {
    try {
      var data = event && event.data;
      if (!data || (data.type !== "GET_HTML5_SCORE" && data.type !== "GET_HTML5_SCORE_V1")) return;
      var result = readCaptivateQuiz();
      event.source && event.source.postMessage({ type: "HTML5_SCORE_RESULT", score: result.score, maxScore: result.maxScore, pass: result.pass }, "*");
    } catch (e) {}
  });
})();
`,
    'utf8'
  );

  await s3Service.putObjectBuffer(bridgeJs, bridgeKey, 'application/javascript');

  const scriptTag = `\n<script src="./${escapeForHtmlAttribute(HTML5_BRIDGE_FILENAME)}"></script>\n`;
  if (html.includes('</body>')) html = html.replace('</body>', `${scriptTag}</body>`);
  else if (html.includes('</head>')) html = html.replace('</head>', `${scriptTag}</head>`);
  else html = `${html}\n${scriptTag}`;

  await s3Service.putObjectBuffer(Buffer.from(html, 'utf8'), entryKey, 'text/html');

  // Verify after write (read S3 again)
  const afterBuf = await s3Service.getObjectBuffer(entryKey);
  const afterHtml = afterBuf.toString('utf8');
  const hasBridgeAfter = afterHtml.includes(HTML5_BRIDGE_FILENAME);

  return {
    launchUrl,
    entryPoint,
    updated: true,
    entryKey,
    bridgeKey,
    hadBridgeBefore,
    hasBridgeAfter,
  };
}

/**
 * Generate a unique id for the package folder (safe for filesystem).
 * @returns {string}
 */
function generatePackageId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Detect entry point (first existing of index.html, story.html, etc.) in the extracted folder.
 * Captivate exports commonly nest the entry inside a subfolder, so we search recursively and return
 * a relative path (POSIX-style) like "MyBook/index.html".
 * @param {string} extractedPath - Full path to extracted folder
 * @returns {string} Relative entry path (e.g. 'index.html' or 'MyBook/index.html')
 */
function detectEntryPoint(extractedPath) {
  const root = extractedPath;
  if (!root || !fs.existsSync(root)) return 'index.html';

  const isDirectory = (p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  };

  const safeList = (dir) => {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  };

  const toRelPosix = (absFile) => {
    const rel = path.relative(root, absFile);
    return rel.split(path.sep).join('/');
  };

  // For each candidate name in priority order, BFS-search the tree and return first match.
  for (const candidate of ENTRY_CANDIDATES) {
    const queue = [root];
    while (queue.length) {
      const dir = queue.shift();
      const entries = safeList(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        if (entry === candidate) {
          return toRelPosix(full);
        }
        if (isDirectory(full)) {
          queue.push(full);
        }
      }
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
  // Inject score bridge for CloudFront-hosted packages (also fine for local legacy)
  await injectScoreBridge(tempDir, entryPoint);
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
  await injectScoreBridge(extractDir, entryPoint);

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
  reinjectBridgeToS3,
  HTML5_BASE,
};
