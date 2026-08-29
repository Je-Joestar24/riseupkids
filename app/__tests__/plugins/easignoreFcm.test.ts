const fs = require('fs');
const path = require('path');

describe('EAS ignore native android so Expo prebuild (CNG) can apply FCM', () => {
  it('ignores app/android at the git root so the stale local project is not uploaded', () => {
    const rootIgnore = fs.readFileSync(path.join(__dirname, '../../../.easignore'), 'utf8');
    expect(rootIgnore).toMatch(/app\/android\//);
    expect(rootIgnore).toMatch(/!app\/google-services\.json/);
  });

  it('ignores android/ next to eas.json so preview builds run prebuild', () => {
    const appIgnore = fs.readFileSync(path.join(__dirname, '../../.easignore'), 'utf8');
    expect(appIgnore).toMatch(/^android\/$/m);
    expect(appIgnore).toMatch(/!google-services\.json/);
  });
});
