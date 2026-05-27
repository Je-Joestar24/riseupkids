/**
 * PagBank (PagSeguro) Checkout routes — Brazil Family Plan.
 *
 * GET  /api/pagseguro/config           — public
 * POST /api/pagseguro/create-checkout  — parent auth
 *
 * Webhooks: POST /api/pagseguro/webhooks/* (registered in server.js with raw body)
 */

const express = require('express');
const { getConfig, createCheckout, getCheckoutDetails } = require('../controllers/pagseguro.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/config', getConfig);
router.get('/checkout/:checkoutId', getCheckoutDetails);
router.post('/create-checkout', protect, authorize('parent'), createCheckout);

module.exports = router;
