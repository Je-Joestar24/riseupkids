import React from 'react';
import { Box, Typography } from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import { phoneFluid } from '../../../constants/childPhoneLayout';

const PrintablesFooter = ({
  text = '💡 Tip: Print these pages and have fun completing them with crayons, markers, pencils, scissors, and glue!',
}) => {
  return (
    <Box
      sx={{
        mt: { xs: 3, sm: 4 },
        backgroundColor: '#ffffff',
        borderRadius: 3, // rounded corners
        boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
        p: { xs: phoneFluid(16, 24), sm: '24px' }, // 24px all sides (phones: a little less on small screens)
        textAlign: 'center',
      }}
    >
      <Typography
        sx={{
          fontFamily: 'Quicksand, sans-serif',
          fontSize: { xs: '1.05rem', sm: '1.15rem' },
          fontWeight: 700, // within 600-700 max
          color: themeColors.primary,
          lineHeight: 1.5,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
};

export default PrintablesFooter;

