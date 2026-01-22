import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SettingsIcon from '@mui/icons-material/Settings';
import { themeColors } from '../../../config/themeColors';

/**
 * AccountSettingsBox Component
 * 
 * Account settings card with button
 * Fully mobile responsive
 */
const AccountSettingsBox = ({ onOpenSettings }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        borderRadius: { xs: '16px', sm: '20px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
        height: '100%',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
      onClick={onOpenSettings}
    >
      <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, marginBottom: 2 }}>
          <SettingsIcon
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: themeColors.primary,
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 700,
              color: themeColors.text,
            }}
          >
            Account Settings
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '0.875rem', sm: '1rem' },
            color: themeColors.textSecondary,
            marginBottom: 2,
          }}
        >
          Manage your Account And subscription
        </Typography>
        <Button
          variant="outlined"
          fullWidth
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textTransform: 'none',
            borderColor: themeColors.border,
            color: themeColors.text,
            borderRadius: { xs: '8px', sm: '12px' },
            paddingY: { xs: '10px', sm: '12px' },
            '&:hover': {
              borderColor: themeColors.primary,
              backgroundColor: themeColors.bgTertiary,
            },
          }}
        >
          Account Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccountSettingsBox;
