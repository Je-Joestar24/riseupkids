const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function getExpoAccessToken() {
  return process.env.EXPO_ACCESS_TOKEN || process.env.EXPO_PUSH_ACCESS_TOKEN || '';
}

function formatExpoRequestError(error) {
  const data = error?.response?.data;
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const first = errors[0];
  const code = first?.code || first?.error;
  const detailMessage = first?.message || data?.message || error?.message || 'provider_error';
  const wrapped = new Error(code ? `${code}: ${detailMessage}` : detailMessage);
  wrapped.statusCode = error?.response?.status;
  wrapped.expoErrors = errors;
  wrapped.expoDetails = first?.details;
  return wrapped;
}

async function defaultExpoRequest(url, messages, headers) {
  try {
    const response = await axios.post(url, messages, { headers, timeout: 15000 });
    return response.data;
  } catch (error) {
    throw formatExpoRequestError(error);
  }
}

/**
 * Send Expo push messages. Inject `request` in tests — never call the live provider in CI.
 */
async function sendExpoPushMessages(messages, { request } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const headers = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  const accessToken = getExpoAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const post = request || defaultExpoRequest;
  const body = await post(EXPO_PUSH_URL, messages, headers);
  if (Array.isArray(body?.errors) && body.errors.length) {
    console.error('[notifications] expo push errors:', JSON.stringify(body.errors));
    const mixed = body.errors.some((row) =>
      /PUSH_TOO_MANY_EXPERIENCE/i.test(`${row.code || ''} ${row.message || ''}`)
    );
    if (mixed) {
      const first = body.errors[0];
      const error = new Error(
        `${first.code || 'PUSH_TOO_MANY_EXPERIENCE_IDS'}: ${first.message || 'mixed Expo experiences'}`
      );
      error.expoErrors = body.errors;
      throw error;
    }
  }
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
}

module.exports = {
  EXPO_PUSH_URL,
  getExpoAccessToken,
  sendExpoPushMessages,
  formatExpoRequestError,
};
