/* global __dirname */
const fs = require('fs');
const path = require('path');

/**
 * Chunk 11 — Mobile App Security: build & secrets hygiene.
 *
 * Any env var prefixed EXPO_PUBLIC_ is inlined into the built JS bundle at build time — it ships
 * inside the app and anyone who has it can extract the value, the same way a website's client-
 * side JS is never actually private. That's fine for things like an API base URL; it is NOT fine
 * for anything that should stay a server-side secret. This is a naming-convention gate, not a
 * secret-value scanner (gitleaks already covers real committed secret values across the whole
 * repo) — it flags an EXPO_PUBLIC_* name that LOOKS like it's meant to hold a credential, before
 * it ever gets a real value and ships.
 */
const SENSITIVE_NAME_PATTERN = /SECRET|PRIVATE|PASSWORD|CREDENTIAL|KEY|TOKEN/i;

/** @param {string[]} names @returns {string[]} the EXPO_PUBLIC_* names that look sensitive */
function findSensitivePublicEnvNames(names) {
  return names.filter((name) => name.startsWith('EXPO_PUBLIC_') && SENSITIVE_NAME_PATTERN.test(name));
}

/** Parses `KEY=value` / `#KEY=value` lines from a dotenv-style file. Never throws on a missing file. */
function readEnvVarNames(filePath) {
  let contents;
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const names = [];
  for (const line of contents.split('\n')) {
    const match = line.match(/^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/);
    if (match) names.push(match[1]);
  }
  return names;
}

/** Parses every key inside any `env: {...}` block of an eas.json build profile. */
function readEasJsonEnvNames(filePath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
  const profiles = parsed?.build || {};
  const names = [];
  for (const profile of Object.values(profiles)) {
    if (profile && typeof profile === 'object' && profile.env && typeof profile.env === 'object') {
      names.push(...Object.keys(profile.env));
    }
  }
  return names;
}

function main() {
  const appDir = path.join(__dirname, '..');
  const names = [
    ...readEnvVarNames(path.join(appDir, '.env.example')),
    ...readEasJsonEnvNames(path.join(appDir, 'eas.json')),
  ];
  const flagged = findSensitivePublicEnvNames([...new Set(names)]);

  if (flagged.length > 0) {
    console.error(
      `EXPO_PUBLIC_* env var name(s) look like they hold a credential — these ship inside the ` +
        `built app bundle and are extractable by anyone: ${flagged.join(', ')}\n` +
        `Move the real value server-side and have the app call an authenticated endpoint instead.`
    );
    process.exit(1);
  }

  console.log('ok — no sensitive-looking EXPO_PUBLIC_* env var names found');
}

if (require.main === module) {
  main();
}

module.exports = { findSensitivePublicEnvNames, readEnvVarNames, readEasJsonEnvNames };
