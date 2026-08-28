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
});
