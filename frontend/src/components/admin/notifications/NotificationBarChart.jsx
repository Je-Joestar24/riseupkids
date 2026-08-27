import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  buildVerticalBars,
  chartColorsFromTheme,
  describeDeliveryMix,
} from '../../../utils/notificationDashboardCharts';

const WIDTH = 360;
const HEIGHT = 220;
const PADDING = { top: 24, right: 8, bottom: 36, left: 8 };

const NotificationBarChart = ({ mix = [] }) => {
  const theme = useTheme();
  const colors = chartColorsFromTheme(theme);
  const bars = buildVerticalBars(mix, WIDTH, HEIGHT, PADDING);
  const summary = describeDeliveryMix(mix);

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Delivery results: ${summary}`}
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
      {bars.map((bar) => (
        <g key={bar.key}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx="6"
            fill={colors[bar.key] || theme.palette.primary.main}
          />
          <text
            x={bar.x + bar.width / 2}
            y={HEIGHT - 12}
            textAnchor="middle"
            fill={theme.palette.text.secondary}
            fontFamily="Quicksand, sans-serif"
            fontSize="12"
          >
            {bar.label}
          </text>
          <text
            x={bar.x + bar.width / 2}
            y={Math.max(14, bar.y - 6)}
            textAnchor="middle"
            fill={theme.palette.text.primary}
            fontFamily="Quicksand, sans-serif"
            fontSize="12"
            fontWeight="700"
          >
            {bar.value}
          </text>
        </g>
      ))}
    </Box>
  );
};

export default NotificationBarChart;
