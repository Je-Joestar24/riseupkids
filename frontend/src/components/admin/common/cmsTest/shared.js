export const pageFrameSx = {
  width: 'min(100%, calc(100dvh * 16 / 9))',
  height: 'min(100dvh, calc(100vw * 9 / 16))',
  maxWidth: '100vw',
  maxHeight: '100dvh',
  minHeight: 0,
  aspectRatio: '1920 / 1080',
  borderRadius: '8px',
  overflow: 'hidden',
  border: (theme) => `1px solid ${theme.palette.border.main}`,
  position: 'relative',
  backgroundColor: '#ffffff',
};

export const imageActionButtonSx = {
  border: 'none',
  p: 0,
  m: 0,
  minWidth: 0,
  width: { xs: 116, md: 144 },
  height: { xs: 116, md: 144 },
  borderRadius: 0,
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: 'transparent',
    opacity: 0.92,
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
  },
};

export const resolvePageType = (rawType = '') => {
  if (rawType === 'cover') return 'intro';
  if (rawType === 'activity_demo_video') return 'demo';
  if (rawType === 'activity_drag_2x1' || rawType === 'activity_drag_2x2') return 'interactive';
  return rawType;
};

export const resolveImageUrl = (page = {}) =>
  page.imageUrl
  || page.backgroundImageUrl
  || page?.media?.imageUrl
  || page?.media?.backgroundImageUrl
  || page?.media?.image?.url
  || page?.media?.backgroundImage?.url
  || page?.media?.imageMedia?.url
  || page?.media?.backgroundImageMedia?.url
  || page?.media?.guideImageMedia?.url
  || '';

export const resolveVideoUrl = (page = {}) =>
  page.videoUrl
  || page?.media?.videoUrl
  || page?.media?.video?.url
  || page?.media?.videoMedia?.url
  || '';

export const resolveAudioUrl = (page = {}) =>
  page.audioUrl
  || page?.media?.audioUrl
  || page?.media?.audio?.url
  || page?.media?.audioMedia?.url
  || page?.media?.instructionAudioMedia?.url
  || '';
