import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import NotificationsAnalyticsPanel from './NotificationsAnalyticsPanel';

const theme = createTheme({
  palette: {
    orange: { main: '#e98a68', dark: '#d97854' },
    border: { main: '#e2e8f0' },
    success: { main: '#10b981' },
    error: { main: '#ef4444' },
    secondary: { main: '#62caca' },
    text: { primary: '#0f172a', secondary: '#475569' },
  },
});

const setFilters = vi.fn();

vi.mock('../../../hooks/useNotificationDashboard', () => ({
  default: () => ({
    data: {
      openRate: 0.5,
      delivery: { targeted: 4, sent: 3, failed: 1, skipped: 0, expired: 0, opened: 2 },
      mix: [
        { key: 'sent', label: 'Sent', value: 3 },
        { key: 'failed', label: 'Failed', value: 1 },
        { key: 'skipped', label: 'Skipped', value: 0 },
        { key: 'expired', label: 'Expired', value: 0 },
      ],
      trend: [
        { date: '2026-08-20', sent: 1, opened: 0, failed: 0 },
        { date: '2026-08-21', sent: 2, opened: 2, failed: 1 },
      ],
      byType: [{ type: 'story_time', targeted: 4, sent: 3, opened: 2, failed: 1 }],
    },
    meta: {
      types: [{ value: 'story_time', label: 'Story Time' }],
      statuses: ['sent', 'failed'],
      audiences: [{ value: 'parents', label: 'Parents' }],
    },
    loading: false,
    error: null,
    filters: { range: '30d', type: '', status: '', audience: '' },
    setFilters,
  }),
}));

const wrap = (ui) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </MemoryRouter>
  );

describe('NotificationsAnalyticsPanel', () => {
  beforeEach(() => {
    setFilters.mockClear();
  });

  it('shows receipt-backed totals with a standing bar chart and a line graph', async () => {
    const user = userEvent.setup();
    wrap(<NotificationsAnalyticsPanel />);

    expect(screen.getByText('Notification analytics')).toBeInTheDocument();
    expect(screen.getByText('Delivery results')).toBeInTheDocument();
    expect(screen.getByText('Sent vs opened')).toBeInTheDocument();
    expect(screen.getByLabelText('Delivery results: Sent 3, Failed 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Sent 3 and opened 2 over the selected days')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show last 7 days' }));
    expect(setFilters).toHaveBeenCalledTimes(1);
  });
});
