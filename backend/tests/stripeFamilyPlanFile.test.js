/**
 * Which Stripe price-id file is read. The rule that matters: a LIVE key must never read test (or the old shared) ids.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  keyMode,
  fileNameForMode,
  filePathForMode,
  loadFamilyPlanConfig,
  LEGACY_FILE,
} = require('../config/stripeFamilyPlanFile');

let dir;
const write = (name, data) => fs.writeFileSync(path.join(dir, name), typeof data === 'string' ? data : JSON.stringify(data));
const file = (tag) => ({ productId: `prod_${tag}`, prices: { br: { 1: `price_${tag}_br1` }, us: {}, eu: {} } });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stripe-file-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('keyMode', () => {
  it.each([
    ['sk_live_abc', 'live'],
    ['rk_live_abc', 'live'],
    ['sk_test_abc', 'test'],
    ['rk_test_abc', 'test'],
    ['', 'unknown'],
    [undefined, 'unknown'],
    [null, 'unknown'],
    ['pk_live_abc', 'unknown'],
    ['live_sk_', 'unknown'],
    [' sk_live_abc', 'unknown'],
  ])('%p is %p', (key, mode) => {
    expect(keyMode(key)).toBe(mode);
  });
});

describe('file names', () => {
  it('live uses the live file, everything else the test file', () => {
    expect(fileNameForMode('live')).toBe('stripeFamilyPlanPrices.live.json');
    expect(fileNameForMode('test')).toBe('stripeFamilyPlanPrices.test.json');
    expect(fileNameForMode('unknown')).toBe('stripeFamilyPlanPrices.test.json');
    expect(path.basename(filePathForMode('live', dir))).toBe('stripeFamilyPlanPrices.live.json');
  });
});

describe('a live key', () => {
  it('reads the live file', () => {
    write('stripeFamilyPlanPrices.live.json', file('live'));
    const result = loadFamilyPlanConfig({ secretKey: 'sk_live_x', dir });
    expect(result).toMatchObject({ mode: 'live', source: 'mode-file', productId: 'prod_live', error: null });
    expect(result.prices.br[1]).toBe('price_live_br1');
  });

  it('NEVER reads the test file or the old shared file, even when they are the only ones there', () => {
    write('stripeFamilyPlanPrices.test.json', file('test'));
    write(LEGACY_FILE, file('legacy'));
    const result = loadFamilyPlanConfig({ secretKey: 'sk_live_x', dir });
    expect(result.source).toBe('none');
    expect(result.productId).toBe('');
    expect(result.prices).toEqual({ br: {}, us: {}, eu: {} });
  });

  it('says what to run when there is no live file', () => {
    const result = loadFamilyPlanConfig({ secretKey: 'sk_live_x', dir });
    expect(result.error).toMatch(/createStripePrices\.js --dry-run/);
    expect(result.error).toMatch(/--confirm/);
  });

  it('prefers the live file over the old one when both exist', () => {
    write('stripeFamilyPlanPrices.live.json', file('live'));
    write(LEGACY_FILE, file('legacy'));
    expect(loadFamilyPlanConfig({ secretKey: 'rk_live_x', dir }).productId).toBe('prod_live');
  });
});

describe('a test key, or no key', () => {
  it('reads the test file', () => {
    write('stripeFamilyPlanPrices.test.json', file('test'));
    expect(loadFamilyPlanConfig({ secretKey: 'sk_test_x', dir })).toMatchObject({ source: 'mode-file', productId: 'prod_test' });
  });

  it('falls back to the old shared file, so a developer machine keeps working', () => {
    write(LEGACY_FILE, file('legacy'));
    expect(loadFamilyPlanConfig({ secretKey: 'sk_test_x', dir })).toMatchObject({ source: 'legacy-file', productId: 'prod_legacy' });
    expect(loadFamilyPlanConfig({ secretKey: undefined, dir })).toMatchObject({ source: 'legacy-file', productId: 'prod_legacy' });
  });

  it('prefers the test file over the old one', () => {
    write('stripeFamilyPlanPrices.test.json', file('test'));
    write(LEGACY_FILE, file('legacy'));
    expect(loadFamilyPlanConfig({ secretKey: 'sk_test_x', dir }).productId).toBe('prod_test');
  });

  it('is empty (not an error) when there is nothing, because Stripe is optional', () => {
    expect(loadFamilyPlanConfig({ secretKey: undefined, dir })).toMatchObject({ source: 'none', productId: '', error: null });
  });
});

describe('a broken file', () => {
  it('reports it instead of crashing or silently using another file', () => {
    write('stripeFamilyPlanPrices.live.json', '{ not json');
    write(LEGACY_FILE, file('legacy'));
    const result = loadFamilyPlanConfig({ secretKey: 'sk_live_x', dir });
    expect(result.source).toBe('none');
    expect(result.error).toMatch(/Could not read stripeFamilyPlanPrices\.live\.json/);
    expect(result.productId).toBe('');
  });

  it('keeps monthly prices when the file has them, and gives empty ones when not', () => {
    write('stripeFamilyPlanPrices.test.json', { ...file('t'), monthlyPrices: { br: { 1: 'price_m' }, us: {}, eu: {} } });
    expect(loadFamilyPlanConfig({ secretKey: 'sk_test_x', dir }).monthlyPrices.br[1]).toBe('price_m');
    write('stripeFamilyPlanPrices.test.json', file('t'));
    expect(loadFamilyPlanConfig({ secretKey: 'sk_test_x', dir }).monthlyPrices).toEqual({ br: {}, us: {}, eu: {} });
  });
});
