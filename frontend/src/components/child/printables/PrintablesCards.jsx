import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';

const DownloadIcon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" x2="12" y1="15" y2="3"></line>
  </svg>
);

const PrintablesCards = ({ cards = [], onDownload }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, sm: 4, padding: '16px 24px' } }}>
      {cards.map((card) => {
        const isDisabled = !card?.fileUrl;

        return (
          <Box
            key={card?.id || card?.pageNumber}
            sx={{
              bgColor: '#ffffff',
              borderRadius: 0,
              boxShadow: '0 12px 28px rgba(0,0,0,0.10)',
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              transition: 'box-shadow 200ms ease, transform 200ms ease',
              '&:hover': {
                boxShadow: '0 22px 50px rgba(0,0,0,0.14)',
              },
              backgroundColor: 'white'
            }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 128,
                height: 128,
                overflow: 'hidden',
                borderRadius: 0,
                boxShadow: '0 6px 14px rgba(0,0,0,0.10)',
              }}
            >
              {card?.imageUrl ? (
                <Box
                  component="img"
                  src={card.imageUrl}
                  alt={card?.label ? `${card.label} thumbnail` : `Page ${card?.pageNumber} thumbnail`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 700,
                  color: themeColors.secondary,
                  fontSize: { xs: '1.4rem', sm: '1.6rem' },
                  mb: 0.5,
                }}
              >
                {`Page ${card?.pageNumber ?? ''}`.trim()}
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: themeColors.primary,
                  fontSize: { xs: '1.05rem', sm: '1.15rem' },
                }}
              >
                {card?.label || ''}
              </Typography>
            </Box>

            <ButtonBase
              disabled={isDisabled}
              onClick={() => onDownload?.(card?.fileUrl)}
              aria-label={`Download ${card?.label || `Page ${card?.pageNumber}`}`}
              sx={{
                flexShrink: 0,
                borderRadius: 0,
                backgroundColor: themeColors.accent,
                color: themeColors.textInverse,
                px: 4,
                py: 2,
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.05rem', sm: '1.15rem' },
                boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
                transition: 'transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease',
                '&:hover': {
                  backgroundColor: '#e09f00',
                  boxShadow: '0 14px 28px rgba(0,0,0,0.14)',
                  transform: 'scale(1.03)',
                },
                '&:active': {
                  transform: 'scale(0.97)',
                },
                '&.Mui-disabled': {
                  backgroundColor: themeColors.bgTertiary,
                  color: themeColors.textMuted,
                  boxShadow: 'none',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', color: themeColors.textInverse }}>
                  <DownloadIcon size={24} />
                </Box>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  Download
                </Box>
              </Box>
            </ButtonBase>
          </Box>
        );
      })}
    </Box>
  );
};

export default PrintablesCards;

