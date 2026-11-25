/**
 * Offline consistency check: does every place that knows about a Family Plan price agree with the ONE price list
 * (config/familyPlanPricing.js)? No network, no keys, no database: safe to run anywhere, any time.
 *
 *   npm run pricing:check
 *
 * Checks
 *   - the price list itself (12 annual prices: 3 currencies x 1 to 4 children)
 *   - Stripe: the price-id files in config/ have an id for every plan cell
 *   - PayPal: the price table the PayPal service orders from holds the annual prices
 *   - PagBank: the checkout it builds charges the BRL annual price, one line, 1 to 4 children only
 *   - the old per-provider price files are gone
 *   - code: the child limit is 4 in the checkout code, and the activity box add-on is gone
 *   - screens: the web app and the sale site hold no price table, no box and no child limit of their own (their prices
 *     come from GET /api/checkout/pricing), and the sale site's checkout texts have no price typed into them
 *     (a screen whose files are not on this machine is skipped, with a note)
 *
 * PROBLEM lines are the to-do list: each one is a place that still needs to be brought in line.
 * Exit code: 0 = everything agrees, 1 = at least one problem.
 */

const path = require('path');
const realFs = require('fs');

const pricing = require('../services/familyPlanPricing.service');
const {
  checkPayPalConfig,
  checkPagbankPricing,
  checkOldPriceFilesGone,
  checkSiteTables,
  checkChildLimitInSource,
  checkNoBoxInSource,
  checkNoPriceTablesInSource,
  checkNoPricesInTranslations,
  checkStripeFiles,
  printFindings,
} = require('./lib/familyPlanPriceChecks');

const BACKEND = path.join(__dirname, '..');
const REPO = path.join(BACKEND, '..');

/**
 * @param {object} [options]
 * @param {boolean} [options.includeScreens=true] false checks the backend only (the guard test uses this until the screens are done)
 * @param {Function} [options.getPayPalTable] returns the PayPal price table (default: the real service)
 * @param {Function} [options.getBuildCheckoutLineItems] returns the PagBank line-item builder (default: the real service)
 */
function runPricingCheck({
  backendDir = BACKEND,
  repoDir = REPO,
  fs = realFs,
  log = console.log,
  includeScreens = true,
  getPayPalTable = () => require('../services/paypalService').getPriceTable(),
  getBuildCheckoutLineItems = () => require('../services/pagseguro.service').buildCheckoutLineItems,
} = {}) {
  let total = 0;
  const section = (title, findings) => {
    total += printFindings(title, findings, log);
  };
  const tryRead = (file) => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch (err) {
      return null;
    }
  };
  const skipped = (what) => ({ level: 'note', where: what, text: 'file not found on this machine: skipped' });
  const failed = (where, err) => [{ level: 'problem', where, text: `could not be checked: ${err.message}` }];

  const cells = pricing.listPriceCells();
  section('Price list: 12 annual prices, 1 to 4 children', cells.length === 12 && pricing.MAX_CHILDREN === 4
    ? []
    : [{ level: 'problem', where: 'config/familyPlanPricing.js', text: `expected 12 annual prices and a limit of 4, found ${cells.length} and ${pricing.MAX_CHILDREN}` }]);

  section('Stripe price-id files', checkStripeFiles({ dir: path.join(backendDir, 'config'), fs }));

  let paypal;
  try {
    paypal = checkPayPalConfig(getPayPalTable());
  } catch (err) {
    paypal = failed('PayPal', err);
  }
  section('PayPal prices', paypal);

  let pagbank;
  try {
    pagbank = checkPagbankPricing({ buildCheckoutLineItems: getBuildCheckoutLineItems() });
  } catch (err) {
    pagbank = failed('PagBank', err);
  }
  section('PagBank prices', pagbank);

  section('Old per-provider price files are gone', checkOldPriceFilesGone({ dir: path.join(backendDir, 'config'), fs }));

  const checkoutService = tryRead(path.join(backendDir, 'services', 'checkout.services.js'));
  const pagbankService = tryRead(path.join(backendDir, 'services', 'pagseguro.service.js'));
  section('Backend code: 4 children at most, no activity box', [
    ...(checkoutService === null ? [skipped('services/checkout.services.js')] : [
      ...checkChildLimitInSource(checkoutService, 'services/checkout.services.js', ['MAX_CHILDREN']),
      ...checkNoBoxInSource(checkoutService, 'services/checkout.services.js', ['addBox', 'Activity Box', 'BOX_PRICE_PER_CHILD']),
    ]),
    ...(pagbankService === null ? [skipped('services/pagseguro.service.js')] : [
      ...checkChildLimitInSource(pagbankService, 'services/pagseguro.service.js', ['MAX_CHILDREN']),
      ...checkNoBoxInSource(pagbankService, 'services/pagseguro.service.js', ['activity-box', 'getBoxAmountCents', 'boxAmountCentsPerChild']),
    ]),
  ]);

  if (includeScreens) {
    const screens = [
      ['Web app (frontend)', path.join(repoDir, 'frontend', 'src', 'services', 'checkoutService.js'), ['MAX_CHILDREN']],
      ['Sale site (riseupkids-sale)', path.join(repoDir, 'riseupkids-sale', 'web', 'src', 'services', 'checkoutService.js'), ['MAX_CHILDREN_UI', 'MAX_CHILDREN']],
    ];
    for (const [name, file, limitNames] of screens) {
      const source = tryRead(file);
      section(`${name}: no price table, no box, no child limit of its own`, source === null
        ? [skipped(name)]
        : [
            ...checkSiteTables(source, name),
            ...checkNoPriceTablesInSource(source, name, ['PLAN_PRICES_', 'BOX_PRICE_PER_CHILD']),
            ...checkNoBoxInSource(source, name, ['getBoxTotal', 'getBoxPrice', 'addBox']),
            ...checkChildLimitInSource(source, name, limitNames),
          ]);
    }

    // The sale site's checkout texts: no price typed into any language
    const texts = {};
    let missing = false;
    for (const lang of ['pt', 'en', 'es']) {
      const raw = tryRead(path.join(repoDir, 'riseupkids-sale', 'web', 'src', 'i18n', `${lang}.json`));
      if (raw === null) {
        missing = true;
        break;
      }
      try {
        texts[lang] = JSON.parse(raw);
      } catch (err) {
        section('Sale site checkout texts: no price typed in', failed(`riseupkids-sale i18n ${lang}.json`, err));
        missing = null;
        break;
      }
    }
    if (missing === true) section('Sale site checkout texts: no price typed in', [skipped('riseupkids-sale i18n files')]);
    else if (missing === false) section('Sale site checkout texts: no price typed in', checkNoPricesInTranslations(texts));
  }

  log(`\n${total === 0 ? 'All places agree with the price list.' : `${total} problem(s): each PROBLEM line above is a place that still differs from the price list.`}`);
  return { exitCode: total > 0 ? 1 : 0, problems: total };
}

if (require.main === module) {
  process.exit(runPricingCheck().exitCode);
}

module.exports = { runPricingCheck };
