const { submitInvitationToFlodesk } = require('../services/flodeskService');

/**
 * @desc    Submit sales page invitation to Flodesk (no user account created)
 * @route   POST /api/invitation
 * @access  Public
 *
 * Body: { parentName, email, whatsapp, age }
 * Name is split into first_name/last_name in the service layer.
 */
async function submitInvitation(req, res) {
  try {
    const { parentName, email, whatsapp, age } = req.body;

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

    const result = await submitInvitationToFlodesk({
      parentName: parentName.trim(),
      email: email.trim(),
      whatsapp: String(whatsapp).trim(),
      age: String(age).trim(),
    });

    res.status(200).json({
      success: true,
      message: 'Invitation submitted successfully',
      data: result,
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
