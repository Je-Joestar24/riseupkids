const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listChildren,
  getChildDetail,
  unlockModule,
  lockModule,
  clearOverride,
} = require('../controllers/moduleAccess.controller');

/**
 * Admin Module Access
 * Base: /api/admin/module-access
 */
router.use(protect);
router.use(authorize('admin'));

router.get('/', listChildren);
router.get('/children/:childId', getChildDetail);
router.post('/children/:childId/courses/:courseId/unlock', unlockModule);
router.post('/children/:childId/courses/:courseId/lock', lockModule);
router.post('/children/:childId/courses/:courseId/clear-override', clearOverride);

module.exports = router;
