/**
 * The backend answer for GET /api/checkout/pricing, typed from the client's sheet (annual prices, whole cents).
 * This is a TEST fixture: the app itself holds no prices.
 */
export const BACKEND_PRICING = {
  minChildren: 1,
  maxChildren: 4,
  regions: {
    br: {
      currency: 'BRL',
      plans: [
        { children: 1, annualCents: 69900 },
        { children: 2, annualCents: 129900 },
        { children: 3, annualCents: 179900 },
        { children: 4, annualCents: 219900 },
      ],
    },
    us: {
      currency: 'USD',
      plans: [
        { children: 1, annualCents: 12000 },
        { children: 2, annualCents: 19000 },
        { children: 3, annualCents: 25000 },
        { children: 4, annualCents: 31000 },
      ],
    },
    eu: {
      currency: 'EUR',
      plans: [
        { children: 1, annualCents: 12000 },
        { children: 2, annualCents: 19000 },
        { children: 3, annualCents: 25000 },
        { children: 4, annualCents: 31000 },
      ],
    },
  },
};
