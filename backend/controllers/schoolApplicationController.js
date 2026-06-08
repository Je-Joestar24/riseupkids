const {
  submitSchoolProspect,
  normalizeLanguage,
  normalizeRole,
  normalizeCurrentEnglish,
} = require('../services/schoolProspect.services');

/**
 * @desc    Submit schools page application (MongoDB + Flodesk segment by language)
 * @route   POST /api/school-application
 * @access  Public
 *
 * Body: { schoolName, cityCountry, role, whatsapp, email, studentCount,
 *         ageGroup, currentEnglish, interest, language }
 */
async function submitSchoolApplication(req, res) {
  try {
    const {
      schoolName,
      cityCountry,
      role,
      whatsapp,
      email,
      studentCount,
      ageGroup,
      currentEnglish,
      interest,
      language,
    } = req.body || {};

    if (!schoolName || typeof schoolName !== 'string' || !schoolName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'schoolName is required',
      });
    }
    if (!cityCountry || typeof cityCountry !== 'string' || !cityCountry.trim()) {
      return res.status(400).json({
        success: false,
        message: 'cityCountry is required',
      });
    }
    if (!normalizeRole(role)) {
      return res.status(400).json({
        success: false,
        message: 'role is required and must be one of owner, principal, coordinator, teacher',
      });
    }
    if (!whatsapp || typeof whatsapp !== 'string' || !whatsapp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'whatsapp is required',
      });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'email is required',
      });
    }
    if (!studentCount || typeof studentCount !== 'string' || !studentCount.trim()) {
      return res.status(400).json({
        success: false,
        message: 'studentCount is required',
      });
    }
    if (!ageGroup || typeof ageGroup !== 'string' || !ageGroup.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ageGroup is required',
      });
    }
    if (!normalizeCurrentEnglish(currentEnglish)) {
      return res.status(400).json({
        success: false,
        message: 'currentEnglish is required and must be yes or no',
      });
    }
    if (!interest || typeof interest !== 'string' || !interest.trim()) {
      return res.status(400).json({
        success: false,
        message: 'interest is required',
      });
    }
    if (!normalizeLanguage(language)) {
      return res.status(400).json({
        success: false,
        message: 'language is required and must be one of pt, en, es',
      });
    }

    const { flodesk } = await submitSchoolProspect({
      schoolName: schoolName.trim(),
      cityCountry: cityCountry.trim(),
      role: role.trim(),
      whatsapp: String(whatsapp).trim(),
      email: email.trim(),
      studentCount: studentCount.trim(),
      ageGroup: ageGroup.trim(),
      currentEnglish: String(currentEnglish).trim(),
      interest: interest.trim(),
      language: language.trim(),
    });

    return res.status(200).json({
      success: true,
      message: 'School application submitted successfully',
      data: {
        id: flodesk?.id || null,
        email: flodesk?.email || email.trim(),
      },
    });
  } catch (error) {
    console.error('[SchoolApplication] submitSchoolApplication error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'School application submission failed',
    });
  }
}

module.exports = {
  submitSchoolApplication,
};
