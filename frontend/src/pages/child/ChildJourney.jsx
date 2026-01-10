import React from 'react';
import { Box } from '@mui/material';
import { themeColors } from '../../config/themeColors';
import ChildJourneyHeader from '../../components/child/journey/ChildJourneyHeader';
import ChildJourneyCards from '../../components/child/journey/ChildJourneyCards';
import ChildJourneySummary from '../../components/child/journey/ChildJourneySummary';

/**
 * ChildJourney Page
 * 
 * Journey page for child interface
 * Displays course progress in a card grid layout
 */
const ChildJourney = ({ childId }) => {
  // TODO: Fetch child's course progress from API using childId
  // For now, using placeholder values
  const week = 3;
  const totalWeeks = 36;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.primary, // --theme-primary: #62caca
        paddingBottom: '90px', // Space for fixed bottom navigation
        paddingTop: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Container with 848px max-width */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '848px',
          backgroundColor: 'transparent',
          padding: { xs: '16px', sm: '32px' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header - Title and Subtitle */}
        <ChildJourneyHeader week={week} totalWeeks={totalWeeks} />

        {/* Card Grid Area */}
        <ChildJourneyCards />

        {/* Progress Summary */}
        <ChildJourneySummary completed={2} current={1} locked={33} />
      </Box>
    </Box>
  );
};

export default ChildJourney;
