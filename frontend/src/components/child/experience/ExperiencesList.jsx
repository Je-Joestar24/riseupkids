import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';
import ChildLoadError from '../common/ChildLoadError';
import ExperienceCard from './ExperienceCard';

/** The cards sit in one column on a phone and two across on tablets and computers. */
const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: { xs: phoneFluid(14, 20), sm: '20px' },
};

/** Placeholders shaped like the cards, shown only the very first time the page opens. */
export const ExperiencesSkeleton = () => (
  <SkeletonFrame label="Loading experiences" sx={gridSx}>
    {[0, 1, 2, 3].map((n) => (
      <Box key={n} sx={{ backgroundColor: 'white', overflow: 'hidden' }}>
        <Bone variant="rectangular" sx={{ width: '100%', height: { xs: '180px', sm: 'auto' }, aspectRatio: { xs: 'auto', sm: '4 / 3' }, borderRadius: 0 }} />
        <Box sx={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Bone sx={{ width: '70%', height: 26 }} />
          <Bone sx={{ width: '40%', height: 18 }} />
        </Box>
      </Box>
    ))}
  </SkeletonFrame>
);

export const ExperiencesEmpty = () => (
  <Paper
    role="status"
    sx={{
      width: '100%',
      padding: { xs: phoneFluid(20, 32), sm: '32px' },
      backgroundColor: themeColors.bgCard,
      borderRadius: '0px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
    }}
  >
    <Typography
      component="h2"
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontSize: { xs: phoneFluid(20, 24), sm: '24px' },
        fontWeight: 600,
        color: themeColors.secondary,
        textAlign: 'center',
      }}
    >
      No Experiences Yet
    </Typography>
    <Typography
      sx={{
        fontFamily: 'Quicksand, sans-serif',
        fontSize: { xs: phoneFluid(15, 18), sm: '18px' },
        fontWeight: 500,
        color: themeColors.textSecondary,
        textAlign: 'center',
      }}
    >
      New experiences are coming soon. Check back later!
    </Typography>
  </Paper>
);

/**
 * What goes under the header: placeholders on a first load, a message with Try again when nothing could be
 * loaded, a friendly note when there are none, otherwise the cards.
 */
const ExperiencesList = ({ experiences, childId, loading, error, onRetry }) => {
  if (loading) return <ExperiencesSkeleton />;
  if (error) return <ChildLoadError compact message={error} onRetry={onRetry} />;
  if (!experiences.length) return <ExperiencesEmpty />;

  return (
    <Box component="section" aria-label="Experiences" sx={gridSx}>
      {experiences.map((experience, index) => (
        <ExperienceCard key={experience.uuid} experience={experience} childId={childId} index={index} />
      ))}
    </Box>
  );
};

export default ExperiencesList;
