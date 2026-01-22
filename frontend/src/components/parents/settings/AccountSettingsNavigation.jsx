import React from 'react';
import { Box, Button } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

/**
 * AccountSettingsNavigation Component
 * 
 * Tab navigation for Account Settings modal
 * Profile, Language, Subscription tabs
 */
const AccountSettingsNavigation = ({ activeTab, onTabChange }) => {
  const tabs = ['Profile', 'Language', 'Subscription'];

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgCard,
        borderRadius: { xs: '16px', sm: '20px' },
        padding: { xs: '8px', sm: '12px' },
        display: 'flex',
        gap: { xs: '8px', sm: '12px' },
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      {tabs.map((tab) => (
        <Button
          key={tab}
          onClick={() => onTabChange(tab)}
          sx={{
            flex: 1,
            paddingY: { xs: '12px', sm: '12px' },
            paddingX: { xs: '16px', sm: '16px' },
            borderRadius: { xs: '12px', sm: '16px' },
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1rem', sm: '1.125rem' },
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.3s ease',
            backgroundColor: activeTab === tab ? themeColors.secondary : 'transparent',
            color: activeTab === tab ? themeColors.textInverse : themeColors.textSecondary,
            '&:hover': {
              backgroundColor: activeTab === tab ? themeColors.secondary : themeColors.bgTertiary,
            },
          }}
        >
          {tab}
        </Button>
      ))}
    </Box>
  );
};

export default AccountSettingsNavigation;
