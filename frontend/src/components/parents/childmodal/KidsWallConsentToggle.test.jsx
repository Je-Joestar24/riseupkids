import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KidsWallConsentToggle from './KidsWallConsentToggle';

describe('KidsWallConsentToggle', () => {
  const child = {
    _id: 'child1',
    displayName: 'Alex',
    kidsWallEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onUpdateConsent(true) when toggling on', async () => {
    const onUpdateConsent = vi.fn().mockResolvedValue(undefined);

    render(
      <KidsWallConsentToggle
        child={child}
        consentLoading={false}
        onUpdateConsent={onUpdateConsent}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onUpdateConsent).toHaveBeenCalledWith(true);
  });

  it('calls onUpdateConsent(false) when toggling off', async () => {
    const onUpdateConsent = vi.fn().mockResolvedValue(undefined);

    render(
      <KidsWallConsentToggle
        child={{ ...child, kidsWallEnabled: true }}
        consentLoading={false}
        onUpdateConsent={onUpdateConsent}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onUpdateConsent).toHaveBeenCalledWith(false);
  });

  it('treats missing kidsWallEnabled as allowed', () => {
    render(
      <KidsWallConsentToggle
        child={{ ...child, kidsWallEnabled: undefined }}
        consentLoading={false}
        onUpdateConsent={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
