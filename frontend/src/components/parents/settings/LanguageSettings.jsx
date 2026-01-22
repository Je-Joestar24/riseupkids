import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import LanguageSettingsHeader from './LanguageSettingsHeader';
import LanguageSettingsLanguages from './LanguageSettingsLanguages';

/**
 * LanguageSettings Component
 * 
 * Language preferences settings for parents
 * Allows selecting app language (MVP: English only enabled)
 */
const LanguageSettings = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isSaved, setIsSaved] = useState(false);

  const handleLanguageChange = (languageCode) => {
    setSelectedLanguage(languageCode);
    setIsSaved(false);
  };

  const handleSaveLanguage = () => {
    console.log('Saving language:', selectedLanguage);
    // TODO: Implement API call to save language preference
    setIsSaved(true);

    // Reset saved indicator after 2 seconds
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <Box
      sx={{
        backgroundColor: themeColors.bgCard,
        borderRadius: { xs: '20px', sm: '24px' },
        padding: { xs: '20px', sm: '24px' },
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <LanguageSettingsHeader />

      {/* Languages List */}
      <Box sx={{ marginBottom: { xs: '20px', sm: '24px' } }}>
        <LanguageSettingsLanguages
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
      </Box>

      {/* Save Button */}
      <Button
        onClick={handleSaveLanguage}
        fullWidth
        sx={{
          backgroundColor: themeColors.secondary,
          color: themeColors.textInverse,
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1rem', sm: '1.125rem' },
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: { xs: '16px', sm: '20px' },
          padding: { xs: '14px 24px', sm: '16px 24px' },
          boxShadow: '0 4px 12px rgba(98, 202, 202, 0.3)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#4db5b5',
            boxShadow: '0 6px 16px rgba(98, 202, 202, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        }}
      >
        {isSaved ? '✓ Language Saved' : 'Save Language'}
      </Button>

      {/* Coming Soon Notice */}
      <Box
        sx={{
          marginTop: { xs: '16px', sm: '20px' },
          padding: { xs: '12px 14px', sm: '14px 16px' },
          backgroundColor: 'rgba(98, 202, 202, 0.1)',
          borderRadius: '10px',
          border: `1px solid ${themeColors.secondary}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: themeColors.secondary,
            textAlign: 'center',
          }}
        >
          Other languages coming soon in upcoming updates!
        </Typography>
      </Box>
    </Box>
  );
};

export default LanguageSettings;
