import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ParentsNav from '../components/parents/comon/ParentsNav';
import { themeColors } from '../config/themeColors';
import ContactSupportCustomDialog from '../components/parents/contactsupport/ContactSupportCustomDialog';

/**
 * ParentsLayout Component
 * 
 * Layout wrapper for parent dashboard pages
 * Includes sticky navigation bar at the top
 */
const ParentsLayout = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: themeColors.bg,
      }}
    >
      {/* Sticky Navigation */}
      <ParentsNav />

      {/* Scrollable Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
        }}
      >
        {children}
      </Box>

      {/* Custom Dialog Box for Parents (Notifications & Confirmations) */}
      <ContactSupportCustomDialog />
    </Box>
  );
};

export default ParentsLayout;
