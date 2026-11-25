/**
 * Which Stripe price-id file to read, decided by the KIND of Stripe key (live or test).
 *
 * Why: Stripe test mode and live mode have completely separate prices. Price ids created with a test key do not exist
 * for a live key ("No such price"). One shared file made that mistake easy, so there is one file per mode:
 *   stripeFamilyPlanPrices.live.json   used with sk_live_ / rk_live_ keys
 *   stripeFamilyPlanPrices.test.json   used with sk_test_ keys (and when no key is set)
 *   stripeFamilyPlanPrices.json        the OLD shared file: only ever used for test/no key, NEVER with a live key
 *
 * Pure helpers (no Stripe, no network): scripts and tests use them without side effects.
 */

const path = require('path');
const realFs = require('fs');

const LEGACY_FILE = 'stripeFamilyPlanPrices.json';
const FILE_BY_MODE = { live: 'stripeFamilyPlanPrices.live.json', test: 'stripeFamilyPlanPrices.test.json' };

/** "live" | "test" | "unknown", from the key itself. The key is never returned or printed. */
function keyMode(secretKey) {
  if (/^(sk|rk)_live_/.test(secretKey || '')) return 'live';
  if (/^(sk|rk)_test_/.test(secretKey || '')) return 'test';
  return 'unknown';
}

/** The file this mode writes to and reads from first. Unknown keys behave like test. */
function fileNameForMode(mode) {
  return mode === 'live' ? FILE_BY_MODE.live : FILE_BY_MODE.test;
}

function filePathForMode(mode, dir = __dirname) {
  return path.join(dir, fileNameForMode(mode));
}

/**
 * Loads the price-id config for a key.
 * @returns {{ mode: string, source: 'mode-file'|'legacy-file'|'none', file: string|null,
 *             productId: string, prices: object, monthlyPrices: object, error: string|null }}
 *   `source: 'none'` + `error` when nothing usable was found (a LIVE key with no live file ends up here on purpose).
 */
function loadFamilyPlanConfig({ secretKey, dir = __dirname, fs = realFs } = {}) {
  const mode = keyMode(secretKey);
  const empty = { mode, source: 'none', file: null, productId: '', prices: { br: {}, us: {}, eu: {} }, monthlyPrices: { br: {}, us: {}, eu: {} }, error: null };

  const candidates = [path.join(dir, fileNameForMode(mode))];
  if (mode !== 'live') candidates.push(path.join(dir, LEGACY_FILE)); // never for a live key

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        ...empty,
        source: file === candidates[0] ? 'mode-file' : 'legacy-file',
        file,
        productId: data.productId || '',
        prices: data.prices || empty.prices,
        monthlyPrices: data.monthlyPrices || empty.monthlyPrices,
      };
    } catch (err) {
      return { ...empty, file, error: `Could not read ${path.basename(file)}: ${err.message}` };
    }
  }

  if (mode === 'live') {
    return {
      ...empty,
      error:
        `No ${FILE_BY_MODE.live} found. A live Stripe key needs live prices: run "node scripts/createStripePrices.js --dry-run", ` +
        'then again with --confirm, using the live key.',
    };
  }
  return empty;
}

module.exports = { LEGACY_FILE, FILE_BY_MODE, keyMode, fileNameForMode, filePathForMode, loadFamilyPlanConfig };
