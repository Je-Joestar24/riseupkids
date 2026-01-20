import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
} from '@mui/material';
import { themeColors } from '../../../config/themeColors';
import ContactSupportHeader from './ContactSupportHeader';
import ContactSupportTitle from './ContactSupportTitle';
import ContactSupportFrequentlyAsked from './ContactSupportFrequentlyAske';
import ContactUsForm from './ContactUsForm';
import ContactSupportFooter from './ContactSupportFooter';

/**
 * ContactSupportModal Component
 * 
 * Modal displaying contact support information:
 * - Title with gradient background
 * - Frequently Asked Questions
 * - Contact form
 * - Footer with contact info
 * 
 * Features:
 * - Glassy backdrop
 * - Solid container
 * - Mobile responsive
 * - No scrollbar (hidden)
 */
const ContactSupportModal = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: { xs: '20px', sm: '24px' },
          backgroundColor: themeColors.bgCard,
          maxWidth: '672px',
          width: '100%',
          backgroundImage: 'linear-gradient(in oklab, rgb(212, 230, 227) 0%, rgb(255, 254, 253) 100%)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
      }}
    >
      {/* Header */}
      <ContactSupportHeader onClose={onClose} />

      <DialogContent
        sx={{
          padding: { xs: '24px', sm: '24px' },
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Title Section */}
          <ContactSupportTitle />

          {/* Frequently Asked Questions */}
          <ContactSupportFrequentlyAsked />

          {/* Contact Form */}
          <ContactUsForm onSuccess={onClose} />

          {/* Footer */}
          <ContactSupportFooter />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ContactSupportModal;
