import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NotificationsTable from './NotificationsTable';

const theme = createTheme();

const wrap = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const row = (overrides = {}) => ({
  _id: 'camp-1',
  internalName: 'Live reminder',
  type: 'live_lesson',
  audience: 'all',
  status: 'draft',
  localizations: [{ languageCode: 'en' }],
  ...overrides,
});

describe('NotificationsTable Phase 2 actions', () => {
  it('lets admins edit a scheduled campaign and cancel it', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onCancel = vi.fn();

    wrap(
      <NotificationsTable
        rows={[
          row({
            status: 'scheduled',
            sendLocalDate: '2026-08-20',
            sendLocalTime: '09:00',
            timezone: 'America/Sao_Paulo',
          }),
        ]}
        typeLabels={{ live_lesson: 'Live lesson' }}
        onEdit={onEdit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('2026-08-20 09:00 (America/Sao_Paulo)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('does not allow edit or cancel after a campaign is sent', () => {
    wrap(
      <NotificationsTable
        rows={[row({ status: 'sent', sendAt: '2026-08-20T12:00:00.000Z' })]}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
