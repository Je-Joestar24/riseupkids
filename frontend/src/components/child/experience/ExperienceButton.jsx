import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { experienceListPath } from '../../../utils/experienceChildFormat';

const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
    <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/**
 * The wide "Experience" button at the top of the Explore page. It only opens the list of experiences, so it
 * needs nothing loaded: it is there the moment the page is.
 */
const ExperienceButton = ({ childId }) => {
  const navigate = useNavigate();

  return (
    <Button
      fullWidth
      onClick={() => childId && navigate(experienceListPath(childId))}
      sx={{
        minHeight: { xs: phoneFluid(56, 68), sm: '72px' },
        py: 0,
        px: { xs: phoneFluid(14, 20), sm: '28px' },
        marginBottom: { xs: phoneFluid(18, 24), sm: '24px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: phoneFluid(8, 12), sm: '12px' },
        backgroundColor: themeColors.orange,
        color: themeColors.textInverse,
        border: '4px solid',
        borderColor: themeColors.orange,
        borderRadius: '0px',
        fontFamily: 'Quicksand, sans-serif',
        fontSize: { xs: phoneFluid(20, 26), sm: '26px' },
        fontWeight: 700,
        textTransform: 'none',
        lineHeight: 1.2,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          backgroundColor: themeColors.orange,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
          // (a finger leaves no pointer behind, so on phones the grow effect would only stick)
          transform: { xs: 'none', sm: 'scale(1.01)' },
        },
      }}
    >
      <SparkleIcon />
      <span>Experience</span>
      <ArrowRightIcon />
    </Button>
  );
};

export default ExperienceButton;
