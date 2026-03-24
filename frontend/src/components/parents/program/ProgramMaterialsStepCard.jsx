import React from 'react';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

import { themeColors } from '../../../config/themeColors';

function buildStepTitle(step) {
  return step?.title || `Step ${step?.stepNumber || ''}`.trim();
}

const ProgramMaterialsStepCard = ({ step, onDownload }) => {
  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: `1px solid ${themeColors.border}`,
        boxShadow: 'none',
        backgroundColor: themeColors.bgCard,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1.5}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: themeColors.text,
              fontSize: { xs: '1.05rem', sm: '1.15rem' },
            }}
          >
            {buildStepTitle(step)}
          </Typography>

          {!step?.printables?.length ? (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 600,
                color: themeColors.textMuted,
              }}
            >
              No printable pages configured yet.
            </Typography>
          ) : (
            step.printables.map((printable) => (
              <Box
                key={printable.id || `${step.stepNumber}-${printable.pageNumber}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 0.75,
                  borderBottom: `1px solid ${themeColors.border}40`,
                  '&:last-of-type': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: 'Quicksand, sans-serif',
                    color: themeColors.text,
                    fontWeight: 600,
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  }}
                >
                  {printable.label || `Page ${printable.pageNumber}`}
                </Typography>

                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onDownload(printable.fileUrl)}
                  disabled={!printable.fileUrl}
                  aria-label={`Download ${buildStepTitle(step)} ${printable.label || ''}`.trim()}
                  sx={{
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
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ProgramMaterialsStepCard;
