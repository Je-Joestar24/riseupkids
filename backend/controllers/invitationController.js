const { submitInvitationLead } = require('../services/lead.services');

function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') return null;
  const value = language.trim().toLowerCase();
  if (['pt', 'en', 'es'].includes(value)) return value;
  return null;
}

/**
 * @desc    Submit sales page invitation to Flodesk (no user account created)
 * @route   POST /api/invitation
 * @access  Public
 *
 * Body: { parentName, email, whatsapp, age, language, consent }
 * Name is split into first_name/last_name in the service layer.
 */
async function submitInvitation(req, res) {
  try {
    const { parentName, email, whatsapp, age, language, consent } = req.body;

    if (!parentName || typeof parentName !== 'string' || !parentName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'parentName is required',
      });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'email is required',
      });
    }
    if (!whatsapp || typeof whatsapp !== 'string' || !whatsapp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'whatsapp is required',
      });
    }
    if (age == null || (typeof age !== 'string' && typeof age !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'age is required',
      });
    }

    const normalizedLanguage = normalizeLanguage(language);
    if (!normalizedLanguage) {
      return res.status(400).json({
        success: false,
        message: 'language is required and must be one of pt, en, es',
      });
    }

    const hasConsent = typeof consent === 'boolean'
      ? consent
      : typeof consent === 'string'
        ? ['true', '1', 'yes', 'on'].includes(consent.trim().toLowerCase())
        : Boolean(consent);

    if (!hasConsent) {
      return res.status(400).json({
        success: false,
        message: 'consent is required',
      });
    }

    const { flodesk } = await submitInvitationLead({
      parentName: parentName.trim(),
      email: email.trim(),
      whatsapp: String(whatsapp).trim(),
      age: String(age).trim(),
      language: normalizedLanguage,
      consent: hasConsent,
    });

    res.status(200).json({
      success: true,
      message: 'Invitation submitted successfully',
      data: flodesk,
    });
  } catch (error) {
    console.error('[Invitation] submitInvitation error:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Invitation submission failed',
    });
  }
}

module.exports = {
  submitInvitation,
};
