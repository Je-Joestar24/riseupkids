/**
 * Checks the PayPal prices against the ONE price list. OFFLINE and read only: no PayPal call, no keys.
 *
 *   npm run paypal:verify-prices
 *
 * PayPal needs no prices created on its side: each order carries its amount, taken from the price table in
 * services/paypalService.js (built from config/familyPlanPricing.js) when the order is created, and re-checked when
 * it is captured. So the only things that can be wrong are that table and an old price file left behind.
 * The table must hold, for USD, BRL and EUR and for 1 to 4 children, the annual price (for each tier and its
 * "_yearly" twin), and nothing else. The old config/paypalFamilyPlanPrices.json must not exist.
 *
 * Exit code: 0 = matches, 1 = something is out of date.
 */

const path = require('path');
const realFs = require('fs');

const { checkPayPalConfig, checkOldPriceFilesGone, printFindings } = require('./lib/familyPlanPriceChecks');

function verifyPayPalPrices({
  getPayPalTable = () => require('../services/paypalService').getPriceTable(),
  configDir = path.join(__dirname, '..', 'config'),
  fs = realFs,
  log = console.log,
} = {}) {
  let table;
  try {
    table = getPayPalTable();
  } catch (err) {
    log(`FAIL  PayPal\n        PROBLEM  the price table could not be built: ${err.message}`);
    return { exitCode: 1, problems: 1 };
  }
  // Only the PayPal file is this script's business (PagBank has its own verify command)
  const oldFile = checkOldPriceFilesGone({ dir: configDir, fs }).filter((f) => /paypal/i.test(f.where));
  const problems = printFindings('PayPal prices match the price list', [...checkPayPalConfig(table), ...oldFile], log);
  if (problems > 0) {
    log('\nFix: PayPal prices come from config/familyPlanPricing.js; correct them there (and delete any old PayPal price file), then run this again.');
  }
  return { exitCode: problems > 0 ? 1 : 0, problems };
}

if (require.main === module) {
  process.exit(verifyPayPalPrices().exitCode);
}

module.exports = { verifyPayPalPrices };
