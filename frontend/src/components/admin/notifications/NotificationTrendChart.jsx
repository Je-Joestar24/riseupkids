import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  buildPolyline,
  chartColorsFromTheme,
  trendAriaLabel,
} from '../../../utils/notificationDashboardCharts';

const WIDTH = 560;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 8 };

const SERIES = [
  { key: 'sent', label: 'Sent' },
  { key: 'opened', label: 'Opened' },
];

const NotificationTrendChart = ({ trend = [] }) => {
  const theme = useTheme();
  const colors = chartColorsFromTheme(theme);
  const paths = useMemo(
    () =>
      SERIES.map((series) => ({
        ...series,
        points: buildPolyline(
          trend.map((row) => row[series.key] || 0),
          WIDTH,
          HEIGHT,
          PADDING
        ),
      })),
    [trend]
  );
  const first = trend[0]?.date || '';
  const last = trend[trend.length - 1]?.date || '';

  return (
    <Box>
      <Box
        component="svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={trendAriaLabel(trend)}
        sx={{ width: '100%', height: 220, display: 'block' }}
      >
        <line
          x1={PADDING.left}
          y1={HEIGHT - PADDING.bottom}
          x2={WIDTH - PADDING.right}
          y2={HEIGHT - PADDING.bottom}
          stroke={theme.palette.border.main}
          strokeWidth="1"
        />
        {paths.map((series) => (
          <polyline
            key={series.key}
            fill="none"
            points={series.points}
            stroke={colors[series.key]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.75rem', color: theme.palette.text.secondary }}>
          {first}
        </Typography>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.75rem', color: theme.palette.text.secondary }}>
          {last}
        </Typography>
      </Box>
      <Box component="ul" sx={{ display: 'flex', gap: 2, listStyle: 'none', m: 0, mt: 1, p: 0 }}>
        {SERIES.map((series) => (
          <Box
            component="li"
            key={series.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '0.85rem',
              color: theme.palette.text.secondary,
            }}
          >
            <Box aria-hidden sx={{ width: 14, height: 3, borderRadius: 1, backgroundColor: colors[series.key] }} />
            {series.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default NotificationTrendChart;
