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
 *
 * POST /api/paypal/webhook (Chunk 8 — webhook hardening)
 *   PayPal-called, unauthenticated (verified instead via middleware/paypalWebhook.js against
 *   PayPal's own verify-webhook-signature API). Unlike Stripe/PagBank, PayPal's verification call
 *   takes the already-parsed JSON body, so this route needs no raw-body handling and can sit here
 *   with the rest of `/api/paypal` behind the app's normal express.json() (mounted in server.js).
 */

const express = require('express');
const { createOrder, captureOrder } = require('../controllers/paypal.controller');
const { handleWebhook } = require('../controllers/paypalWebhook.controller');
const paypalWebhook = require('../middleware/paypalWebhook');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/create-order', protect, authorize('parent'), createOrder);
router.post('/capture-order', protect, authorize('parent'), captureOrder);
router.post('/webhook', paypalWebhook, handleWebhook);

module.exports = router;
