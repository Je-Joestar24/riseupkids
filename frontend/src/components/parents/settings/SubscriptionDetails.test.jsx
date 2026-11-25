/**
 * The Plan Details card: the Family Plan price row shows the backend price, "Loading…" while it loads, and is left
 * out (never a guess) when there is no price.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubscriptionDetails from './SubscriptionDetails';

const basePlan = {
  isFamilyPlan: true,
  childrenLabel: '2 Children',
  userRegion: 'br',
  accessEndDate: new Date('2027-01-10T00:00:00.000Z'),
  cancellationStatus: 'Annual program — contact support to cancel or renew',
  priceLine2: null,
  pricingStatus: 'ready',
  planPricing: null,
};

const withPrice = {
  ...basePlan,
  planPricing: { line1: 'R$1299', line2: null, amount: 1299, discountFormatted: 'Economize 7% (R$99)' },
  priceLine2: 'or flexible payment options available at checkout',
};

describe('Family Plan price row', () => {
  it('shows the price, the payment note and the saving', () => {
    render(<SubscriptionDetails plan={withPrice} />);

    expect(screen.getByText('Plan price')).toBeInTheDocument();
    expect(screen.getByText('R$1299')).toBeInTheDocument();
    expect(screen.getByText('or flexible payment options available at checkout')).toBeInTheDocument();
    expect(screen.getByText('Founding families savings')).toBeInTheDocument();
    expect(screen.getByText('Economize 7% (R$99)')).toBeInTheDocument();
  });

  it.each([['loading'], ['idle']])('says "Loading…" while the prices are %s, with no price and no saving', (pricingStatus) => {
    render(<SubscriptionDetails plan={{ ...basePlan, pricingStatus }} />);

    expect(screen.getByText('Plan price')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText(/R\$|\$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText('Founding families savings')).not.toBeInTheDocument();
  });

  it('is left out when the prices could not be loaded, and the rest of the card still shows', () => {
    render(<SubscriptionDetails plan={{ ...basePlan, pricingStatus: 'error' }} />);

    expect(screen.queryByText('Plan price')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByText('Children enrolled')).toBeInTheDocument();
    expect(screen.getByText('2 Children')).toBeInTheDocument();
    expect(screen.getByText('Access until')).toBeInTheDocument();
  });

  it('is left out for a size that is not sold any more (ready, but no price for it)', () => {
    render(<SubscriptionDetails plan={{ ...basePlan, childrenLabel: '7 Children', pricingStatus: 'ready' }} />);
    expect(screen.queryByText('Plan price')).not.toBeInTheDocument();
    expect(screen.getByText('7 Children')).toBeInTheDocument();
  });

  it('shows the region', () => {
    render(<SubscriptionDetails plan={withPrice} />);
    expect(screen.getByText('Brazil')).toBeInTheDocument();
  });
});

describe('a legacy subscription', () => {
  it('keeps its monthly cost row', () => {
    render(
      <SubscriptionDetails
        plan={{
          isFamilyPlan: false,
          planPricing: { line1: '$9.99/mo', line2: 'Legacy monthly subscription', amount: 9.99 },
          priceLine2: 'Legacy monthly subscription',
          accessEndDate: null,
          cancellationStatus: 'N/A',
        }}
      />
    );

    expect(screen.getByText('Monthly cost')).toBeInTheDocument();
    expect(screen.getByText('$9.99/mo')).toBeInTheDocument();
    expect(screen.queryByText('Plan price')).not.toBeInTheDocument();
  });
});
