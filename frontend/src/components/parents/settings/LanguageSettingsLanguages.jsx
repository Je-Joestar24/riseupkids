import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * LanguageSettingsLanguages Component
 * 
 * Language selection buttons
 * Currently only English is enabled (MVP - other languages coming soon)
 */
const LanguageSettingsLanguages = ({ selectedLanguage, onLanguageChange }) => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸', disabled: true },
    { code: 'fr', name: 'Français', flag: '🇫🇷', disabled: true },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', disabled: true },
    { code: 'pt', name: 'Português', flag: '🇵🇹', disabled: true },
    { code: 'zh', name: '中文', flag: '🇨🇳', disabled: true },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: '12px', sm: '14px' },
      }}
    >
      {languages.map((language) => (
        <Button
          key={language.code}
          onClick={() => !language.disabled && onLanguageChange(language.code)}
          disabled={language.disabled}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: { xs: '14px 16px', sm: '16px 18px' },
            borderRadius: '16px',
            border: `2px solid ${
              selectedLanguage === language.code
                ? themeColors.secondary
                : language.disabled
                ? themeColors.border
                : themeColors.border
            }`,
            backgroundColor:
              selectedLanguage === language.code
                ? 'rgb(212, 230, 227)'
                : 'white',
            transition: 'all 0.3s ease',
            cursor: language.disabled ? 'not-allowed' : 'pointer',
            opacity: language.disabled ? 0.5 : 1,
            textTransform: 'none',
            '&:hover': language.disabled
              ? {}
              : {
                  borderColor: themeColors.secondary,
                  backgroundColor: 'rgba(98, 202, 202, 0.05)',
                },
            '&:disabled': {
              borderColor: themeColors.border,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: '12px', sm: '14px' },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '24px', sm: '28px' },
                lineHeight: 1,
              }}
            >
              {language.flag}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '16px', sm: '18px' },
                fontWeight: 600,
                color:
                  selectedLanguage === language.code
                    ? themeColors.secondary
                    : themeColors.text,
              }}
            >
              {language.name}
            </Typography>
            {language.disabled && (
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: themeColors.textMuted,
                  marginLeft: '8px',
                  padding: '2px 8px',
                  backgroundColor: themeColors.bgSecondary,
                  borderRadius: '6px',
                }}
              >
                Coming Soon
              </Typography>
            )}
          </Box>

          {selectedLanguage === language.code && (
            <CheckCircle
              sx={{
                fontSize: '24px',
                color: themeColors.secondary,
                flexShrink: 0,
              }}
            />
          )}
        </Button>
      ))}
    </Box>
  );
};

export default LanguageSettingsLanguages;
