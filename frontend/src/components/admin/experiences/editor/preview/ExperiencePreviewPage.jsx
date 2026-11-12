import React, { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import {
  HomeOutlined as HomeIcon,
  PlayArrow as PlayIcon,
  PrintOutlined as PrintIcon,
} from '@mui/icons-material';
import { BAND_COLORS, PREVIEW_COPY } from '../../../../../utils/experiencePreview';

const FONT = 'Quicksand, sans-serif';
const { cream: CREAM, peach: PEACH, ink: INK, orange: ORANGE, accent: ACCENT, primary: PRIMARY } = BAND_COLORS;

/** A full-width coloured band with its content in a centred column, like the app's page. */
const Band = ({ color, label, compact = false, wide = false, children }) => (
  <Box component="section" aria-label={label} sx={{ backgroundColor: color, py: compact ? 2.5 : 5, px: 2.5 }}>
    <Box
      sx={{
        width: '100%',
        maxWidth: wide ? 620 : 560,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 2 : 0,
      }}
    >
      {children}
    </Box>
  </Box>
);

/** The round orange / yellow button of the page (it does nothing in a preview). */
const PillButton = ({ icon, color, label }) => (
  <ButtonBase
    component="div"
    role="button"
    aria-label={label}
    title="Preview only"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '9px',
      py: '13px',
      px: '28px',
      borderRadius: '999px',
      backgroundColor: color,
      color: '#fff',
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 13.5,
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      cursor: 'default',
    }}
  >
    {icon}
    {label}
  </ButtonBase>
);

/** The Bunny embed address with autoplay on, for a video the admin has just tapped. */
const playbackUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', 'true');
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * One video: a play button first, and the Bunny player only after it is tapped, so nothing loads until it is
 * wanted. A video with no usable link shows the same play button, but it cannot be pressed.
 */
const VideoBlock = ({ video, playing, onPlay }) => {
  const poster = (
    <>
      <Box
        sx={{ width: 62, height: 62, borderRadius: '50%', backgroundColor: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
      >
        <PlayIcon sx={{ fontSize: 36 }} aria-hidden />
      </Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: INK, textAlign: 'center', overflowWrap: 'anywhere' }}>{video.title}</Typography>
    </>
  );
  const posterSx = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, p: 2 };

  let content;
  if (video.playable && playing) {
    content = (
      <Box
        component="iframe"
        title={video.title}
        src={playbackUrl(video.url)}
        allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    );
  } else if (video.playable) {
    content = (
      <ButtonBase onClick={onPlay} aria-label={`Play ${video.title}`} sx={posterSx}>
        {poster}
      </ButtonBase>
    );
  } else {
    content = (
      <Box sx={posterSx}>
        {poster}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: '#fff',
        border: `2px solid ${PRIMARY}`,
        borderRadius: '20px',
        p: '4px',
        boxShadow: '0 10px 14px rgba(62, 127, 118, 0.16)',
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: '16px', overflow: 'hidden', backgroundColor: CREAM }}>{content}</Box>
    </Box>
  );
};

/**
 * The experience as a child sees it, drawn from the app's Experience page: the title (and the description, or the
 * app's own line when there is none), each video, the printable, and the closing message. There is no footer and
 * no copyright line: the phone app does not show one.
 *
 * @param {{ preview: import('../../../../../utils/experiencePreview').Preview }} props
 */
const ExperiencePreviewPage = ({ preview }) => {
  // Only one video plays at a time: starting one puts the other back to its play button.
  const [playingKey, setPlayingKey] = useState(null);
  const { title, hasTitle, description, videos, printable } = preview;

  const body = { fontFamily: FONT, fontWeight: 500, fontSize: 16, lineHeight: '26px', color: INK, textAlign: 'center' };

  return (
    <Box sx={{ backgroundColor: '#fff', fontFamily: FONT }}>
      <Band color={CREAM} label="Title">
        <Typography
          component="h2"
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 34,
            lineHeight: '39px',
            color: INK,
            textAlign: 'center',
            overflowWrap: 'anywhere',
            opacity: hasTitle ? 1 : 0.5,
            fontStyle: hasTitle ? 'normal' : 'italic',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ mt: '18px' }}>
          {description ? (
            <Typography sx={{ ...body, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{description}</Typography>
          ) : (
            <>
              <Typography sx={body}>{PREVIEW_COPY.taglineLine1}</Typography>
              <Typography sx={{ ...body, color: ORANGE }}>{PREVIEW_COPY.taglineLine2}</Typography>
            </>
          )}
        </Box>
      </Band>

      {videos.length === 0 ? (
        <Band color={BAND_COLORS.pale} label="Videos" wide>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: INK }}>{PREVIEW_COPY.noVideos}</Typography>
          <Typography sx={{ ...body, fontSize: 14 }}>{PREVIEW_COPY.noVideosHint}</Typography>
        </Band>
      ) : (
        videos.map((video) => (
          <Band key={video.key} color={video.band} label={video.title} wide>
            <VideoBlock video={video} playing={playingKey === video.key} onPlay={() => setPlayingKey(video.key)} />
          </Band>
        ))
      )}

      {printable && (
        <Band color={printable.band} label="Printable" compact>
          {printable.imageSrc ? (
            <Box sx={{ width: '60%', maxWidth: 220, aspectRatio: '627 / 552', borderRadius: '14px', overflow: 'hidden' }}>
              <Box component="img" src={printable.imageSrc} alt={`${title} printable`} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 190,
                aspectRatio: '3 / 4',
                backgroundColor: '#fff',
                border: `2px solid ${PRIMARY}`,
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: INK }}>{PREVIEW_COPY.printablePlaceholder}</Typography>
              <Typography sx={{ fontFamily: FONT, fontWeight: 500, fontSize: 12, color: INK, opacity: 0.75 }}>{PREVIEW_COPY.printablePlaceholderHint}</Typography>
            </Box>
          )}
          <PillButton icon={<PrintIcon sx={{ fontSize: 20 }} aria-hidden />} color={ORANGE} label={printable.button} />
        </Band>
      )}

      <Band color={PEACH} label="Closing message">
        <Typography component="h2" sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, lineHeight: '33px', color: INK, textAlign: 'center' }}>
          {PREVIEW_COPY.closingTitle}
        </Typography>
        <Typography sx={{ mt: 2, mb: '22px', fontFamily: FONT, fontWeight: 600, fontSize: 15, color: INK, textAlign: 'center' }}>
          <Box component="span" sx={{ color: ACCENT }} aria-hidden>
            ★
          </Box>{' '}
          {PREVIEW_COPY.closingStars}{' '}
          <Box component="span" sx={{ color: ACCENT }} aria-hidden>
            ★
          </Box>
        </Typography>
        <PillButton icon={<HomeIcon sx={{ fontSize: 20 }} aria-hidden />} color={ACCENT} label={PREVIEW_COPY.homeButton} />
      </Band>
    </Box>
  );
};

export default ExperiencePreviewPage;
