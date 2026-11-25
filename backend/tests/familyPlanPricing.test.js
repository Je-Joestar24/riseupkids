/**
 * The Family Plan price list. The SHEET below is typed in by hand from the client's pricing sheet and is deliberately
 * NOT imported from the config: if someone edits a price in the config, this test fails until the sheet is updated too.
 */
const service = require('../services/familyPlanPricing.service');
const pricing = require('../config/familyPlanPricing');

// ---- the client's sheet, in whole currency units ($120, R$699), exactly as printed
const SHEET = {
  USD: {
    annual: { 1: 120, 2: 190, 3: 250, 4: 310 },
    monthly: { 1: 12, 2: 19, 3: 25, 4: 31 },
    perChildPerMonth: { 1: 12.0, 2: 9.5, 3: 8.33, 4: 7.75 },
  },
  EUR: {
    annual: { 1: 120, 2: 190, 3: 250, 4: 310 },
    monthly: { 1: 12, 2: 19, 3: 25, 4: 31 },
    perChildPerMonth: { 1: 12.0, 2: 9.5, 3: 8.33, 4: 7.75 },
  },
  BRL: {
    annual: { 1: 699, 2: 1299, 3: 1799, 4: 2199 },
    monthly: { 1: 70, 2: 130, 3: 180, 4: 220 },
    perChildPerMonth: { 1: 70, 2: 65, 3: 60, 4: 55 },
  },
};

describe('the price list matches the client sheet, cell by cell', () => {
  for (const currency of Object.keys(SHEET)) {
    for (const kids of [1, 2, 3, 4]) {
      it(`${currency}, ${kids} child(ren): annual and monthly`, () => {
        expect(service.getAnnualCents(currency, kids)).toBe(SHEET[currency].annual[kids] * 100);
        expect(service.getMonthlyCents(currency, kids, { ignoreSwitch: true })).toBe(SHEET[currency].monthly[kids] * 100);
      });

      it(`${currency}, ${kids} child(ren): per child per month is the monthly price divided by the children`, () => {
        const monthly = service.getMonthlyCents(currency, kids, { ignoreSwitch: true }) / 100;
        expect(Math.round((monthly / kids) * 100) / 100).toBeCloseTo(SHEET[currency].perChildPerMonth[kids], 2);
      });
    }
  }

  it('USD and EUR carry the same numbers', () => {
    for (const kids of [1, 2, 3, 4]) {
      expect(service.getAnnualCents('USD', kids)).toBe(service.getAnnualCents('EUR', kids));
      expect(service.getMonthlyCents('USD', kids, { ignoreSwitch: true })).toBe(service.getMonthlyCents('EUR', kids, { ignoreSwitch: true }));
    }
  });

  it('has exactly 1 to 4 children and exactly three currencies, nothing more', () => {
    expect(pricing.MIN_CHILDREN).toBe(1);
    expect(pricing.MAX_CHILDREN).toBe(4);
    expect(Object.keys(pricing.ANNUAL_CENTS).sort()).toEqual(['BRL', 'EUR', 'USD']);
    expect(Object.keys(pricing.MONTHLY_CENTS).sort()).toEqual(['BRL', 'EUR', 'USD']);
    for (const currency of Object.keys(pricing.ANNUAL_CENTS)) {
      expect(Object.keys(pricing.ANNUAL_CENTS[currency])).toEqual(['1', '2', '3', '4']);
      expect(Object.keys(pricing.MONTHLY_CENTS[currency])).toEqual(['1', '2', '3', '4']);
    }
    expect(pricing.MONTHLY_PAYMENTS).toBe(12);
  });

  it('every price is a whole number of cents (no decimals anywhere)', () => {
    for (const table of [pricing.ANNUAL_CENTS, pricing.MONTHLY_CENTS]) {
      for (const currency of Object.keys(table)) {
        for (const cents of Object.values(table[currency])) {
          expect(Number.isInteger(cents)).toBe(true);
          expect(cents).toBeGreaterThan(0);
        }
      }
    }
  });

  it('more children never cost less in total, and always cost less per child', () => {
    for (const currency of ['USD', 'EUR', 'BRL']) {
      let previousTotal = 0;
      let previousPerChild = Infinity;
      for (const kids of [1, 2, 3, 4]) {
        const total = service.getAnnualCents(currency, kids);
        expect(total).toBeGreaterThan(previousTotal);
        expect(total / kids).toBeLessThan(previousPerChild);
        previousTotal = total;
        previousPerChild = total / kids;
      }
    }
  });

  it('the config cannot be changed while the app runs', () => {
    'use strict';
    expect(() => {
      pricing.ANNUAL_CENTS.USD[1] = 1;
    }).toThrow();
    expect(pricing.ANNUAL_CENTS.USD[1]).toBe(12000);
  });
});

describe('regions and currencies', () => {
  it('maps regions to currencies', () => {
    expect(service.resolveCurrency('br')).toBe('BRL');
    expect(service.resolveCurrency('us')).toBe('USD');
    expect(service.resolveCurrency('eu')).toBe('EUR');
  });

  it('accepts currency codes and ignores case and spaces', () => {
    expect(service.resolveCurrency('brl')).toBe('BRL');
    expect(service.resolveCurrency(' USD ')).toBe('USD');
    expect(service.resolveCurrency('Eu')).toBe('EUR');
  });

  it.each([['xx'], [''], [null], [undefined], [5], ['constructor'], ['__proto__'], ['GBP']])('refuses %p', (value) => {
    expect(() => service.resolveCurrency(value)).toThrow(expect.objectContaining({ code: 'INVALID_REGION_OR_CURRENCY' }));
  });

  it('gives the region back for a currency', () => {
    expect(service.regionForCurrency('BRL')).toBe('br');
    expect(service.regionForCurrency('usd')).toBe('us');
    expect(service.regionForCurrency('EUR')).toBe('eu');
  });

  it('region and currency give the same price', () => {
    expect(service.getAnnualCents('br', 2)).toBe(service.getAnnualCents('BRL', 2));
  });
});

describe('refusals are 400s with a short public code, never 500s', () => {
  const catchError = (fn) => {
    try { fn(); } catch (err) { return err; }
    return null;
  };

  it('a bad child count', () => {
    const err = catchError(() => service.normalizeChildCount(5));
    expect(err).toBeInstanceOf(service.FamilyPlanPricingError);
    expect(err).toMatchObject({ statusCode: 400, publicCode: 'INVALID_CHILD_COUNT', code: 'INVALID_CHILD_COUNT' });
    expect(err.message).toMatch(/1 to 4/);
  });

  it('a bad region or currency', () => {
    expect(catchError(() => service.resolveCurrency('xx'))).toMatchObject({ statusCode: 400, publicCode: 'INVALID_REGION_OR_CURRENCY' });
  });

  it('monthly before it opens', () => {
    expect(catchError(() => service.getMonthlyCents('BRL', 1))).toMatchObject({ statusCode: 400, publicCode: 'MONTHLY_NOT_AVAILABLE' });
  });

  it('the central error handler turns it into a 400 with the code (and no stack in production)', () => {
    const errorHandler = require('../middleware/errorHandler');
    const err = catchError(() => service.normalizeChildCount(99));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, { id: 'req-1', method: 'POST', originalUrl: '/api/checkout/create-session', log: { warn: jest.fn(), error: jest.fn() } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'INVALID_CHILD_COUNT', message: expect.stringMatching(/1 to 4/) }));
  });
});

describe('region as the apps send it', () => {
  it.each([['br', 'br'], ['US', 'us'], [' eu ', 'eu']])('accepts %p', (input, expected) => {
    expect(service.normalizeRegion(input)).toBe(expected);
  });

  it.each([['BRL'], ['usd'], [''], [null], [undefined], [5], ['constructor'], ['__proto__'], ['xx'], [['br']]])('refuses %p (a currency code is not a region)', (input) => {
    expect(() => service.normalizeRegion(input)).toThrow(expect.objectContaining({ code: 'INVALID_REGION_OR_CURRENCY', statusCode: 400 }));
  });
});

describe('child count', () => {
  it.each([[1, 1], [4, 4], ['2', 2], [' 3 ', 3]])('accepts %p', (input, expected) => {
    expect(service.normalizeChildCount(input)).toBe(expected);
  });

  it.each([[0], [5], [10], [-1], [2.5], [NaN], [Infinity], [null], [undefined], [''], ['3 kids'], ['1e1'], ['03x'], [true], [[2]], [{}], ['1000'], ['03'], ['0004'], ['00'], ['+3'], ['-1'], ['٣']])(
    'refuses %p, never rounds or clamps it into a plan',
    (input) => {
      expect(() => service.normalizeChildCount(input)).toThrow(expect.objectContaining({ code: 'INVALID_CHILD_COUNT' }));
    }
  );

  it('a price lookup for 5 children is refused, not sold as 4', () => {
    expect(() => service.getAnnualCents('BRL', 5)).toThrow(expect.objectContaining({ code: 'INVALID_CHILD_COUNT' }));
    expect(() => service.getAnnualCents('BRL', 0)).toThrow(expect.objectContaining({ code: 'INVALID_CHILD_COUNT' }));
  });

  it('lists 1 to 4', () => {
    expect(service.childCounts()).toEqual([1, 2, 3, 4]);
  });
});

describe('monthly is closed', () => {
  it('is switched off', () => {
    expect(pricing.MONTHLY_ENABLED).toBe(false);
    expect(service.isMonthlyEnabled()).toBe(false);
  });

  it('refuses a monthly price while it is off', () => {
    expect(() => service.getMonthlyCents('BRL', 1)).toThrow(expect.objectContaining({ code: 'MONTHLY_NOT_AVAILABLE' }));
  });

  it('does not show monthly in the public pricing while it is off', () => {
    const view = service.getPublicPricing();
    expect(JSON.stringify(view)).not.toMatch(/monthly/i);
    expect(view.monthlyPayments).toBeUndefined();
  });

  it('shows monthly in the public pricing, and allows it, once switched on', () => {
    jest.isolateModules(() => {
      jest.doMock('../config/familyPlanPricing', () => ({ ...jest.requireActual('../config/familyPlanPricing'), MONTHLY_ENABLED: true }));
      const open = require('../services/familyPlanPricing.service');

      expect(open.getMonthlyCents('BRL', 1)).toBe(7000);
      const view = open.getPublicPricing();
      expect(view.monthlyPayments).toBe(12);
      expect(view.regions.br.plans[0].monthlyCents).toBe(7000);
    });
    jest.dontMock('../config/familyPlanPricing');
  });
});

describe('money formatting', () => {
  it.each([[69900, '699.00'], [12000, '120.00'], [1, '0.01'], [0, '0.00'], [129900, '1299.00'], [7005, '70.05']])('%p cents is %p', (cents, text) => {
    expect(service.centsToMajorString(cents)).toBe(text);
  });

  it.each([[1.5], [-1], ['100'], [NaN], [null]])('refuses %p', (value) => {
    expect(() => service.centsToMajorString(value)).toThrow(TypeError);
  });
});

describe('the cell list and the public view', () => {
  it('lists 12 annual cells (3 regions x 4), plus 12 monthly when asked', () => {
    expect(service.listPriceCells()).toHaveLength(12);
    expect(service.listPriceCells({ includeMonthly: true })).toHaveLength(24);
    expect(service.listPriceCells().every((cell) => cell.interval === 'annual')).toBe(true);
  });

  it('every cell carries the right region, currency and amount', () => {
    for (const cell of service.listPriceCells({ includeMonthly: true })) {
      expect(service.resolveCurrency(cell.region)).toBe(cell.currency);
      const expected = cell.interval === 'annual'
        ? service.getAnnualCents(cell.currency, cell.kids)
        : service.getMonthlyCents(cell.currency, cell.kids, { ignoreSwitch: true });
      expect(cell.cents).toBe(expected);
    }
  });

  it('the public view has 4 plans per region with the annual price and the limits, and no box', () => {
    const view = service.getPublicPricing();
    expect(view.minChildren).toBe(1);
    expect(view.maxChildren).toBe(4);
    expect(Object.keys(view.regions)).toEqual(['br', 'us', 'eu']);
    expect(view.regions.br.currency).toBe('BRL');
    expect(view.regions.br.plans).toEqual([
      { children: 1, annualCents: 69900 },
      { children: 2, annualCents: 129900 },
      { children: 3, annualCents: 179900 },
      { children: 4, annualCents: 219900 },
    ]);
    expect(view.regions.us.plans.map((p) => p.annualCents)).toEqual([12000, 19000, 25000, 31000]);
    expect(JSON.stringify(view)).not.toMatch(/box/i);
  });
});
