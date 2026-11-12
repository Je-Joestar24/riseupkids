import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { ArrowBack as BackIcon, LaptopMac as LaptopIcon, PhoneIphone as PhoneIcon } from '@mui/icons-material';
import useObjectUrl from '../../../../../hooks/useObjectUrl';
import { previewFromForm } from '../../../../../utils/experiencePreview';
import ExperiencePreviewPage from './ExperiencePreviewPage';

export const DEVICES = Object.freeze({ LAPTOP: 'laptop', PHONE: 'phone' });

const font = { fontFamily: 'Quicksand, sans-serif' };

/** A laptop screen: a thin browser bar over the page, scrolling inside a fixed height like a real window. */
const LaptopFrame = ({ children }) => (
  <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', border: '1px solid #cbd5e1', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: 3 }}>
    <Box sx={{ height: 34, display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, backgroundColor: '#e2e8f0' }} aria-hidden>
      {['#f87171', '#fbbf24', '#4ade80'].map((color) => (
        <Box key={color} sx={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: color }} />
      ))}
    </Box>
    <Box role="region" aria-label="Preview of the experience on a laptop" tabIndex={0} sx={{ height: 'min(68vh, 640px)', overflowY: 'auto' }}>
      {children}
    </Box>
  </Box>
);

/** A phone: the page scrolls inside the screen, with no browser bar, no footer. */
const PhoneFrame = ({ children }) => (
  <Box
    sx={{
      width: 390,
      maxWidth: '100%',
      mx: 'auto',
      border: '10px solid #1f2937',
      borderRadius: '44px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      boxShadow: 3,
      position: 'relative',
    }}
  >
    <Box sx={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 90, height: 22, borderRadius: '14px', backgroundColor: '#1f2937', zIndex: 2 }} aria-hidden />
    {/* The status bar stays put; only the page below it scrolls, and a phone shows no scroll bar. */}
    <Box sx={{ height: 34, backgroundColor: '#f1ebd4' }} aria-hidden />
    <Box
      role="region"
      aria-label="Preview of the experience on a phone"
      tabIndex={0}
      sx={{ height: 'min(72vh, 726px)', overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
    >
      {children}
    </Box>
  </Box>
);

/**
 * The whole preview screen: how the experience looks to children, on a laptop or on a phone, from what is on the form
 * right now (nothing needs to be saved first). Reading it changes nothing.
 *
 * @param {{ form: ReturnType<typeof import('../../../../../utils/experienceForm').emptyForm>, onBack: () => void }} props
 */
const ExperiencePreview = ({ form, onBack }) => {
  const theme = useTheme();
  const [device, setDevice] = useState(DEVICES.LAPTOP);

  // The printable's picture: a newly chosen file wins; a removed saved one shows nothing.
  const fileUrl = useObjectUrl(form.printableImage.file);
  const printableImageSrc = form.printableImage.file ? fileUrl : form.printableImage.remove ? null : form.printableImage.url;
  const preview = useMemo(() => previewFromForm(form, { printableImageSrc }), [form, printableImageSrc]);

  const Frame = device === DEVICES.PHONE ? PhoneFrame : LaptopFrame;

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, borderRadius: '16px', border: `1px solid ${theme.palette.border.main}`, boxShadow: theme.shadows[2] }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Button onClick={onBack} startIcon={<BackIcon />} variant="outlined" sx={{ textTransform: 'none', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0, ...font, fontWeight: 700 }}>
              Back to editing
            </Button>
            <Box>
              <Typography variant="h5" component="h1" sx={{ ...font, fontWeight: 700 }}>
                Preview
              </Typography>
              <Typography variant="body2" sx={{ ...font, color: theme.palette.text.secondary }}>
                How children will see this experience. Nothing is saved by looking at it.
              </Typography>
            </Box>
            <Chip
              size="small"
              label={preview.published ? 'Published' : 'Draft'}
              color={preview.published ? 'success' : 'warning'}
              sx={{ fontWeight: 700, ...font, display: { xs: 'none', sm: 'inline-flex' } }}
            />
          </Stack>

          <ToggleButtonGroup
            exclusive
            value={device}
            onChange={(event, value) => value && setDevice(value)}
            aria-label="Preview size"
            size="small"
            color="primary"
          >
            <ToggleButton value={DEVICES.LAPTOP} aria-label="Laptop preview" sx={{ textTransform: 'none', px: 2, ...font, fontWeight: 700 }}>
              <LaptopIcon sx={{ mr: 1 }} aria-hidden /> Laptop
            </ToggleButton>
            <ToggleButton value={DEVICES.PHONE} aria-label="Phone preview" sx={{ textTransform: 'none', px: 2, ...font, fontWeight: 700 }}>
              <PhoneIcon sx={{ mr: 1 }} aria-hidden /> Phone
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      <Box sx={{ py: 3, px: { xs: 0, sm: 2 }, borderRadius: '16px', backgroundColor: theme.palette.custom.bgSecondary, border: `1px dashed ${theme.palette.border.secondary}` }}>
        <Frame>
          <ExperiencePreviewPage preview={preview} />
        </Frame>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, ...font, color: theme.palette.text.secondary }}>
        Videos play here the way they will for children. The cover picture is not part of this page: it shows on the experience card in the list.
      </Typography>
    </Box>
  );
};

export default ExperiencePreview;
