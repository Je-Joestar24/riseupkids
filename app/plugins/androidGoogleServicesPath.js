const fs = require('fs');
const path = require('path');

const EXPECTED_ANDROID_PACKAGE = 'com.riseupkids.app';

/**
 * Resolve google-services.json for EAS / local prebuild.
 * EAS file env GOOGLE_SERVICES_JSON is a path on the builder when set.
 */
function findGoogleServicesFile(projectRoot, env = process.env) {
  const candidates = [
    env.GOOGLE_SERVICES_JSON,
    path.join(projectRoot, 'google-services.json'),
    path.join(projectRoot, 'app', 'google-services.json'),
  ].filter(Boolean);

  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
}

function parseGoogleServicesClient(raw, expectedPackage = EXPECTED_ANDROID_PACKAGE) {
  const json = JSON.parse(raw);
  const projectId = String(json?.project_info?.project_id || '').trim();
  const projectNumber = String(json?.project_info?.project_number || '').trim();
  const storageBucket = String(json?.project_info?.storage_bucket || '').trim();
  const clients = Array.isArray(json?.client) ? json.client : [];
  const client =
    clients.find((row) => row?.client_info?.android_client_info?.package_name === expectedPackage) ||
    clients[0];
  const packageName = String(client?.client_info?.android_client_info?.package_name || '').trim();
  const googleAppId = String(client?.client_info?.mobilesdk_app_id || '').trim();
  const apiKey = String(client?.api_key?.[0]?.current_key || '').trim();

  if (!projectId || !projectNumber || !packageName || !googleAppId || !apiKey) {
    throw new Error('[notifications] google-services.json is missing required Firebase fields');
  }
  if (packageName !== expectedPackage) {
    throw new Error(
      `[notifications] google-services.json package_name is ${packageName}, expected ${expectedPackage}`
    );
  }

  return { projectId, projectNumber, storageBucket, packageName, googleAppId, apiKey };
}

function firebaseResourceStrings(parsed) {
  return [
    { $: { name: 'google_app_id', translatable: 'false' }, _: parsed.googleAppId },
    { $: { name: 'gcm_defaultSenderId', translatable: 'false' }, _: parsed.projectNumber },
    { $: { name: 'google_api_key', translatable: 'false' }, _: parsed.apiKey },
    { $: { name: 'project_id', translatable: 'false' }, _: parsed.projectId },
    parsed.storageBucket
      ? { $: { name: 'google_storage_bucket', translatable: 'false' }, _: parsed.storageBucket }
      : null,
  ].filter(Boolean);
}

function toFcmDebugProbe(parsed) {
  if (!parsed) {
    return {
      fileFound: 'false',
      packageName: 'missing',
      firebaseProjectId: 'missing',
      googleAppId: 'missing',
    };
  }
  return {
    fileFound: 'true',
    packageName: parsed.packageName,
    firebaseProjectId: parsed.projectId,
    googleAppId: parsed.googleAppId,
  };
}

module.exports = {
  EXPECTED_ANDROID_PACKAGE,
  findGoogleServicesFile,
  parseGoogleServicesClient,
  firebaseResourceStrings,
  toFcmDebugProbe,
};
