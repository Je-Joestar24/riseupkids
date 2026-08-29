const fs = require('fs');
const {
  AndroidConfig,
  withAppBuildGradle,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const {
  findGoogleServicesFile,
  parseGoogleServicesClient,
  toFcmDebugProbe,
} = require('./androidGoogleServicesPath');

const CLASS_PATH = 'com.google.gms:google-services:4.4.2';
const APPLY_LINE = "apply plugin: 'com.google.gms.google-services'";

function readParsedGoogleServices(projectRoot) {
  const source = findGoogleServicesFile(projectRoot);
  if (!source) return { source: null, parsed: null };
  return {
    source,
    parsed: parseGoogleServicesClient(fs.readFileSync(source, 'utf8')),
  };
}

/**
 * Expo's built-in GoogleServices helpers only edit Groovy Gradle files.
 * SDK templates are Groovy; still apply classpath/plugin for Kotlin DSL too.
 */
function ensureClassPath(contents) {
  if (contents.includes('com.google.gms:google-services')) return contents;
  if (contents.includes('buildscript')) {
    return contents.replace(
      /buildscript\s*\{([\s\S]*?)dependencies\s*\{/,
      (match) => `${match}\n        classpath('${CLASS_PATH}')`
    );
  }
  return `${contents}\nbuildscript {\n  dependencies {\n    classpath('${CLASS_PATH}')\n  }\n}\n`;
}

function ensureApplyPlugin(contents) {
  if (/com\.google\.gms\.google-services/.test(contents)) return contents;
  if (/id\(["']com\.android\.application["']\)/.test(contents)) {
    return contents.replace(
      /id\(["']com\.android\.application["']\)/,
      (match) => `${match}\n    id("com.google.gms.google-services")`
    );
  }
  return `${contents.trimEnd()}\n${APPLY_LINE}\n`;
}

/**
 * Official Expo FCM wiring for managed / CNG builds:
 * https://docs.expo.dev/push-notifications/fcm-credentials/
 * https://docs.expo.dev/push-notifications/push-notifications-setup/
 *
 * 1. android.googleServicesFile in app.json
 * 2. Copy google-services.json to android/app/
 * 3. classpath + apply plugin com.google.gms.google-services
 * Firebase then starts via FirebaseInitProvider. Do not skip prebuild.
 */
function withAndroidGoogleServices(config) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const { source, parsed } = readParsedGoogleServices(projectRoot);
  if (!source || !parsed) {
    throw new Error(
      '[notifications] google-services.json was not found next to app.json. Put it at app/google-services.json. EAS must run prebuild (do not upload a local android/ folder).'
    );
  }

  config.android = config.android || {};
  config.android.googleServicesFile = config.android.googleServicesFile || './google-services.json';
  config.extra = config.extra || {};
  config.extra.fcm = toFcmDebugProbe(parsed);

  config = AndroidConfig.GoogleServices.withClassPath(config);
  config = AndroidConfig.GoogleServices.withApplyPlugin(config);
  config = AndroidConfig.GoogleServices.withGoogleServicesFile(config);

  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureClassPath(mod.modResults.contents);
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureApplyPlugin(mod.modResults.contents);
    return mod;
  });

  return config;
}

module.exports = withAndroidGoogleServices;
module.exports.ensureClassPath = ensureClassPath;
module.exports.ensureApplyPlugin = ensureApplyPlugin;
