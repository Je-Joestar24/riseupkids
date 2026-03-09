/**
 * PayPal one-time checkout routes (Phase 2).
 *
 * POST /api/paypal/create-order – create order (body: { tier })
 * POST /api/paypal/capture-order – capture order and activate subscription (body: { orderID })
 *
 * Both require authentication (protect) and parent role (authorize) for Family Plan purchase.
 */

const express = require('express');
const { createOrder, captureOrder } = require('../controllers/paypal.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/create-order', protect, authorize('parent'), createOrder);
router.post('/capture-order', protect, authorize('parent'), captureOrder);

module.exports = router;
