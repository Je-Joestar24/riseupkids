import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';
import { experienceDetailPath, videoCountLabel } from '../../../utils/experienceChildFormat';
import ExploreCoverImage from '../explore/ExploreCoverImage';
import ExperienceCoverPlaceholder from './ExperienceCoverPlaceholder';

const clamp = (lines) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

/**
 * One experience on the list: its cover picture, its title, a line of description and how many videos it has.
 * An experience with no cover shows a cheerful illustration in the same place (see ExperienceCoverPlaceholder), so the cards stay level.
 *
 * The whole card opens the experience: the title is the one link (so a screen reader hears one link named after the
 * experience, not the whole card), and its invisible `::after` stretches over the card so a tap anywhere works.
 * With no `childId` there is nowhere to go, so the title is plain text.
 */
const ExperienceCard = ({ experience, childId, index = 0 }) => {
  const theme = useTheme();
  const coverUrl = getCoverImageUrl(experience.coverImage);

  return (
    <Box
      component="article"
      aria-label={experience.title}
      sx={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '0px',
        overflow: 'hidden',
        boxShadow: theme.shadows[2],
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...(childId && {
          cursor: 'pointer',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          // (a finger leaves no pointer behind, so on phones the lift would only stick)
          '&:hover': { boxShadow: theme.shadows[6], transform: { xs: 'none', sm: 'translateY(-2px)' } },
          '&:focus-within': { outline: `3px solid ${themeColors.orange}`, outlineOffset: '2px' },
        }),
      }}
    >
      <ExploreCoverImage
        src={coverUrl}
        alt={experience.title}
        index={index}
        backgroundColor={themeColors.bgTertiary}
        phoneHeight={180}
      >
        {!coverUrl && <ExperienceCoverPlaceholder index={index} />}
      </ExploreCoverImage>

      <Box sx={{ padding: { xs: phoneFluid(12, 16), sm: '16px' }, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: phoneFluid(18, 22), sm: '22px' },
            fontWeight: 700,
            lineHeight: 1.25,
            color: theme.palette.secondary.main,
            overflowWrap: 'anywhere',
            ...clamp(2),
          }}
        >
          {childId ? (
            <Box
              component={Link}
              to={experienceDetailPath(childId, experience.uuid)}
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                // The link covers the whole card; the focus ring is drawn on the card (see `&:focus-within` above).
                '&::after': { content: '""', position: 'absolute', inset: 0 },
                '&:focus-visible': { outline: 'none' },
              }}
            >
              {experience.title}
            </Box>
          ) : (
            experience.title
          )}
        </Typography>

        {experience.description ? (
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: phoneFluid(14, 16), sm: '16px' },
              fontWeight: 500,
              lineHeight: 1.4,
              color: themeColors.textSecondary,
              overflowWrap: 'anywhere',
              ...clamp(2),
            }}
          >
            {experience.description}
          </Typography>
        ) : null}

        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: phoneFluid(13, 14), sm: '14px' },
            fontWeight: 700,
            color: themeColors.orange,
          }}
        >
          {videoCountLabel(experience.videoCount)}
        </Typography>
      </Box>
    </Box>
  );
};

export default React.memo(ExperienceCard);
