/**
 * Chunk 11 — Mobile App Security: build & secrets hygiene.
 * EXPO_PUBLIC_* vars ship inside the built app bundle — this gate flags a var name that looks
 * like it's meant to hold a credential before it ever gets a real value.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  findSensitivePublicEnvNames,
  readEnvVarNames,
  readEasJsonEnvNames,
} = require('../../scripts/checkPublicEnvNames');

describe('findSensitivePublicEnvNames', () => {
  it('lets today\'s real public env var names through clean', () => {
    expect(
      findSensitivePublicEnvNames([
        'EXPO_PUBLIC_API_URL',
        'EXPO_PUBLIC_BACKEND_ORIGIN',
        'EXPO_PUBLIC_CMS_VIDEO_DEBUG',
        'EXPO_PUBLIC_APP_NAME',
      ])
    ).toEqual([]);
  });

  it('flags an EXPO_PUBLIC_* name that looks like a credential', () => {
    expect(findSensitivePublicEnvNames(['EXPO_PUBLIC_STRIPE_SECRET_KEY'])).toEqual([
      'EXPO_PUBLIC_STRIPE_SECRET_KEY',
    ]);
    expect(findSensitivePublicEnvNames(['EXPO_PUBLIC_ADMIN_PASSWORD'])).toEqual([
      'EXPO_PUBLIC_ADMIN_PASSWORD',
    ]);
    expect(findSensitivePublicEnvNames(['EXPO_PUBLIC_REFRESH_TOKEN'])).toEqual([
      'EXPO_PUBLIC_REFRESH_TOKEN',
    ]);
  });

  it('ignores a sensitive-looking name that is NOT prefixed EXPO_PUBLIC_ — it never ships client-side', () => {
    expect(findSensitivePublicEnvNames(['JWT_SECRET', 'STRIPE_API_KEY'])).toEqual([]);
  });
});

describe('readEnvVarNames', () => {
  it('reads both active and commented-out KEY= declarations from a dotenv-style file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruk-envcheck-'));
    const file = path.join(dir, '.env.example');
    fs.writeFileSync(
      file,
      ['EXPO_PUBLIC_API_URL=https://api.riseup.kids/api', '#EXPO_PUBLIC_LOG_API_URL=false', '', '# a comment with no ='].join(
        '\n'
      )
    );

    expect(readEnvVarNames(file)).toEqual(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_LOG_API_URL']);
  });

  it('returns an empty array instead of throwing when the file does not exist', () => {
    expect(readEnvVarNames('/does/not/exist/.env.example')).toEqual([]);
  });
});

describe('readEasJsonEnvNames', () => {
  it('collects env keys across every build profile', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruk-envcheck-eas-'));
    const file = path.join(dir, 'eas.json');
    fs.writeFileSync(
      file,
      JSON.stringify({
        build: {
          preview: { env: { EXPO_PUBLIC_API_URL: 'https://staging.example.com/api' } },
          production: { env: { EXPO_PUBLIC_API_URL: 'https://api.riseup.kids/api' } },
          development: { developmentClient: true },
        },
      })
    );

    expect(readEasJsonEnvNames(file)).toEqual(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_URL']);
  });

  it('returns an empty array for a malformed or missing eas.json', () => {
    expect(readEasJsonEnvNames('/does/not/exist/eas.json')).toEqual([]);
  });
});

describe('end-to-end: the real repo files pass clean today', () => {
  it('finds no sensitive-looking EXPO_PUBLIC_* names in .env.example or eas.json', () => {
    const appDir = path.join(__dirname, '../..');
    const names = [
      ...readEnvVarNames(path.join(appDir, '.env.example')),
      ...readEasJsonEnvNames(path.join(appDir, 'eas.json')),
    ];
    expect(findSensitivePublicEnvNames(names)).toEqual([]);
  });
});
