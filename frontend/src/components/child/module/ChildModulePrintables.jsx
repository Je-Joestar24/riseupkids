import React from 'react';
import { Box, ButtonBase, Grid, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * ChildModulePrintables Component
 *
 * Renders a "Printables" section for the child module.
 * Uses MUI for layout + styling and the same printer SVG icon as requested.
 */
const ChildModulePrintables = ({ onPrintablesClick }) => {
  const navigate = useNavigate();
  const { id: childId, courseId } = useParams();

  const handleClick = () => {
    // Prefer external handler when provided
    if (onPrintablesClick) {
      onPrintablesClick();
      return;
    }

    if (!childId || !courseId) return;
    navigate(`/child/${childId}/journey/${courseId}/printables`);
  };

  return (
    <Box sx={{ width: '100%', mb: { xs: 3, sm: 4, md: 5 }, mt: { xs: 1, sm: 2 } }}>
      <Typography
        component="h2"
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 700, // within 600-700 max
          color: themeColors.textInverse,
          mb: { xs: 3, sm: 4, md: 5 },
        }}
      >
        Printables
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
        <Grid item xs={12} md={6} lg={4}>
          <ButtonBase
            onClick={handleClick}
            aria-label="Open Printables"
            focusRipple
            sx={{
              width: '100%',
              textAlign: 'left',
              overflow: 'hidden',
              borderRadius: '0px', // pointed corners (sharp)
              backgroundColor: '#ffffff',
              boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
              transition: 'transform 200ms ease, box-shadow 200ms ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 22px 50px rgba(0,0,0,0.12)',
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
              '&:focus-visible': {
                outline: `3px solid ${themeColors.secondary}66`,
                outlineOffset: '3px',
              },
            }}
          >
            <Box sx={{ p: { xs: 2, sm: 3.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 2, sm: 3 },
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* Printer icon (same SVG paths as your snippet) */}
                <Box
                  component="span"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: themeColors.secondary,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path>
                    <rect x="6" y="14" width="12" height="8" rx="1"></rect>
                  </svg>
                </Box>

                <Typography
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 700, // within 600-700 max
                    color: themeColors.text,
                  }}
                >
                  Printables
                </Typography>
              </Box>
            </Box>
          </ButtonBase>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChildModulePrintables;

