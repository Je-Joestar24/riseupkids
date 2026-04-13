const vision = require('@google-cloud/vision');

function parseBool(value) {
  if (value == null) return false;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function normalizePrivateKey(key) {
  if (!key) return '';
  return String(key).replace(/\\n/g, '\n');
}

function buildServiceAccountCredentials() {
  const clientEmail = process.env.GOOGLE_VISION_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_VISION_PRIVATE_KEY);
  if (!clientEmail || !privateKey) return null;
  return {
    type: 'service_account',
    project_id: process.env.GOOGLE_VISION_PROJECT_ID,
    private_key_id: process.env.GOOGLE_VISION_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: clientEmail,
    client_id: process.env.GOOGLE_VISION_CLIENT_ID,
    auth_uri: process.env.GOOGLE_VISION_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.GOOGLE_VISION_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.GOOGLE_VISION_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GOOGLE_VISION_CLIENT_X509_CERT_URL,
    universe_domain: process.env.GOOGLE_VISION_UNIVERSE_DOMAIN || 'googleapis.com',
  };
}

let clientSingleton = null;

function isVisionEnabled() {
  return parseBool(process.env.GOOGLE_VISION_ENABLED);
}

function isVisionConfigured() {
  if (!isVisionEnabled()) return false;
  const creds = buildServiceAccountCredentials();
  return Boolean(creds?.client_email && creds?.private_key && process.env.GOOGLE_VISION_PROJECT_ID);
}

function getVisionClient() {
  if (!isVisionConfigured()) return null;
  if (!clientSingleton) {
    clientSingleton = new vision.ImageAnnotatorClient({
      credentials: buildServiceAccountCredentials(),
      projectId: process.env.GOOGLE_VISION_PROJECT_ID,
    });
  }
  return clientSingleton;
}

function getRequestTimeoutMs() {
  const n = Number(process.env.VISION_REQUEST_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 6000;
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise<{ labels: { description: string; score: number }[] }>}
 */
async function detectLabelsFromImageBuffer(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    const err = new Error('image file is required');
    err.statusCode = 400;
    throw err;
  }

  const client = getVisionClient();
  if (!client) {
    const err = new Error('Google Vision is not enabled or credentials are incomplete');
    err.statusCode = 503;
    throw err;
  }

  const timeoutMs = getRequestTimeoutMs();
  const detectionPromise = client.labelDetection({ image: { content: imageBuffer } });

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const e = new Error('Vision API request timed out');
      e.statusCode = 503;
      reject(e);
    }, timeoutMs);
    if (timeoutId && typeof timeoutId.unref === 'function') timeoutId.unref();
  });

  let result;
  try {
    [result] = await Promise.race([detectionPromise, timeoutPromise]);
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error('Vision API request failed');
    err.statusCode = 503;
    err.cause = e;
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const raw = result?.labelAnnotations || [];
  const labels = raw.map((l) => ({
    description: String(l.description || '').trim(),
    score: typeof l.score === 'number' && Number.isFinite(l.score) ? l.score : 0,
  }));

  return { labels };
}

module.exports = {
  isVisionEnabled,
  isVisionConfigured,
  detectLabelsFromImageBuffer,
};
