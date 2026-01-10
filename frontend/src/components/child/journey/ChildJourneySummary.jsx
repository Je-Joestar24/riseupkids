import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { themeColors } from '../../../config/themeColors';

/**
 * ChildJourneySummary Component
 * 
 * Progress summary card showing completed, current, and locked course counts
 */
const ChildJourneySummary = ({ 
  completed = 2, 
  current = 1, 
  locked = 33 
}) => {
  const theme = useTheme();

  const summaryItems = [
    {
      label: 'Completed',
      count: completed,
      iconBgColor: themeColors.secondary, // #62caca / rgb(98, 202, 202)
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-circle-check"
          style={{ color: themeColors.textInverse }}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      ),
    },
    {
      label: 'Current',
      count: current,
      iconBgColor: themeColors.accent, // #f2af10 / rgb(242, 175, 16)
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-star"
          style={{ color: themeColors.textInverse }}
          aria-hidden="true"
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
        </svg>
      ),
    },
    {
      label: 'Locked',
      count: locked,
      iconBgColor: themeColors.primary, // #85c2b9 / rgb(133, 194, 185)
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-lock"
          style={{ color: themeColors.textInverse }}
          aria-hidden="true"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      ),
    },
  ];

  return (
    <Box
      sx={{
        maxWidth: '100%',
        padding: '24px',
        margin: '0 auto',
        backgroundColor: 'rgb(212, 230, 227)',
        borderRadius: '24px', // rounded-3xl
        boxShadow: theme.shadows[8], // shadow-xl
        marginTop: '48px', // mt-12 equivalent
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.textInverse, // White
          textAlign: 'center',
          marginBottom: '5px',
          fontFamily: theme.typography.fontFamily,
        }}
      >
        Progress Summary
      </Typography>

      {/* Summary Items Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          textAlign: 'center',
          width: '400px'
        }}
      >
        {summaryItems.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Icon Container */}
            <Box
              sx={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: item.iconBgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px', // mx-auto mb-2
              }}
            >
              {item.icon}
            </Box>

            {/* Count */}
            <Typography
              sx={{
                fontSize: '24px',
                fontWeight: 600,
                color: themeColors.textInverse, // White
                fontFamily: theme.typography.fontFamily,
                marginBottom: '4px',
              }}
            >
              {item.count}
            </Typography>

            {/* Label */}
            <Typography
              sx={{
                fontSize: '14px', // text-sm
                color: themeColors.textInverse, // White
                fontFamily: theme.typography.fontFamily,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ChildJourneySummary;
