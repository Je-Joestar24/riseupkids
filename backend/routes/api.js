const express = require('express');
const router = express.Router();

// Sample API route - returns JSON data
router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rise Up Kids API is working!',
    data: {
      platform: 'Rise Up Kids',
      version: '1.0.0',
      status: 'active',
      features: [
        'Child Learning Management',
        'Parent Progress Tracking',
        'Admin Content Management',
        'Lesson Management',
        'Read-Along Books',
        'Progress Tracking'
      ],
      users: {
        admin: 'Content and platform management',
        parent: 'Child account and progress monitoring',
        child: 'Learning and activities'
      },
      timestamp: new Date().toISOString()
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;

