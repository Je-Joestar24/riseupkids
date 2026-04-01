import React from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

import { themeColors } from '../../../config/themeColors';

function buildStepTitle(step) {
  return `Step ${step?.stepNumber || ''}`.trim();
}

function buildStepSubtitle(step) {
  return step?.title || step?.module?.title || `Module ${step?.stepNumber || ''}`.trim();
}

const ProgramMaterialsStepCard = ({ step, onDownload }) => {
  const downloadUrl =
    step?.printablePdfUrl ||
    step?.fileUrl ||
    step?.printable?.pdfUrl ||
    step?.printables?.find((p) => p?.fileUrl)?.fileUrl ||
    null;

  const isLocked = step?.isUnlocked === false;

  return (
    <Card
      sx={{
        width: '100%',
        borderRadius: '16px',
        border: `1px solid ${themeColors.border}`,
        boxShadow: 'none',
        backgroundColor: themeColors.bgCard,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                color: themeColors.text,
                fontSize: { xs: '1.05rem', sm: '1.15rem' },
              }}
            >
              {buildStepSubtitle(step)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 700,
                color: themeColors.textMuted,
                whiteSpace: 'nowrap',
              }}
            >
              {buildStepTitle(step)}
            </Typography>
          </Stack>
          {!!step?.description ? (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: themeColors.textMuted,
                fontWeight: 600,
              }}
            >
              {step.description}
            </Typography>
          ) : null}

          {/* Backward compatibility: old API returned step.printables[] */}
          {!!step?.printables?.length ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.25,
              }}
            >
              {step.printables.map((printable) => (
                <Box
                  key={printable.id || `${step.stepNumber}-${printable.pageNumber}`}
                  sx={{
                    border: `1px solid ${themeColors.border}55`,
                    borderRadius: '12px',
                    p: 1.25,
                    backgroundColor: themeColors.bg,
                    display: 'flex',
                  }}
                >
                  <Stack spacing={1} sx={{ width: '100%', minHeight: '100%' }}>
                  {!!printable?.coverImage ? (
                    <Box
                      component="img"
                      src={printable.coverImage}
                      alt={`${printable.title || printable.label || `Page ${printable.pageNumber}`} cover`}
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: `1px solid ${themeColors.border}66`,
                      }}
                    />
                  ) : null}

                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      color: themeColors.text,
                      fontWeight: 700,
                      fontSize: { xs: '0.95rem', sm: '1rem' },
                    }}
                  >
                    {printable.title || printable.label || `Page ${printable.pageNumber}`}
                  </Typography>

                  {!!printable?.description ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: themeColors.textMuted,
                        fontWeight: 600,
                      }}
                    >
                      {printable.description}
                    </Typography>
                  ) : null}

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onDownload(printable.fileUrl || printable.pdfUrl)}
                    disabled={!(printable.fileUrl || printable.pdfUrl)}
                    aria-label={`Download ${buildStepSubtitle(step)} ${printable.label || ''}`.trim()}
                    sx={{
                      mt: 'auto',
                      alignSelf: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontFamily: 'Quicksand, sans-serif',
                      backgroundColor: themeColors.btnYellow,
                      color: '#1f2937',
                      minWidth: 116,
                      borderRadius: '10px',
                      boxShadow: 'none',
                      '&:hover': {
                        backgroundColor: '#d99b00',
                        boxShadow: 'none',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: themeColors.bgTertiary,
                        color: themeColors.textMuted,
                      },
                    }}
                  >
                    Download
                  </Button>
                  </Stack>
                </Box>
              ))}
            </Box>
          ) : (
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  color: themeColors.textMuted,
                }}
              >
                {isLocked ? 'Locked (coming soon)' : downloadUrl ? 'Printable available' : 'Not uploaded yet'}
              </Typography>

              <Button
                variant="contained"
                size="small"
                onClick={() => onDownload(downloadUrl)}
                disabled={!downloadUrl}
                aria-label={`Download ${buildStepSubtitle(step)}`.trim()}
                sx={{
                  mt: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontFamily: 'Quicksand, sans-serif',
                  backgroundColor: themeColors.btnYellow,
                  color: '#1f2937',
                  minWidth: 116,
                  borderRadius: '10px',
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: '#d99b00',
                    boxShadow: 'none',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: themeColors.bgTertiary,
                    color: themeColors.textMuted,
                  },
                }}
              >
                Download
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ProgramMaterialsStepCard;
