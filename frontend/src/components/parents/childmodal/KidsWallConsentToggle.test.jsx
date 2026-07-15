import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KidsWallConsentToggle from './KidsWallConsentToggle';

vi.mock('./KidsWallConsentModal', () => ({
  default: ({ open, onConfirm, onCancel }) =>
    open ? (
      <div data-testid="consent-modal">
        <button type="button" onClick={onConfirm}>
          confirm-enable
        </button>
        <button type="button" onClick={onCancel}>
          cancel-enable
        </button>
      </div>
    ) : null,
}));

describe('KidsWallConsentToggle', () => {
  const child = {
    _id: 'child1',
    displayName: 'Alex',
    kidsWallEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens consent modal when toggling on', () => {
    render(
      <KidsWallConsentToggle
        child={child}
        consentLoading={false}
        onUpdateConsent={vi.fn()}
      />
    );

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(screen.getByTestId('consent-modal')).toBeInTheDocument();
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
});
