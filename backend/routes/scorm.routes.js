const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const scormController = require('../controllers/scorm.controller');

/**
 * @route   GET /api/scorm/:contentId/launch
 * @desc    Get SCORM launch URL
 * @access  Private
 * 
 * Query params:
 * - contentType: 'audioAssignment' | 'chant'
 */
router.get('/:contentId/launch', protect, scormController.getLaunchUrl);

/**
 * @route   POST /api/scorm/:contentId/progress
 * @desc    Save SCORM progress
 * @access  Private
 * 
 * Body:
 * {
 *   "contentType": "audioAssignment" | "chant",
 *   "progressData": { ... }
 * }
 */
router.post('/:contentId/progress', protect, scormController.saveProgress);

/**
 * @route   GET /api/scorm/:contentId/progress
 * @desc    Get SCORM progress
 * @access  Private
 * 
 * Query params:
 * - contentType: 'audioAssignment' | 'chant'
 */
router.get('/:contentId/progress', protect, scormController.getProgress);

module.exports = router;
