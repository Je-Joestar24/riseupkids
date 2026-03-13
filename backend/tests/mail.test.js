/**
 * Mail integration test – actually sends an email to jpar1252003@gmail.com.
 * Uses MAIL_FROM_ADDRESS and MAIL_FROM_NAME from .env; does not pass `from` so the service uses env.
 * Requires backend/.env with MAIL_DRIVER=smtp, SMTP_* and MAIL_FROM_* set.
 * Run: npm test -- tests/mail.test.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mailService = require('../services/mail');
const mailConfig = require('../config/mail');

const TEST_TO = 'jpar1252003@gmail.com';

describe('Mail service (integration)', () => {
  it('sends a real email to jpar1252003@gmail.com using ENV MAIL_FROM', async () => {
    // Do not pass `from` – service must use config.from (MAIL_FROM_ADDRESS, MAIL_FROM_NAME from .env)
    const result = await mailService.send({
      to: TEST_TO,
      subject: `[Rise Up Kids LMS] Mail test ${new Date().toISOString()}`,
      text: 'This is an integration test. From address is taken from MAIL_FROM_ADDRESS and MAIL_FROM_NAME in .env.',
      html: '<p>This is an integration test.</p><p>From address is taken from <code>MAIL_FROM_ADDRESS</code> and <code>MAIL_FROM_NAME</code> in .env.</p>',
    });

    expect(result).toBeDefined();
    if (mailConfig.driver === 'smtp' || mailConfig.driver === 'sendmail') {
      expect(result.messageId).toBeDefined();
      expect(typeof result.messageId).toBe('string');
    }
  });

  it('sends reset-code template to jpar1252003@gmail.com with sample code', async () => {
    const result = await mailService.sendResetCode({
      to: TEST_TO,
      code: '847291',
    });
    expect(result).toBeDefined();
    if (mailConfig.driver === 'smtp' || mailConfig.driver === 'sendmail') {
      expect(result.messageId).toBeDefined();
    }
  });
});
