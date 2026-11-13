import React from 'react';
import { Box, ButtonBase } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { EXPERIENCE_COLORS, EXPERIENCE_COPY, experienceListPath } from '../../../utils/experienceChildFormat';

const { cream: CREAM, ink: INK, primary: PRIMARY, orange: ORANGE } = EXPERIENCE_COLORS;

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

/**
 * "Back to Experiences" as just an arrow, at the top left of the page, in the same cream as the title band. It is
 * part of the page (it scrolls away with it), and sits on the left edge of the video column (the same gutter and
 * column width as the video bands), so it lines up with the videos below instead of hugging the screen edge.
 * The screen reader still hears "Back to Experiences".
 */
const ExperienceBackButton = ({ childId }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        backgroundColor: CREAM,
        pt: { xs: phoneFluid(12, 16), sm: '20px', md: '24px' },
        px: { xs: phoneFluid(16, 20), sm: '24px', md: '32px' },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '620px', md: '900px' }, mx: 'auto' }}>
        <ButtonBase
          onClick={() => navigate(experienceListPath(childId))}
          aria-label={EXPERIENCE_COPY.backToList}
          title={EXPERIENCE_COPY.backToList}
          sx={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: `2px solid ${PRIMARY}`,
            color: INK,
            boxShadow: '0 2px 6px rgba(62, 127, 118, 0.2)',
            '&.Mui-focusVisible': { outline: `3px solid ${ORANGE}`, outlineOffset: '3px' },
          }}
        >
          <ArrowLeftIcon />
        </ButtonBase>
      </Box>
    </Box>
  );
};

export default ExperienceBackButton;
