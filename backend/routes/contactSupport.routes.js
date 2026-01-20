const express = require('express');
const router = express.Router();
const {
  createContactMessage,
  getContactMessages,
  getContactMessageById,
  getMyContactMessages,
  updateMessageStatus,
  respondToMessage,
} = require('../controllers/contactSupport.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Contact Support Routes
 * 
 * Base path: /api/contact-support
 * 
 * Routes:
 * - POST / - Create message (protect - parent only)
 * - GET /my-messages - Get parent's messages (protect - parent only)
 * - GET / - Get all messages (protect + authorize('admin'))
 * - GET /:id - Get message by ID (protect + authorize('admin'))
 * - PATCH /:id/status - Update status (protect + authorize('admin'))
 * - POST /:id/respond - Respond to message (protect + authorize('admin'))
 */

// All routes require authentication
router.use(protect);

// Parent routes (no admin authorization needed)
router.post('/', createContactMessage);
router.get('/my-messages', getMyContactMessages);

// Admin routes (require admin authorization)
router.get('/', authorize('admin'), getContactMessages);
router.get('/:id', authorize('admin'), getContactMessageById);
router.patch('/:id/status', authorize('admin'), updateMessageStatus);
router.post('/:id/respond', authorize('admin'), respondToMessage);

module.exports = router;
