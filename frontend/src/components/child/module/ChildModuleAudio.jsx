import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ChildModuleAudioCards from './ChildModuleAudioCards';

/**
 * ChildModuleAudio Component
 * 
 * Audio assignments section displaying audio assignments from the course in a grid
 */
const ChildModuleAudio = ({ audioAssignments = [], courseProgress = null, onAudioClick }) => {
  // Get completed audio IDs from progress
  const getCompletedAudio = () => {
    const completedAudio = new Set();
    if (courseProgress?.progress?.contentProgress) {
      courseProgress.progress.contentProgress
        .filter((item) => item.contentType === 'audioAssignment' && item.status === 'completed')
        .forEach((item) => {
          const key = `${item.contentId.toString()}-${item.contentType}`;
          completedAudio.add(key);
        });
    }
    return completedAudio;
  };

  const completedAudio = getCompletedAudio();

  // Check if audio is completed (for future use if needed)
  const isAudioCompleted = (audio) => {
    const audioId = audio._contentId || audio._id || audio.contentId;
    if (!audioId) return false;
    const key = `${audioId.toString()}-audioAssignment`;
    return completedAudio.has(key);
  };

  if (!audioAssignments || audioAssignments.length === 0) {
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
          No audio assignments available in this course.
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
        Audio Assignment
      </Typography>

      {/* Audio Assignments Grid - 3 columns */}
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
        {audioAssignments.map((audio, index) => {
          // Audio is already populated with full data from API
          const audioId = audio._id || audio._contentId || audio.contentId || audio.id;
          
          return (
            <ChildModuleAudioCards
              key={audioId || index}
              audio={audio}
              onCardClick={() => {
                if (onAudioClick) {
                  onAudioClick(audio);
                }
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ChildModuleAudio;
