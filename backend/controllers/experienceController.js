const logger = require('../config/logger');
const { verifyCaptcha } = require('../services/captcha.service');
const {
  normalizeExperienceLanguage,
  normalizeEmail,
  issueExperienceToken,
  verifyExperienceToken,
  emailHasExperienceAccess,
  getExperienceVideos,
} = require('../services/experienceAccess.service');

/**
 * @desc    Check an email against the Flodesk freebie segment and, if it's a confirmed subscriber,
 *          unlock the Smoothie Experience (returns the videos + a device token)
 * @route   POST /api/experience/verify
 * @access  Public (rate limited, reCAPTCHA protected)
 *
 * Body: { email, language, captchaToken }
 */
async function verifyExperienceAccess(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  const language = normalizeExperienceLanguage(req.body?.language);

  const captcha = await verifyCaptcha(req.body?.captchaToken, 'experience_access');
  if (!captcha.verified) {
    logger.warn({ reason: captcha.reason }, '[Experience] Captcha verification failed');
    return res.status(400).json({ success: false, message: 'Verification failed. Please try again.' });
  }

  let hasAccess;
  try {
    hasAccess = await emailHasExperienceAccess(email, language);
  } catch (error) {
    // Could not check (Flodesk down, segment not configured). Never answer this as "not
    // registered" — that would send a real subscriber to the sign-up form for no reason.
    logger.error({ err: error.message }, '[Experience] Access check could not be completed');
    return res.status(503).json({
      success: false,
      message: 'We could not check right now. Please try again in a moment.',
    });
  }

  // One answer for every "no" (not in Flodesk, unconfirmed, unsubscribed, wrong segment), so the
  // response can't be used to tell those cases apart.
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      code: 'EXPERIENCE_ACCESS_DENIED',
      message: 'This email is not registered for the experience.',
    });
  }

  try {
    return res.status(200).json({
      success: true,
      data: {
        token: issueExperienceToken(language),
        videos: getExperienceVideos(language),
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, '[Experience] Could not issue access token');
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
}

/**
 * @desc    Re-open the experience on a device that already passed the email check
 * @route   POST /api/experience/session
 * @access  Public (rate limited) — authorised only by the signed token from /verify
 *
 * Body: { token, language }
 */
async function restoreExperienceAccess(req, res) {
  const language = normalizeExperienceLanguage(req.body?.language);

  if (!verifyExperienceToken(req.body?.token, language)) {
    // 403, not 401: this isn't a login session, and a 401 here must never look like a logout.
    return res.status(403).json({
      success: false,
      code: 'EXPERIENCE_TOKEN_INVALID',
      message: 'Please enter your email again.',
    });
  }

  return res.status(200).json({
    success: true,
    data: { videos: getExperienceVideos(language) },
  });
}

module.exports = {
  verifyExperienceAccess,
  restoreExperienceAccess,
};
