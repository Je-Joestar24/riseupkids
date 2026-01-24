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
  // Get audio progress status map from course progress
  const getAudioProgressMap = () => {
    const progressMap = new Map();
    if (courseProgress?.progress?.contentProgress) {
      courseProgress.progress.contentProgress
        .filter((item) => item.contentType === 'audioAssignment')
        .forEach((item) => {
          const key = item.contentId.toString();
          progressMap.set(key, item.status);
        });
    }
    return progressMap;
  };

  const audioProgressMap = getAudioProgressMap();

  // Get status for a specific audio assignment
  const getAudioStatus = (audio) => {
    const audioId = audio._contentId || audio._id || audio.contentId;
    if (!audioId) return null;
    return audioProgressMap.get(audioId.toString()) || null;
  };

  // Check if audio is completed (for future use if needed)
  const isAudioCompleted = (audio) => {
    return getAudioStatus(audio) === 'completed';
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
          const audioStatus = getAudioStatus(audio);
          
          return (
            <ChildModuleAudioCards
              key={audioId || index}
              audio={audio}
              status={audioStatus}
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
