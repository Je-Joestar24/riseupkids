const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withProjectBuildGradle, withDangerousMod } = require('expo/config-plugins');

const { findGoogleServicesFile } = require('./androidGoogleServicesPath');

const CLASS_PATH = "com.google.gms:google-services:4.4.2";
const APPLY_LINE = "apply plugin: 'com.google.gms.google-services'";

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
  return `${contents.trimEnd()}\n${APPLY_LINE}\n`;
}

/**
 * Copy google-services.json into the native Android app and apply the Google
 * Services Gradle plugin. Without that plugin, FirebaseApp never initializes
 * and expo-notifications cannot mint an Android push token.
 */
function withAndroidGoogleServices(config) {
  config.android = config.android || {};
  config.android.googleServicesFile = config.android.googleServicesFile || './google-services.json';

  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy') {
      mod.modResults.contents = ensureClassPath(mod.modResults.contents);
    }
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy') {
      mod.modResults.contents = ensureApplyPlugin(mod.modResults.contents);
    }
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const source = findGoogleServicesFile(projectRoot);
      if (!source) {
        throw new Error(
          '[notifications] google-services.json was not found next to app.json. Put it at app/google-services.json and rebuild with eas build --clear-cache.'
        );
      }
      const dest = path.join(mod.modRequest.platformProjectRoot, 'app', 'google-services.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(source, dest);
      return mod;
    },
  ]);

  return config;
}

module.exports = withAndroidGoogleServices;
module.exports.ensureClassPath = ensureClassPath;
module.exports.ensureApplyPlugin = ensureApplyPlugin;
