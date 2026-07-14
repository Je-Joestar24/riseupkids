import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteAccountModal from './DeleteAccountModal';

vi.mock('../../../services/authService', () => ({
  default: {
    deleteAccount: vi.fn(),
  },
}));

import authService from '../../../services/authService';

describe('DeleteAccountModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation fields when open', () => {
    render(
      <DeleteAccountModal open onClose={onClose} onSuccess={onSuccess} />
    );

    expect(screen.getByRole('heading', { name: 'Delete my account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Type DELETE to confirm account deletion')).toBeInTheDocument();
  });

  it('shows validation error when confirm text is wrong', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountModal open onClose={onClose} onSuccess={onSuccess} />
    );

    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Type DELETE to confirm account deletion'), 'REMOVE');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByText('Please type DELETE to confirm.')).toBeInTheDocument();
    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  it('submits deletion and calls onSuccess when valid', async () => {
    const user = userEvent.setup();
    authService.deleteAccount.mockResolvedValue({
      success: true,
      message: 'Account deletion requested.',
    });

    render(
      <DeleteAccountModal open onClose={onClose} onSuccess={onSuccess} />
    );

    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Type DELETE to confirm account deletion'), 'delete');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    await waitFor(() => {
      expect(authService.deleteAccount).toHaveBeenCalledWith({
        password: 'secret123',
        confirmText: 'delete',
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows API error message on failure', async () => {
    const user = userEvent.setup();
    authService.deleteAccount.mockRejectedValue({ message: 'Password is incorrect' });

    render(
      <DeleteAccountModal open onClose={onClose} onSuccess={onSuccess} />
    );

    await user.type(screen.getByLabelText('Password'), 'bad');
    await user.type(screen.getByLabelText('Type DELETE to confirm account deletion'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByText('Password is incorrect')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
