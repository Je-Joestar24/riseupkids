const fs = require('fs');
const path = require('path');

const LEGAL_DIR = path.join(__dirname, '..', '..', 'riseupkids-sale', 'web', 'legal');

let cachedMeta = null;
let cachedTerms = null;

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim();
}

function getLegalMeta() {
  if (!cachedMeta) {
    cachedMeta = readJsonFile(path.join(LEGAL_DIR, 'meta.json'));
  }
  return cachedMeta;
}

function getTermsPlainText() {
  if (!cachedTerms) {
    cachedTerms = readTextFile(path.join(LEGAL_DIR, 'terms.plain.txt'));
  }
  return cachedTerms;
}

function getTermsContent() {
  const meta = getLegalMeta();
  return {
    content: getTermsPlainText(),
    version: meta.version,
    lastUpdated: meta.lastUpdated,
    termsUrl: meta.termsUrl,
    privacyUrl: meta.privacyUrl,
  };
}

function getPrivacyUrls() {
  const meta = getLegalMeta();
  return {
    privacyUrl: meta.privacyUrl,
    termsUrl: meta.termsUrl,
    contactEmail: meta.contactEmail,
    version: meta.version,
    lastUpdated: meta.lastUpdated,
  };
}

/** Clear in-memory cache (tests). */
function resetLegalContentCache() {
  cachedMeta = null;
  cachedTerms = null;
}

module.exports = {
  getTermsContent,
  getPrivacyUrls,
  getLegalMeta,
  resetLegalContentCache,
};
