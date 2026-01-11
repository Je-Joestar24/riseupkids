import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleChantCards from './ChildModuleChantCards';

/**
 * ChildModuleChants Component
 * 
 * Chants section displaying chants from the course in a 3-column grid
 * Progress circles are static (0-5) for now
 */
const ChildModuleChants = ({ chants = [], courseProgress = null, onChantClick }) => {
  // Get completed chant IDs from progress
  const getCompletedChants = () => {
    const completedChants = new Set();
    if (courseProgress?.progress?.contentProgress) {
      courseProgress.progress.contentProgress
        .filter((item) => item.contentType === 'chant' && item.status === 'completed')
        .forEach((item) => {
          const key = `${item.contentId.toString()}-${item.contentType}`;
          completedChants.add(key);
        });
    }
    return completedChants;
  };

  const completedChants = getCompletedChants();

  // Calculate progress circles for each chant (0-5) - static for now
  const getChantProgress = (chant) => {
    // Use _contentId or _id from populated chant data
    const chantId = chant._contentId || chant._id || chant.contentId;
    if (!chantId) return 0;
    
    // For now, if completed, show all 5 circles filled
    // In the future, this can be based on progress tracking
    const key = `${chantId.toString()}-chant`;
    if (completedChants.has(key)) {
      return 5; // All circles filled if completed
    }
    
    // Static progress for now - can implement more granular tracking later
    return 0;
  };

  // Check if chant is completed
  const isChantCompleted = (chant) => {
    // Use _contentId or _id from populated chant data
    const chantId = chant._contentId || chant._id || chant.contentId;
    if (!chantId) return false;
    const key = `${chantId.toString()}-chant`;
    return completedChants.has(key);
  };

  if (!chants || chants.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          marginTop: '32px',
        }}
      >
        <Typography
          sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: themeColors.textSecondary,
            textAlign: 'center',
            padding: '32px',
          }}
        >
          No chants available in this course.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        marginTop: '32px',
      }}
    >
      {/* Section Title */}
      <Typography
        sx={{
          fontSize: '24px',
          fontWeight: 600,
          color: themeColors.textInverse,
          marginBottom: '24px',
        }}
      >
        Chants
      </Typography>

      {/* Chants Grid - 3 columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: '24px',
        }}
      >
        {chants.map((chant, index) => {
          // Chant is already populated with full data from API
          const chantId = chant._id || chant._contentId || chant.contentId || chant.id;
          
          return (
            <ChildModuleChantCards
              key={chantId || index}
              chant={chant}
              isCompleted={isChantCompleted(chant)}
              progressCircles={getChantProgress(chant)}
              onCardClick={() => {
                if (onChantClick) {
                  onChantClick(chant);
                }
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ChildModuleChants;
