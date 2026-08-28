const fs = require('fs');
const path = require('path');

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

module.exports = { findGoogleServicesFile };
