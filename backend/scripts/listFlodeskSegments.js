/**
 * List Flodesk segments so you can find the SEGMENT ID (not form ID) to use in .env.
 *
 * Your form (e.g. https://riseupkids.myflodesk.com/fcqd8iz6uj) adds subscribers to a
 * segment. The API needs that segment's ID in SUBSCRIBED_FORM_ID (or FLODESK_SEGMENT_ID).
 *
 * Usage: node scripts/listFlodeskSegments.js
 * Requires: FLODESK_API_KEY in .env
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = (process.env.FLODESK_BASE_URL || 'https://api.flodesk.com/v1').replace(/\/$/, '');
const apiKey = process.env.FLODESK_API_KEY;

async function run() {
  if (!apiKey) {
    console.error('Set FLODESK_API_KEY in .env');
    process.exit(1);
  }

  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  try {
    const res = await axios.get(`${baseUrl}/segments`, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    const segments = res.data.data || res.data || [];
    if (segments.length === 0) {
      console.log('No segments found.');
      return;
    }

    console.log('Flodesk segments (use the "id" of the segment your form adds to):\n');
    segments.forEach((s) => {
      console.log(`  id:   ${s.id}`);
      console.log(`  name: ${s.name || '(no name)'}`);
      console.log('');
    });
    console.log('Set in .env: SUBSCRIBED_FORM_ID=<id of the segment your form uses>');
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message;
    console.error('Error:', msg);
    process.exit(1);
  }
}

run();
