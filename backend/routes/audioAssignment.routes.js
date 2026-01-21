const express = require('express');
const router = express.Router();
const {
  createAudioAssignment,
  getAllAudioAssignments,
  getAudioAssignmentById,
  updateAudioAssignment,
  deleteAudioAssignment,
} = require('../controllers/audioAssignment.controller');
const {
  startAudioAssignmentForChild,
  getAudioAssignmentProgressForChild,
  submitAudioAssignmentForChild,
  listAudioAssignmentSubmissions,
  reviewAudioAssignmentSubmission,
} = require('../controllers/audioAssignmentProgress.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadAudioAssignment, uploadAudioAssignmentUpdate, uploadRecordedAudio } = require('../middleware/upload');

/**
 * Audio Assignment Routes
 * 
 * Base path: /api/audio-assignments
 * 
 * All routes require authentication and admin/teacher role
 * 
 * Routes:
 * - POST / - Create new audio assignment (with reference audio and cover image upload)
 * - GET / - Get all audio assignments (with filtering and pagination)
 * - GET /:id - Get single audio assignment by ID
 * - PUT /:id - Update audio assignment (title, description, instructions, coverImage, settings, isPublished)
 * - DELETE /:id - Delete audio assignment (hard delete)
 * - POST /:id/child/:childId/start - Start assignment for child (Parent/Admin)
 * - GET /:id/child/:childId/progress - Get child's progress (Parent/Admin/Teacher)
 * - POST /:id/child/:childId/submit - Submit recorded audio (Parent/Admin)
 * - GET /submissions - List submissions for review (Admin/Teacher)
 * - POST /:id/child/:childId/review - Approve/reject submission (Admin/Teacher)
 */

// All routes require authentication
router.use(protect);

// ------------------------------------------------------------
// Child progress/submission routes
// ------------------------------------------------------------

// List submissions for review (Admin/Teacher)
// IMPORTANT: define before "/:id" to avoid route conflicts
router.get('/submissions', authorize('admin', 'teacher'), listAudioAssignmentSubmissions);

// Start assignment for a child
router.post('/:id/child/:childId/start', authorize('parent', 'admin'), startAudioAssignmentForChild);

// Get child's progress
router.get('/:id/child/:childId/progress', authorize('parent', 'admin', 'teacher'), getAudioAssignmentProgressForChild);

// Submit child's recorded audio
router.post(
  '/:id/child/:childId/submit',
  authorize('parent', 'admin'),
  uploadRecordedAudio,
  submitAudioAssignmentForChild
);

// Review submission (approve/reject)
router.post('/:id/child/:childId/review', authorize('admin', 'teacher'), reviewAudioAssignmentSubmission);

// ------------------------------------------------------------
// Admin/Teacher content management routes
// ------------------------------------------------------------

// All routes below require admin/teacher role
router.use(authorize('admin', 'teacher'));

// Create new audio assignment (with reference audio and cover image upload)
router.post('/', uploadAudioAssignment, createAudioAssignment);

// Get all audio assignments
router.get('/', getAllAudioAssignments);

// Get single audio assignment by ID
router.get('/:id', getAudioAssignmentById);

// Update audio assignment (with optional cover image upload, no reference audio)
router.put('/:id', uploadAudioAssignmentUpdate, updateAudioAssignment);

// Delete audio assignment
router.delete('/:id', deleteAudioAssignment);

module.exports = router;

