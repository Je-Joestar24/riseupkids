import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import useNotificationDashboard from '../../../hooks/useNotificationDashboard';
import { formatOpenRate } from '../../../utils/notificationDashboardCharts';
import NotificationBarChart from './NotificationBarChart';
import NotificationTrendChart from './NotificationTrendChart';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const NotificationsAnalyticsPanel = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data, meta, loading, error, filters, setFilters } = useNotificationDashboard();
  const delivery = data?.delivery || {};

  const stats = [
    { label: 'Targeted', value: delivery.targeted ?? 0 },
    { label: 'Sent', value: delivery.sent ?? 0 },
    { label: 'Opened', value: delivery.opened ?? 0 },
    { label: 'Failed', value: delivery.failed ?? 0 },
    { label: 'Open rate', value: formatOpenRate(data?.openRate) },
  ];

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: '16px',
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[2],
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 2.5 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, color: theme.palette.text.primary }}
          >
            Notification analytics
          </Typography>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, fontSize: '0.9rem' }}>
            Production deliveries only. Opens count when a family reads the in-app history.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          {RANGES.map((range) => (
            <Button
              key={range.value}
              size="small"
              variant={filters.range === range.value ? 'contained' : 'outlined'}
              aria-pressed={filters.range === range.value}
              aria-label={`Show last ${range.label}`}
              onClick={() => setFilters((current) => ({ ...current, range: range.value }))}
              sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif', borderRadius: '10px' }}
            >
              {range.label}
            </Button>
          ))}
          <Button
            size="small"
            onClick={() => navigate('/admin/notifications')}
            sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}
          >
            Open campaigns
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="notification-dashboard-type">Type</InputLabel>
          <Select
            labelId="notification-dashboard-type"
            label="Type"
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <MenuItem value="">All types</MenuItem>
            {(meta?.types || []).map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="notification-dashboard-status">Status</InputLabel>
          <Select
            labelId="notification-dashboard-status"
            label="Status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <MenuItem value="">All statuses</MenuItem>
            {(meta?.statuses || []).map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="notification-dashboard-audience">Audience</InputLabel>
          <Select
            labelId="notification-dashboard-audience"
            label="Audience"
            value={filters.audience}
            onChange={(event) => setFilters((current) => ({ ...current, audience: event.target.value }))}
          >
            <MenuItem value="">All audiences</MenuItem>
            {(meta?.audiences || []).map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading notification analytics" />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {stats.map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  p: 1.5,
                  borderRadius: '12px',
                  border: `1px solid ${theme.palette.border.main}`,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                  {stat.label}
                </Typography>
                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '1.25rem' }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 1.5 }}>
                Delivery results
              </Typography>
              <NotificationBarChart mix={data?.mix || []} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 1.5 }}>
                Sent vs opened
              </Typography>
              <NotificationTrendChart trend={data?.trend || []} />
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default NotificationsAnalyticsPanel;
