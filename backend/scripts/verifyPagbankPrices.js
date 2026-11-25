/**
 * Checks the PagBank prices against the ONE price list. OFFLINE and read only: no PagBank call, no keys.
 *
 *   npm run pagbank:verify-prices
 *
 * PagBank (Brazil only) receives the amount with every checkout, so nothing is created on its side. The amount is built
 * by services/pagseguro.service.js from config/familyPlanPricing.js. This checks that, for 1 to 4 children, the checkout
 * it builds is exactly one line equal to the BRL annual price (no box), that 0 and 5 children are refused, that the
 * code does not allow more than 4 children or still mention the box, and that the old price file is gone.
 *
 * Exit code: 0 = matches, 1 = something is out of date.
 */

const path = require('path');
const realFs = require('fs');

const {
  checkPagbankPricing,
  checkOldPriceFilesGone,
  checkChildLimitInSource,
  checkNoBoxInSource,
  printFindings,
} = require('./lib/familyPlanPriceChecks');

const BACKEND = path.join(__dirname, '..');

function verifyPagbankPrices({
  getBuildCheckoutLineItems = () => require('../services/pagseguro.service').buildCheckoutLineItems,
  servicePath = path.join(BACKEND, 'services', 'pagseguro.service.js'),
  configDir = path.join(BACKEND, 'config'),
  fs = realFs,
  log = console.log,
} = {}) {
  let total = 0;

  let findings;
  try {
    findings = checkPagbankPricing({ buildCheckoutLineItems: getBuildCheckoutLineItems() });
  } catch (err) {
    findings = [{ level: 'problem', where: 'PagBank', text: `could not be checked: ${err.message}` }];
  }
  const oldFile = checkOldPriceFilesGone({ dir: configDir, fs }).filter((f) => /pagseguro/i.test(f.where));
  total += printFindings('PagBank prices match the price list', [...findings, ...oldFile], log);

  let source = null;
  try {
    source = fs.readFileSync(servicePath, 'utf8');
  } catch (err) {
    log(`note  could not read ${path.basename(servicePath)} (limit and box checks skipped): ${err.message}`);
  }
  if (source !== null) {
    const where = 'PagBank code (services/pagseguro.service.js)';
    total += printFindings(
      'PagBank code: at most 4 children, no activity box',
      [
        ...checkChildLimitInSource(source, where, ['MAX_CHILDREN']),
        ...checkNoBoxInSource(source, where, ['activity-box', 'getBoxAmountCents', 'boxAmountCentsPerChild']),
      ],
      log
    );
  }

  if (total > 0) log('\nFix: PagBank prices come from config/familyPlanPricing.js; bring services/pagseguro.service.js in line with it, then run this again.');
  return { exitCode: total > 0 ? 1 : 0, problems: total };
}

if (require.main === module) {
  process.exit(verifyPagbankPrices().exitCode);
}

module.exports = { verifyPagbankPrices };
