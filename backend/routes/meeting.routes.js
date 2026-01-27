const express = require('express');
const router = express.Router();
const {
  getAllMeetings,
  getMeetingById,
  updateMeeting,
  archiveMeeting,
  restoreMeeting,
  cancelMeeting,
  deleteMeeting,
} = require('../controllers/meeting.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Meeting Routes
 * 
 * Base path: /api/meetings
 * 
 * All routes require authentication and teacher/admin role
 */

// Get all meetings with filters and pagination
router.get('/', protect, authorize('teacher', 'admin'), getAllMeetings);

// Get meeting by ID
router.get('/:id', protect, authorize('teacher', 'admin'), getMeetingById);

// Update meeting
router.patch('/:id', protect, authorize('teacher', 'admin'), updateMeeting);

// Archive meeting
router.post('/:id/archive', protect, authorize('teacher', 'admin'), archiveMeeting);

// Restore archived meeting
router.post('/:id/restore', protect, authorize('teacher', 'admin'), restoreMeeting);

// Cancel meeting
router.post('/:id/cancel', protect, authorize('teacher', 'admin'), cancelMeeting);

// Delete meeting permanently
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteMeeting);

module.exports = router;
