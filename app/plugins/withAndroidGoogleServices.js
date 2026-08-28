const { AndroidConfig } = require('expo/config-plugins');

const { findGoogleServicesFile } = require('./androidGoogleServicesPath');

/**
 * Expo copies google-services.json only when the path resolves, and only then
 * applies the Google Services Gradle plugin. If that plugin is missing,
 * FirebaseApp never initializes and getExpoPushTokenAsync fails on Android.
 */
function withAndroidGoogleServices(config) {
  const projectRoot = process.cwd();
  const source = findGoogleServicesFile(projectRoot);
  if (!source) {
    throw new Error(
      '[notifications] google-services.json was not found next to app.json. Put it at app/google-services.json and rebuild with eas build --clear-cache.'
    );
  }

  config.android = config.android || {};
  config.android.googleServicesFile = source;

  config = AndroidConfig.GoogleServices.withClassPath(config);
  config = AndroidConfig.GoogleServices.withApplyPlugin(config);
  config = AndroidConfig.GoogleServices.withGoogleServicesFile(config);
  return config;
}

module.exports = withAndroidGoogleServices;
