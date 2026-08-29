const {
  ensureApplyPlugin,
  ensureClassPath,
} = require('../../plugins/withAndroidGoogleServices');

describe('withAndroidGoogleServices gradle wiring', () => {
  it('adds the Google Services classpath inside buildscript dependencies', () => {
    const input = `
buildscript {
  repositories { google() }
  dependencies {
    classpath('com.android.tools.build:gradle')
  }
}
`;
    const next = ensureClassPath(input);
    expect(next).toContain("classpath('com.google.gms:google-services:4.4.2')");
    expect(ensureClassPath(next)).toBe(next);
  });

  it('appends the Google Services plugin to the app module', () => {
    const input = `apply plugin: "com.android.application"\n`;
    const next = ensureApplyPlugin(input);
    expect(next).toContain("apply plugin: 'com.google.gms.google-services'");
    expect(ensureApplyPlugin(next)).toBe(next);
  });

  it('initializes FirebaseApp in MainApplication when missing', () => {
    const { ensureFirebaseInit } = require('../../plugins/withAndroidGoogleServices');
    const next = ensureFirebaseInit(`
import android.app.Application
class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
  }
}
`);
    expect(next).toContain('import com.google.firebase.FirebaseApp');
    expect(next).toContain('FirebaseApp.initializeApp(this)');
  });
});
