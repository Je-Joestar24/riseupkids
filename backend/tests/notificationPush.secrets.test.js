/**
 * Phase 3: push secrets must stay backend / EAS only.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCAN_DIRS = [path.join(ROOT, 'app'), path.join(ROOT, 'frontend', 'src')];
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', 'build', '.expo']);
const SECRET_PATTERN =
  /EXPO_ACCESS_TOKEN\s*[:=]\s*['"`][^'"`]+['"`]|EXPO_PUSH_ACCESS_TOKEN\s*[:=]\s*['"`][^'"`]+['"`]|AAAA[A-Za-z0-9_-]{80,}|-----BEGIN PRIVATE KEY-----|apns[_-]?key[_-]?id\s*[:=]\s*['"`][^'"`]+['"`]/i;

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, files);
      continue;
    }
    if (!/\.(js|jsx|ts|tsx|json|env)$/i.test(entry.name)) continue;
    if (entry.name === 'app.json' || entry.name.endsWith('.lock')) continue;
    files.push(full);
  }
  return files;
}

describe('Notification push secrets (Phase 3.5)', () => {
  it('does not store FCM / APNs / Expo access keys in app or admin frontend source', () => {
    const hits = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walkFiles(dir)) {
        const text = fs.readFileSync(file, 'utf8');
        if (SECRET_PATTERN.test(text)) {
          hits.push(path.relative(ROOT, file));
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
