import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import ModalHeader from './ModalHeader';
import ModalForm from './ModalForm';

/**
 * ChildEditModal Component
 * 
 * Modal for editing and deleting child profiles
 * Includes confirmation dialog for delete action
 */
const ChildEditModal = ({
  open,
  onClose,
  child,
  loading,
  onSave,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFormSubmit = async (formData) => {
    if (onSave) {
      await onSave(child._id, formData);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete(child._id);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!child) return null;

  return (
    <>
      {/* Edit Modal */}
      <Dialog
        open={open && !showDeleteConfirm}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: '16px', sm: '20px' },
            backgroundColor: themeColors.bgCard,
            backgroundImage: 'linear-gradient(in oklab, rgb(255, 255, 255) 0%, rgb(248, 250, 252) 100%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {/* Header */}
        <ModalHeader childName={child.displayName || child.name} onClose={onClose} />

        {/* Form Content */}
        <DialogContent sx={{ padding: 0 }}>
          <ModalForm
            child={child}
            loading={loading}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
          />

          {/* Delete Section */}
          <Box
            sx={{
              padding: { xs: '16px 20px', sm: '20px 24px' },
              borderTop: `1px solid ${themeColors.border}`,
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '14px', sm: '16px' },
                fontWeight: 600,
                color: themeColors.error,
                marginBottom: { xs: '12px', sm: '14px' },
              }}
            >
              Danger Zone
            </Typography>
            <Button
              onClick={handleDeleteClick}
              disabled={loading}
              fullWidth
              startIcon={<DeleteIcon />}
              sx={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: themeColors.error,
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '14px', sm: '16px' },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '12px',
                padding: { xs: '12px 16px', sm: '14px 20px' },
                border: `2px solid ${themeColors.error}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  borderColor: themeColors.error,
                },
                '&:disabled': {
                  opacity: 0.6,
                },
              }}
            >
              Archive Child Profile
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: '16px', sm: '20px' },
            backgroundColor: themeColors.bgCard,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontSize: { xs: '1.125rem', sm: '1.375rem' },
            fontWeight: 700,
            color: themeColors.error,
            paddingBottom: { xs: '12px', sm: '16px' },
          }}
        >
          Archive Child Profile?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '14px', sm: '16px' },
              fontWeight: 500,
              color: themeColors.textSecondary,
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to archive{' '}
            <strong style={{ color: themeColors.text }}>{child.displayName || child.name}</strong>
            's profile? This action can be undone later.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            padding: { xs: '16px', sm: '20px' },
            gap: { xs: '10px', sm: '12px' },
          }}
        >
          <Button
            onClick={handleCancelDelete}
            disabled={loading}
            sx={{
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: themeColors.bgTertiary,
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={loading}
            sx={{
              backgroundColor: themeColors.error,
              color: 'white',
              fontFamily: 'Quicksand, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '10px',
              padding: '10px 20px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#dc2626',
              },
              '&:disabled': {
                opacity: 0.6,
              },
            }}
          >
            {loading ? 'Archiving...' : 'Archive Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChildEditModal;
