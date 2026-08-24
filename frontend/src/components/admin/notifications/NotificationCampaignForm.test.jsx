import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NotificationCampaignForm from './NotificationCampaignForm';
import { buildEmptyForm } from '../../../hooks/useAdminNotifications';

const theme = createTheme();

const meta = {
  languages: [{ code: 'en', name: 'English' }],
  types: [{ value: 'story_time', label: 'Story Time' }],
  audiences: [{ value: 'all', label: 'All users' }],
  destinationKinds: [{ value: 'home', label: 'Home' }],
  timezones: ['UTC', 'America/Sao_Paulo'],
};

describe('NotificationCampaignForm Phase 2 actions', () => {
  it('shows schedule, send now, and send test controls', () => {
    const form = {
      ...buildEmptyForm(meta),
      internalName: 'Live reminder',
      sendDate: '2026-08-20',
      sendTime: '09:00',
      timezone: 'America/Sao_Paulo',
    };

    render(
      <ThemeProvider theme={theme}>
        <NotificationCampaignForm
          open
          mode="edit"
          form={form}
          meta={meta}
          saving={false}
          onChange={vi.fn()}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onSchedule={vi.fn()}
          onSendNow={vi.fn()}
          onSendTest={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByLabelText('Send date')).toHaveValue('2026-08-20');
    expect(screen.getByLabelText('Send time')).toHaveValue('09:00');
    expect(screen.getByLabelText('Timezone')).toHaveTextContent('America/Sao_Paulo');
    expect(screen.getByLabelText('Timing mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Quiet-hour behavior')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiration date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send now' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test' })).toBeInTheDocument();
  });
});
