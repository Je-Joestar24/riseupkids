import React, { useState } from 'react';
import { Box } from '@mui/material';
import AccountSettingsHeader from './AccountSettingsHeader';
import AccountSettingsNavigation from './AccountSettingsNavigation';
import ProfileSettingsInformation from './ProfileSettingsInformation';

/**
 * AccountSettingsModal Component
 * 
 * Modal for account settings with tabs for Profile, Language, Subscription
 * Currently implements Profile tab with account information form
 * 
 * Features:
 * - Gradient header matching theme
 * - Tab navigation
 * - Glassy backdrop with blur
 * - Mobile responsive
 * - Same layout as ProgressModal and ContactSupportModal
 */
const AccountSettingsModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState('Profile');

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: { xs: '16px', sm: '24px' },
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          maxHeight: '90vh',
          overflow: 'hidden',
          maxWidth: '672px',
          width: '100%',
          backgroundImage: 'linear-gradient(in oklab, rgb(212, 230, 227) 0%, rgb(255, 254, 253) 100%)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <AccountSettingsHeader onClose={onClose} />

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: { xs: '20px', sm: '24px' },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: '20px', sm: '24px' } }}>
            {/* Navigation Tabs */}
            <AccountSettingsNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'Profile' && <ProfileSettingsInformation />}
            {activeTab === 'Language' && (
              <Box sx={{ textAlign: 'center', padding: '40px 20px' }}>
                Language settings coming soon...
              </Box>
            )}
            {activeTab === 'Subscription' && (
              <Box sx={{ textAlign: 'center', padding: '40px 20px' }}>
                Subscription settings coming soon...
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountSettingsModal;
