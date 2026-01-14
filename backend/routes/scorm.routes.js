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

/**
 * @route   GET /api/scorm/:contentId/wrapper
 * @desc    Get SCORM wrapper HTML with API injected
 * @access  Public (token passed in query string for security)
 * 
 * Query params:
 * - contentType: 'audioAssignment' | 'chant' | 'book' | 'video'
 * - entryPoint: Entry point HTML file (e.g., 'index.html')
 * - path: Relative path to SCORM content
 * - token: Auth token (passed from launch endpoint)
 */
router.get('/:contentId/wrapper', scormController.getWrapper);

/**
 * @route   POST /api/scorm/:contentId/record-last-video-watch
 * @desc    Record last video watch for SCORM book (counts and awards stars)
 * @access  Private
 * 
 * Body:
 * {
 *   "contentType": "book"
 * }
 */
router.post('/:contentId/record-last-video-watch', protect, scormController.recordLastVideoWatch);

/**
 * @route   POST /api/scorm/:contentId/check-completion
 * @desc    Check if SCORM completion requirements are met and record completion if valid
 * @access  Private
 * 
 * Body:
 * {
 *   "contentType": "book"
 * }
 */
router.post('/:contentId/check-completion', protect, scormController.checkCompletion);

module.exports = router;
