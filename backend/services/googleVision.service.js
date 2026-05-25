const vision = require('@google-cloud/vision');

function isStarCamDetectDebugEnabled() {
  return String(process.env.STARCAM_DETECT_DEBUG || '').toLowerCase() === 'true';
}

function isVisionErrorVerboseEnabled() {
  return isStarCamDetectDebugEnabled() || process.env.NODE_ENV !== 'production';
}

function logVisionDebug(stage, payload = {}) {
  if (!isStarCamDetectDebugEnabled()) return;
  console.log('[StarCamDetectDebug]', JSON.stringify({ stage, ...payload }));
}

function buildVisionProviderErrorMessage(error) {
  const parts = [
    error?.message,
    error?.details,
    error?.code != null ? `code=${error.code}` : null,
    error?.status ? `status=${error.status}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' | ') : 'Unknown Vision provider error';
}

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
  return Number.isFinite(n) && n > 0 ? n : 25000;
}

function getLabelMaxResults() {
  const n = Number(process.env.VISION_LABEL_MAX_RESULTS);
  return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : 8;
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
  const maxResults = getLabelMaxResults();
  logVisionDebug('vision:request:start', {
    imageBytes: imageBuffer.length,
    timeoutMs,
    maxResults,
    projectId: process.env.GOOGLE_VISION_PROJECT_ID || null,
    hasClientEmail: Boolean(process.env.GOOGLE_VISION_CLIENT_EMAIL),
    hasPrivateKey: Boolean(process.env.GOOGLE_VISION_PRIVATE_KEY),
  });
  const detectionPromise = client.annotateImage(
    {
      image: { content: imageBuffer },
      features: [{ type: 'LABEL_DETECTION', maxResults }],
    },
    { timeout: timeoutMs }
  );

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const e = new Error('Vision API request timed out');
      e.statusCode = 504;
      e.code = 'STARCAM_VISION_TIMEOUT';
      reject(e);
    }, timeoutMs);
    if (timeoutId && typeof timeoutId.unref === 'function') timeoutId.unref();
  });

  let result;
  try {
    [result] = await Promise.race([detectionPromise, timeoutPromise]);
  } catch (e) {
    logVisionDebug('vision:request:error', {
      errorName: e?.name || null,
      errorMessage: e?.message || null,
      errorCode: e?.code ?? null,
      errorDetails: e?.details || null,
      errorStatus: e?.status || null,
      errorStatusCode: e?.statusCode || null,
    });
    if (e.statusCode) {
      if (!e.code) e.code = 'STARCAM_VISION_TIMEOUT';
      throw e;
    }
    const err = new Error(
      isVisionErrorVerboseEnabled()
        ? `Vision API request failed: ${buildVisionProviderErrorMessage(e)}`
        : 'Vision API request failed'
    );
    err.statusCode = 503;
    err.code = 'STARCAM_VISION_UNAVAILABLE';
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
  logVisionDebug('vision:request:success', {
    labelCount: labels.length,
    topLabel: labels[0]?.description || null,
    topLabelScore: labels[0]?.score ?? null,
  });

  return { labels };
}

module.exports = {
  isVisionEnabled,
  isVisionConfigured,
  detectLabelsFromImageBuffer,
};
