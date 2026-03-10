/**
 * PayPal one-time checkout routes (Phase 2).
 *
 * POST /api/paypal/create-order
 *   Body (option A): { tier: "1_child_USD" | "2_children_yearly_BRL" | ... }
 *   Body (option B): { childCount: 1–10, currency: "USD"|"BRL"|"EUR", planType: "yearly"|"pay_in_4" }
 *   Returns: { success, orderID }
 *
 * POST /api/paypal/capture-order
 *   Body: { orderID }
 *   Captures order and activates subscription.
 *
 * Both require authentication (protect) and parent role (authorize).
 */

const express = require('express');
const { createOrder, captureOrder } = require('../controllers/paypal.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/create-order', protect, authorize('parent'), createOrder);
router.post('/capture-order', protect, authorize('parent'), captureOrder);

module.exports = router;
