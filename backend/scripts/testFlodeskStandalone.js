/**
 * Example: Test Flodesk service independently (no Express, no server).
 *
 * Signup (default):
 *   node scripts/testFlodeskStandalone.js [email]
 *
 * Invitation (sales page):
 *   node scripts/testFlodeskStandalone.js invitation "Parent Name" email whatsapp age [language]
 *   e.g. node scripts/testFlodeskStandalone.js invitation "Jejomar Parrilla" test@example.com +1234567890 5 en
 */

require('dotenv').config();
const { subscribeToFlodesk, submitInvitationToFlodesk } = require('../services/flodeskService');

async function run() {
  if (!process.env.FLODESK_API_KEY) {
    console.error('Set FLODESK_API_KEY in .env or environment');
    process.exit(1);
  }

  const isInvitation = process.argv[2] === 'invitation';

  if (isInvitation) {
    const parentName = process.argv[3];
    const email = process.argv[4];
    const whatsapp = process.argv[5];
    const age = process.argv[6];
    const language = process.argv[7] || 'en';
    if (!parentName || !email || whatsapp === undefined || age === undefined) {
      console.error('Usage: node scripts/testFlodeskStandalone.js invitation "Parent Name" email whatsapp age [language]');
      process.exit(1);
    }
    try {
      const result = await submitInvitationToFlodesk({
        parentName,
        email,
        whatsapp: String(whatsapp),
        age: String(age),
        language,
      });
      console.log('Flodesk submitInvitationToFlodesk result:', JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    return;
  }

  if (!process.env.SUBSCRIBED_FORM_ID) {
    console.error('Set SUBSCRIBED_FORM_ID in .env or environment');
    process.exit(1);
  }

  const email = process.argv[2] || 'test@example.com';

  try {
    const result = await subscribeToFlodesk(email);
    console.log('Flodesk subscribeToFlodesk result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
