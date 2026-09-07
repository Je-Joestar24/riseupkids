/**
 * Environment variable check (RUK-SEC-034 / Chunk 4).
 *
 * Fails fast with ONE clear list of everything that's missing, instead of the app booting and
 * then throwing a different error the first time each unset variable is touched. Run standalone
 * before a deploy (`node scripts/check-env.js`) or let `server.js` call it at startup.
 *
 * Strength/format checks live in their own modules (config/jwtSecret.js, config/cors.js) — this
 * only checks presence, including feature-gated variables when their feature is turned on.
 */

function isProdLike(env) {
  return ['production', 'staging'].includes(String(env.NODE_ENV || '').toLowerCase());
}

const has = (env, key) => typeof env[key] === 'string' && env[key].trim() !== '';

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: boolean, missing: string[], warnings: string[] }}
 */
function checkEnv(env = process.env) {
  const prod = isProdLike(env);
  const missing = [];
  const warnings = [];

  // Hard requirements — the app cannot function without these in any environment.
  for (const key of ['JWT_SECRET', 'MONGODB_URI']) {
    if (!has(env, key)) missing.push(key);
  }

  // Production / staging only.
  if (prod) {
    if (!has(env, 'CORS_ORIGIN')) missing.push('CORS_ORIGIN');
    if (!has(env, 'NODE_ENV')) missing.push('NODE_ENV');
  }

  // Conditionally required — only when the feature that needs them is enabled.
  if (String(env.MAIL_DRIVER || '').toLowerCase() === 'smtp') {
    for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD']) {
      if (!has(env, key)) missing.push(`${key} (MAIL_DRIVER=smtp)`);
    }
  }

  if (String(env.GOOGLE_VISION_ENABLED || '').toLowerCase() === 'true') {
    for (const key of [
      'GOOGLE_VISION_PROJECT_ID',
      'GOOGLE_VISION_PRIVATE_KEY',
      'GOOGLE_VISION_CLIENT_EMAIL',
    ]) {
      if (!has(env, key)) missing.push(`${key} (GOOGLE_VISION_ENABLED=true)`);
    }
  }

  // PagBank: if any PagBank var is set, treat the integration as intended-on and require the core two.
  const anyPagbank = ['PAGSEGURO_ENV', 'PAGSEGURO_API_BASE', 'PAGSEGURO_ACCESS_TOKEN'].some((k) =>
    has(env, k)
  );
  if (anyPagbank) {
    for (const key of ['PAGSEGURO_API_BASE', 'PAGSEGURO_ACCESS_TOKEN']) {
      if (!has(env, key)) missing.push(`${key} (PagBank integration configured)`);
    }
  }

  // Non-fatal: media storage. The API still boots; uploads/media delivery degrade to local.
  if (prod && !(has(env, 'AWS_ACCESS_KEY_ID') && has(env, 'AWS_SECRET_ACCESS_KEY') && has(env, 'AWS_S3_BUCKET'))) {
    warnings.push(
      'AWS S3 is not fully configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET) — media upload and CloudFront delivery will not work in production.'
    );
  }

  return { ok: missing.length === 0, missing, warnings };
}

/** Print the result and, if `exitOnFailure`, exit non-zero when something required is missing. */
function reportEnv(result, { exitOnFailure = false, logger = console } = {}) {
  for (const w of result.warnings) logger.warn(`[check-env] WARNING: ${w}`);

  if (result.ok) {
    logger.log('[check-env] OK — all required environment variables are set.');
    return;
  }

  logger.error('[check-env] Missing required environment variable(s):');
  for (const m of result.missing) logger.error(`  - ${m}`);
  logger.error('[check-env] See backend/.env.example for the full list and descriptions.');

  if (exitOnFailure) process.exit(1);
}

module.exports = { checkEnv, reportEnv, isProdLike };

if (require.main === module) {
  try {
    require('dotenv').config();
  } catch {
    // dotenv not installed / no .env — fall back to the ambient environment.
  }
  reportEnv(checkEnv(), { exitOnFailure: true });
}
