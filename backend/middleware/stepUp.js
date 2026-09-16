const { verifyStepUpToken } = require('../services/stepUp.service');

/**
 * Requires a fresh step-up verification (see services/stepUp.service.js) on top of a normal
 * authenticated session — apply to the most sensitive admin actions (role changes, bulk exports,
 * deletion overrides). Must run after `protect`.
 */
function requireStepUp(req, res, next) {
  const token = req.headers['x-step-up-token'];
  if (!verifyStepUpToken(token, req.user._id)) {
    return res.status(403).json({
      success: false,
      code: 'STEP_UP_REQUIRED',
      message: 'Please re-enter your two-factor code to continue.',
    });
  }
  next();
}

module.exports = { requireStepUp };
