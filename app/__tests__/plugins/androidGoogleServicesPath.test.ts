const fs = require('fs');
const os = require('os');
const path = require('path');

const { findGoogleServicesFile } = require('../../plugins/androidGoogleServicesPath');

describe('androidGoogleServicesPath', () => {
  it('finds google-services.json next to app.json', () => {
    const found = findGoogleServicesFile(path.join(__dirname, '../..'));
    expect(found).toBeTruthy();
    expect(path.basename(found)).toBe('google-services.json');
  });

  it('prefers GOOGLE_SERVICES_JSON when EAS injects a file path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruk-gs-'));
    const injected = path.join(dir, 'secret.json');
    fs.writeFileSync(injected, '{}');

    expect(findGoogleServicesFile(dir, { GOOGLE_SERVICES_JSON: injected })).toBe(injected);
  });

  it('returns null when the file is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruk-gs-empty-'));
    expect(findGoogleServicesFile(dir, {})).toBeNull();
  });

  it('reads package and project from google-services.json without exposing the API key', () => {
    const {
      parseGoogleServicesClient,
      toFcmDebugProbe,
      firebaseResourceStrings,
    } = require('../../plugins/androidGoogleServicesPath');
    const parsed = parseGoogleServicesClient(
      JSON.stringify({
        project_info: {
          project_number: '123',
          project_id: 'demo-project',
          storage_bucket: 'demo-project.appspot.com',
        },
        client: [
          {
            client_info: {
              mobilesdk_app_id: '1:123:android:abc',
              android_client_info: { package_name: 'com.riseupkids.app' },
            },
            api_key: [{ current_key: 'secret-key' }],
          },
        ],
      })
    );
    expect(parsed.packageName).toBe('com.riseupkids.app');
    expect(toFcmDebugProbe(parsed)).toEqual({
      fileFound: 'true',
      packageName: 'com.riseupkids.app',
      firebaseProjectId: 'demo-project',
      googleAppId: '1:123:android:abc',
    });
    expect(JSON.stringify(toFcmDebugProbe(parsed))).not.toContain('secret-key');
    expect(firebaseResourceStrings(parsed).some((row) => row.$.name === 'google_app_id')).toBe(true);
  });
});
