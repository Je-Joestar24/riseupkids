import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChildHeader from '../components/common/ChilHeader';
import ChildNavigation from '../components/common/ChildNavigation';
import { themeColors } from '../config/themeColors';

/**
 * ChildLayout Component
 * 
 * Layout wrapper for child interface pages
 * Includes sticky header and fixed bottom navigation
 * Default background color uses theme primary color
 */
const ChildLayout = ({ children, childId }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: themeColors.primary, // #62caca - theme primary color
      }}
    >
      {/* Sticky Header */}
      <ChildHeader />

      {/* Scrollable Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          paddingBottom: '100px', // Space for fixed bottom navigation (68px height + 32px padding)
        }}
      >
        {children}
      </Box>

      {/* Fixed Bottom Navigation */}
      <ChildNavigation childId={childId} />
    </Box>
  );
};

export default ChildLayout;
