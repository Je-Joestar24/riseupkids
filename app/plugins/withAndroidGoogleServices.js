const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
  withProjectBuildGradle,
  withStringsXml,
} = require('expo/config-plugins');

const {
  findGoogleServicesFile,
  parseGoogleServicesClient,
  firebaseResourceStrings,
  toFcmDebugProbe,
} = require('./androidGoogleServicesPath');

const CLASS_PATH = "com.google.gms:google-services:4.4.2";
const APPLY_LINE = "apply plugin: 'com.google.gms.google-services'";

function readParsedGoogleServices(projectRoot) {
  const source = findGoogleServicesFile(projectRoot);
  if (!source) return { source: null, parsed: null };
  return {
    source,
    parsed: parseGoogleServicesClient(fs.readFileSync(source, 'utf8')),
  };
}

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

function ensureFirebaseInit(contents) {
  if (contents.includes('FirebaseApp.initializeApp')) return contents;
  let next = contents;
  if (!next.includes('com.google.firebase.FirebaseApp')) {
    if (next.includes('import android.app.Application')) {
      next = next.replace(
        'import android.app.Application',
        'import android.app.Application\nimport com.google.firebase.FirebaseApp'
      );
    } else {
      next = `import com.google.firebase.FirebaseApp\n${next}`;
    }
  }
  return next.replace(
    'super.onCreate()',
    'super.onCreate()\n    if (FirebaseApp.getApps(this).isEmpty()) {\n      FirebaseApp.initializeApp(this)\n    }'
  );
}

/**
 * Copy google-services.json, write Firebase resource strings, apply the Google
 * Services Gradle plugin, and initialize FirebaseApp. Without google_app_id in
 * Android resources, expo-notifications cannot mint an Android push token.
 */
function withAndroidGoogleServices(config) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const { parsed } = readParsedGoogleServices(projectRoot);
  config.android = config.android || {};
  config.android.googleServicesFile = config.android.googleServicesFile || './google-services.json';
  config.extra = config.extra || {};
  config.extra.fcm = toFcmDebugProbe(parsed);

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

  config = withStringsXml(config, (mod) => {
    const found = readParsedGoogleServices(mod.modRequest.projectRoot);
    if (!found.parsed) {
      throw new Error(
        '[notifications] google-services.json was not found next to app.json. Put it at app/google-services.json and rebuild with eas build --clear-cache.'
      );
    }
    mod.modResults = AndroidConfig.Strings.setStringItem(
      firebaseResourceStrings(found.parsed),
      mod.modResults
    );
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    mod.modResults.contents = ensureFirebaseInit(mod.modResults.contents);
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const found = readParsedGoogleServices(mod.modRequest.projectRoot);
      if (!found.source) {
        throw new Error(
          '[notifications] google-services.json was not found next to app.json. Put it at app/google-services.json and rebuild with eas build --clear-cache.'
        );
      }
      const dest = path.join(mod.modRequest.platformProjectRoot, 'app', 'google-services.json');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(found.source, dest);
      return mod;
    },
  ]);

  return config;
}

module.exports = withAndroidGoogleServices;
module.exports.ensureClassPath = ensureClassPath;
module.exports.ensureApplyPlugin = ensureApplyPlugin;
module.exports.ensureFirebaseInit = ensureFirebaseInit;
