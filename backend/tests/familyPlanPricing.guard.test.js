/**
 * THE GUARD. Runs the offline consistency check on the REAL files of this repository and requires zero problems:
 * every provider (Stripe, PayPal, PagBank) and the backend code must agree with the ONE price list
 * (config/familyPlanPricing.js). If someone types a price somewhere else, raises the child limit, or brings the
 * activity box back, this test fails and says exactly where.
 *
 * The screens (the web app and the sale site) are included too: they hold no price table, no box and no child
 * limit of their own (their prices come from GET /api/checkout/pricing), and the sale site's checkout texts have no
 * price typed into them.
 */
const { runPricingCheck } = require('../scripts/checkFamilyPlanPricing');

const INCLUDE_SCREENS = true;

describe('every provider agrees with the one price list (the real files)', () => {
  it('has no problems', () => {
    const lines = [];
    const result = runPricingCheck({ includeScreens: INCLUDE_SCREENS, log: (line) => lines.push(line) });

    // On failure, show the PROBLEM lines instead of a bare number
    const problems = lines.filter((line) => /PROBLEM/.test(line));
    expect(problems).toEqual([]);
    expect(result).toMatchObject({ exitCode: 0, problems: 0 });
  });

  it('really looks at the PayPal table, the PagBank builder and the old files (it is not an empty check)', () => {
    const lines = [];
    runPricingCheck({ includeScreens: INCLUDE_SCREENS, log: (line) => lines.push(line) });
    const output = lines.join('\n');
    expect(output).toMatch(/PASS\s+PayPal prices/);
    expect(output).toMatch(/PASS\s+PagBank prices/);
    expect(output).toMatch(/PASS\s+Old per-provider price files are gone/);
    expect(output).toMatch(/PASS\s+Backend code: 4 children at most, no activity box/);
    expect(output).toMatch(/PASS\s+Web app \(frontend\)/);
    expect(output).toMatch(/PASS\s+Sale site \(riseupkids-sale\): no price table/);
    expect(output).toMatch(/PASS\s+Sale site checkout texts: no price typed in/);
  });

  it('the real PayPal service and PagBank service are the ones being checked', () => {
    // If these exports disappear the guard would silently check nothing
    expect(typeof require('../services/paypalService').getPriceTable).toBe('function');
    expect(typeof require('../services/pagseguro.service').buildCheckoutLineItems).toBe('function');
  });
});
