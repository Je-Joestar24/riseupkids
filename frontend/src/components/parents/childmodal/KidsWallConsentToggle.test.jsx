import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KidsWallConsentToggle from './KidsWallConsentToggle';

describe('KidsWallConsentToggle (RUK-SEC-006 — opt-in, no consent by default)', () => {
  const child = {
    _id: 'child1',
    displayName: 'Alex',
    kidsWallEnabled: false,
    kidsWallConsentAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is off by default and does not call onUpdateConsent(true) until the consent dialog is confirmed', async () => {
    const onUpdateConsent = vi.fn().mockResolvedValue(undefined);

    render(
      <KidsWallConsentToggle child={child} consentLoading={false} onUpdateConsent={onUpdateConsent} />
    );

    expect(screen.getByRole('checkbox', { name: /kids wall/i })).not.toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: /kids wall/i }));

    // Opens the consent dialog instead of calling straight through.
    expect(onUpdateConsent).not.toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: /Allow Kids Wall/i })).toBeInTheDocument();

    // Confirm is disabled until the acknowledgment checkbox is checked.
    const confirmButton = screen.getByRole('button', { name: /allow kids wall/i });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /consent to my child using this feature/i }));
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(onUpdateConsent).toHaveBeenCalledWith(true));
  });

  it('turning off needs no confirmation dialog', () => {
    const onUpdateConsent = vi.fn().mockResolvedValue(undefined);

    render(
      <KidsWallConsentToggle
        child={{ ...child, kidsWallEnabled: true, kidsWallConsentAt: new Date().toISOString() }}
        consentLoading={false}
        onUpdateConsent={onUpdateConsent}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /kids wall/i }));

    expect(onUpdateConsent).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/Allow Kids Wall/i)).not.toBeInTheDocument();
  });

  it('treats a missing consent timestamp as not consented even if kidsWallEnabled is true', () => {
    render(
      <KidsWallConsentToggle
        child={{ ...child, kidsWallEnabled: true, kidsWallConsentAt: null }}
        consentLoading={false}
        onUpdateConsent={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: /kids wall/i })).not.toBeChecked();
  });

  it('treats missing kidsWallEnabled as not consented (opt-in default)', () => {
    render(
      <KidsWallConsentToggle
        child={{ ...child, kidsWallEnabled: undefined }}
        consentLoading={false}
        onUpdateConsent={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: /kids wall/i })).not.toBeChecked();
  });

  it('cancelling the dialog leaves the toggle off', async () => {
    const onUpdateConsent = vi.fn();

    render(
      <KidsWallConsentToggle child={child} consentLoading={false} onUpdateConsent={onUpdateConsent} />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /kids wall/i }));
    expect(await screen.findByRole('heading', { name: /Allow Kids Wall/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByText(/I understand how Kids Wall works/i)).not.toBeInTheDocument());
    expect(onUpdateConsent).not.toHaveBeenCalled();
  });
});
