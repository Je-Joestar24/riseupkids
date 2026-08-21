const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function getExpoAccessToken() {
  return process.env.EXPO_ACCESS_TOKEN || process.env.EXPO_PUSH_ACCESS_TOKEN || '';
}

async function defaultExpoRequest(url, messages, headers) {
  const response = await axios.post(url, messages, { headers, timeout: 15000 });
  return response.data;
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
  return Array.isArray(body?.data) ? body.data : [];
}

module.exports = {
  EXPO_PUSH_URL,
  getExpoAccessToken,
  sendExpoPushMessages,
};
