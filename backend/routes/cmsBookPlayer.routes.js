const express = require('express');

const { protect, authorize } = require('../middleware/auth');
const { listPlayableBooks, getPlayableBookById } = require('../controllers/cmsBookPlayer.controller');

const router = express.Router();

router.use(protect);
router.use(authorize('parent', 'admin', 'teacher', 'child'));

// List / play CmsBook documents. For course "book" items with Book.packageType=builtin, use Book.cmsBookId as :id here.
router.get('/playable', listPlayableBooks);
router.get('/:id/play', getPlayableBookById);

module.exports = router;
