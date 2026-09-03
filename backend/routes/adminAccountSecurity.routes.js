const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getLockedAccounts,
  unlockUserAccount,
} = require('../controllers/adminAccountSecurity.controller');

/**
 * Admin Account Security Routes (RUK-SEC-007)
 *
 * Base path: /api/admin/account-security
 * All routes require an authenticated admin.
 *
 * - GET  /locked            - list accounts currently locked from failed logins
 * - POST /:userId/unlock    - clear the lockout + failed-attempt count for one account
 */
router.use(protect);
router.use(authorize('admin'));

router.get('/locked', getLockedAccounts);
router.post('/:userId/unlock', unlockUserAccount);

module.exports = router;
