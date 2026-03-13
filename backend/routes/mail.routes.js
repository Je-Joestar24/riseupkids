/**
 * Mail routes – test and health.
 * Base path: /api/mail
 */
const express = require('express');
const router = express.Router();
const mailService = require('../services/mail');
const { renderResetCode } = require('../templates/email/resetCode');

/** Test recipient for development */
const TEST_EMAIL = 'jpar1252003@gmail.com';

/**
 * GET /api/mail/preview
 * Renders the reset-code email template as HTML so you can verify in the browser without sending.
 * Query: ?code=123456 (optional, default 123456).
 * Only available when NODE_ENV=development.
 */
router.get('/preview', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  const code = (req.query && req.query.code) ? String(req.query.code).replace(/\D/g, '').slice(0, 6) : '123456';
  const { html } = renderResetCode({ code: code.padEnd(6, '0') });
  res.type('html').send(html);
});

/**
 * POST /api/mail/test
 * Sends a test email to jpar1252003@gmail.com.
 * Only available when NODE_ENV=development.
 */
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  try {
    await mailService.send({
      to: TEST_EMAIL,
      subject: 'Rise Up Kids LMS – Test Email',
      text: 'This is a test email from the Rise Up Kids LMS mail service. If you received this, the mail setup is working.',
      html: '<p>This is a test email from the <strong>Rise Up Kids LMS</strong> mail service.</p><p>If you received this, the mail setup is working.</p>',
    });
    res.json({
      message: 'Test email sent successfully',
      to: TEST_EMAIL,
      driver: process.env.MAIL_DRIVER || 'log',
    });
  } catch (err) {
    console.error('[Mail test]', err);
    res.status(500).json({
      message: 'Failed to send test email',
      error: err.message,
    });
  }
});

/**
 * POST /api/mail/test-code
 * Sends the reset-code email template to jpar1252003@gmail.com with a sample 6-digit code.
 * Uses logo from /email-assets/email_logo.png (BACKEND_BASE_URL must be set for logo to load in email).
 * Only available when NODE_ENV=development.
 */
router.post('/test-code', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }
  const code = (req.body && req.body.code) ? String(req.body.code).replace(/\D/g, '').slice(0, 6) : '123456';
  try {
    await mailService.sendResetCode({
      to: TEST_EMAIL,
      code: code.padEnd(6, '0'),
    });
    res.json({
      message: 'Reset code test email sent successfully',
      to: TEST_EMAIL,
      code: code.padEnd(6, '0'),
      driver: process.env.MAIL_DRIVER || 'log',
    });
  } catch (err) {
    console.error('[Mail test-code]', err);
    res.status(500).json({
      message: 'Failed to send test code email',
      error: err.message,
    });
  }
});

module.exports = router;
