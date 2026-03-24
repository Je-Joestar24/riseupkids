import React from 'react';
import { Box, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

import { themeColors } from '../../../config/themeColors';

const ProgramMaterialsHeader = ({ childName }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <DescriptionOutlinedIcon sx={{ color: themeColors.warning, fontSize: 26 }} />
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              color: themeColors.textInverse,
              fontSize: { xs: '1.4rem', md: '1.75rem' },
            }}
          >
            Materials
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              color: themeColors.textInverse,
              mt: 0.25,
            }}
          >
            Download each step page with one click.
          </Typography>
        </Box>
      </Box>

      {childName ? (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            color: themeColors.textInverse,
          }}
        >
          Child: <Box component="span" sx={{ fontWeight: 700 }}>{childName}</Box>
        </Typography>
      ) : null}
    </Box>
  );
};

export default ProgramMaterialsHeader;
