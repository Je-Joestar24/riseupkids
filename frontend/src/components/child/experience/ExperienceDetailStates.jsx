import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { EXPERIENCE_COLORS, EXPERIENCE_COPY, experienceListPath } from '../../../utils/experienceChildFormat';
import { Bone, SkeletonFrame } from '../common/ChildSkeleton';
import ChildLoadError from '../common/ChildLoadError';
import ExperienceBand from './ExperienceBand';
import ExperienceBackButton from './ExperienceBackButton';

const { cream: CREAM, pale: PALE, ink: INK, orange: ORANGE } = EXPERIENCE_COLORS;
const FONT = 'Quicksand, sans-serif';

/**
 * Placeholders in the shape of the page (title, one video), shown only the very first time an experience opens.
 * The back arrow is already there, so the child can leave at once.
 */
export const ExperienceDetailSkeleton = ({ childId }) => (
  <Box sx={{ backgroundColor: EXPERIENCE_COLORS.peach, minHeight: '100vh' }}>
    <ExperienceBackButton childId={childId} />
    <ExperienceBand color={CREAM} label="Title">
      <SkeletonFrame label="Loading experience" sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <Bone sx={{ width: '70%', height: { xs: 34, sm: 44 } }} />
        <Bone sx={{ width: '90%', height: 20 }} />
        <Bone sx={{ width: '60%', height: 20 }} />
      </SkeletonFrame>
    </ExperienceBand>
    <ExperienceBand color={PALE} label="Video" wide>
      <SkeletonFrame label="Loading video" sx={{ width: '100%' }}>
        <Bone variant="rounded" sx={{ width: '100%', aspectRatio: '16 / 9', height: 'auto', borderRadius: '16px' }} />
      </SkeletonFrame>
    </ExperienceBand>
  </Box>
);

/** The server has no such experience (never existed, or taken down). Nothing to try again; the way out is the list. */
export const ExperienceNotFound = ({ childId }) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ backgroundColor: EXPERIENCE_COLORS.peach, minHeight: '100vh' }}>
      <ExperienceBackButton childId={childId} />
      <ExperienceBand color={CREAM} label="Experience not available">
        <Box role="status" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', py: { xs: '8px', sm: '16px' } }}>
          <Typography
            component="h1"
            sx={{ fontFamily: FONT, fontWeight: 700, fontSize: { xs: phoneFluid(22, 28), sm: '32px' }, color: INK, textAlign: 'center', textWrap: 'balance' }}
          >
            {EXPERIENCE_COPY.notFoundTitle}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontWeight: 500, fontSize: { xs: phoneFluid(15, 16), sm: '16px' }, lineHeight: 1.6, color: INK, textAlign: 'center' }}>
            {EXPERIENCE_COPY.notFoundText}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(experienceListPath(childId))}
            sx={{ mt: '8px', backgroundColor: ORANGE, color: '#fff', textTransform: 'none', fontFamily: FONT, fontWeight: 700, '&:hover': { backgroundColor: ORANGE } }}
          >
            See all experiences
          </Button>
        </Box>
      </ExperienceBand>
    </Box>
  );
};

/** The experience could not be loaded: the message and Try again, with the back arrow. */
export const ExperienceLoadFailed = ({ childId, message, onRetry }) => (
  <Box sx={{ backgroundColor: EXPERIENCE_COLORS.peach, minHeight: '100vh' }}>
    <ExperienceBackButton childId={childId} />
    <ExperienceBand color={CREAM} label="Experience could not load">
      <ChildLoadError compact message={message} onRetry={onRetry} />
    </ExperienceBand>
  </Box>
);
