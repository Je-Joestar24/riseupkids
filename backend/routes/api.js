const express = require('express');
const router = express.Router();

// In production/staging these endpoints return the minimum. In development they stay verbose
// (endpoint catalogue, version, uptime) as a convenience — that detail is free reconnaissance
// in production (RUK-SEC-031).
const isProdLike = () => ['production', 'staging'].includes((process.env.NODE_ENV || '').toLowerCase());

// Sample API route
router.post('/', (req, res) => {
  if (isProdLike()) {
    return res.json({ success: true, message: 'Rise Up Kids API' });
  }
  res.json({
    success: true,
    message: 'Rise Up Kids API is working!',
    data: {
      platform: 'Rise Up Kids',
      status: 'active',
      timestamp: new Date().toISOString(),
    },
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  if (isProdLike()) {
    return res.json({ status: 'ok' });
  }
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
