import React from 'react';
import { Box } from '@mui/material';
import bigLogo from '../../../assets/images/big-logo.png';

/**
 * AuthLogo Component
 * 
 * Displays the Rise Up Kids logo for authentication pages
 */
const ParentLoginLogo = () => {
  return (
    <Box className="auth-logo-container">
      <img 
        src={bigLogo} 
        alt="Rise Up Kids Logo" 
        className="auth-logo"
      />
    </Box>
  );
};

export default ParentLoginLogo;

