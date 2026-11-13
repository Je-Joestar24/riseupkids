import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { phoneFluid } from '../../../constants/childPhoneLayout';
import {
  EXPERIENCE_COLORS,
  EXPERIENCE_COPY,
  homePath,
  toExperienceView,
} from '../../../utils/experienceChildFormat';
import ExperienceBackButton from './ExperienceBackButton';
import ExperienceBand from './ExperienceBand';
import ExperiencePillButton from './ExperiencePillButton';
import ExperienceVideoBlock from './ExperienceVideoBlock';

const { cream: CREAM, peach: PEACH, ink: INK, orange: ORANGE, accent: ACCENT } = EXPERIENCE_COLORS;
const FONT = 'Quicksand, sans-serif';

const PrinterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

/**
 * One experience as a child sees it, copied from the phone app's Experience page: a cream title band (with the
 * description, or the app's own two lines when there is none), one band per video, the printable with its button, and a
 * peach closing message with a button back to home. It fits the way the free Experience page on the sales site does: the
 * bands run edge to edge, sizes shrink smoothly on small phones, and a computer gets a wider column for the videos.
 *
 * @param {{ childId: string, experience: object }} props `experience` is what the server sent for one experience
 */
const ExperienceDetailView = ({ childId, experience }) => {
  const navigate = useNavigate();
  const view = useMemo(() => toExperienceView(experience), [experience]);
  // Only one video plays at a time: starting one puts the other back to its play button.
  const [playingKey, setPlayingKey] = useState(null);
  const { title, description, videos, printable } = view;

  const body = {
    fontFamily: FONT,
    fontWeight: 500,
    fontSize: { xs: phoneFluid(15, 16), sm: '16px', md: '18px' },
    lineHeight: 1.6,
    color: INK,
    textAlign: 'center',
  };

  return (
    <Box sx={{ backgroundColor: PEACH, fontFamily: FONT }}>
      <ExperienceBackButton childId={childId} />
      <ExperienceBand color={CREAM} label="Title">
        <Typography
          component="h1"
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: { xs: phoneFluid(26, 34), sm: '36px', md: '44px' },
            lineHeight: 1.15,
            color: INK,
            textAlign: 'center',
            overflowWrap: 'anywhere',
            textWrap: 'balance',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ mt: { xs: '14px', sm: '18px' }, maxWidth: '100%' }}>
          {description ? (
            <Typography sx={{ ...body, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{description}</Typography>
          ) : (
            <>
              <Typography sx={body}>{EXPERIENCE_COPY.taglineLine1}</Typography>
              <Typography sx={{ ...body, color: ORANGE }}>{EXPERIENCE_COPY.taglineLine2}</Typography>
            </>
          )}
        </Box>
      </ExperienceBand>

      {videos.map((video) => (
        <ExperienceBand key={video.key} color={video.band} label={video.title} wide>
          <ExperienceVideoBlock video={video} playing={playingKey === video.key} onPlay={() => setPlayingKey(video.key)} />
        </ExperienceBand>
      ))}

      {printable && (
        <ExperienceBand color={printable.band} label="Printable" compact>
          {printable.imageUrl && (
            <Box
              component="img"
              src={printable.imageUrl}
              alt={`${title} printable`}
              loading="lazy"
              sx={{
                display: 'block',
                width: { xs: '60%', sm: '50%' },
                maxWidth: { xs: '220px', sm: '260px', md: '300px' },
                maxHeight: { xs: '320px', md: '420px' },
                objectFit: 'contain',
                borderRadius: '14px',
              }}
            />
          )}
          {printable.action && (
            <ExperiencePillButton icon={<PrinterIcon />} color={ORANGE} label={printable.action.label} href={printable.action.url} />
          )}
        </ExperienceBand>
      )}

      <ExperienceBand color={PEACH} label="Closing message">
        <Typography
          component="h2"
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: { xs: phoneFluid(21, 26), sm: '28px', md: '32px' },
            lineHeight: 1.25,
            color: INK,
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          {EXPERIENCE_COPY.closingTitle}
        </Typography>
        <Typography
          sx={{
            mt: '16px',
            mb: '22px',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: { xs: phoneFluid(14, 15), sm: '15px', md: '17px' },
            color: INK,
            textAlign: 'center',
          }}
        >
          <Box component="span" sx={{ color: ACCENT }} aria-hidden>
            ★
          </Box>{' '}
          {EXPERIENCE_COPY.closingStars}{' '}
          <Box component="span" sx={{ color: ACCENT }} aria-hidden>
            ★
          </Box>
        </Typography>
        <ExperiencePillButton icon={<HomeIcon />} color={ACCENT} label={EXPERIENCE_COPY.homeButton} onClick={() => navigate(homePath(childId))} />
      </ExperienceBand>
    </Box>
  );
};

export default ExperienceDetailView;
