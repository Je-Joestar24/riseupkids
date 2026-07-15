import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import ModalHeader from './ModalHeader';
import ModalForm from './ModalForm';
import KidsWallConsentToggle from './KidsWallConsentToggle';

const CONFIRM_TEXT = 'DELETE';

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
  onUpdateKidsWallConsent,
  consentLoading,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleFormSubmit = async (formData) => {
    if (onSave) {
      await onSave(child._id, formData);
    }
  };

  const handleDeleteClick = () => {
    setDeletePassword('');
    setDeleteConfirmText('');
    setDeleteError('');
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password.');
      return;
    }
    if (deleteConfirmText.trim().toUpperCase() !== CONFIRM_TEXT) {
      setDeleteError(`Please type ${CONFIRM_TEXT} to confirm.`);
      return;
    }

    if (onDelete) {
      try {
        await onDelete(child._id, {
          password: deletePassword,
          confirmText: deleteConfirmText,
        });
        setShowDeleteConfirm(false);
      } catch (error) {
        setDeleteError(error?.message || error || 'Failed to delete child profile.');
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletePassword('');
    setDeleteConfirmText('');
    setDeleteError('');
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

          {onUpdateKidsWallConsent && (
            <Box sx={{ px: { xs: '20px', sm: '24px' }, pb: { xs: '20px', sm: '24px' } }}>
              <KidsWallConsentToggle
                child={child}
                consentLoading={consentLoading}
                onUpdateConsent={onUpdateKidsWallConsent}
              />
            </Box>
          )}

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
              Delete this child&apos;s profile
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
          Delete this child&apos;s profile?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontSize: { xs: '14px', sm: '16px' },
              fontWeight: 500,
              color: themeColors.textSecondary,
              lineHeight: 1.6,
              mb: 2,
            }}
          >
            This will revoke access to{' '}
            <strong style={{ color: themeColors.text }}>{child.displayName || child.name}</strong>
            &apos;s profile immediately and request permanent deletion of their progress,
            recordings, and Kids Wall photos. Data is typically removed within 30 days.
          </Typography>

          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Your password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              fullWidth
              disabled={loading}
              autoComplete="current-password"
            />
            <TextField
              label={`Type ${CONFIRM_TEXT} to confirm`}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              fullWidth
              disabled={loading}
            />
          </Box>
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
            {loading ? 'Deleting…' : 'Delete profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChildEditModal;
