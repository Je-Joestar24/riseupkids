import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon } from '@mui/icons-material';
import ContentAddModal from '../activity/ContentAddModal';

/**
 * CourseContentDrawer Component
 *
 * Drawer that slides in from the right to create new content
 * Reuses ContentAddModal component for the form
 * Automatically detects and uses the current content type from parent
 */
const CourseContentDrawer = ({ open, onClose, contentType, onContentCreated }) => {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(open);

  // Sync drawer state with prop
  useEffect(() => {
    setDrawerOpen(open);
  }, [open]);

  const handleClose = () => {
    setDrawerOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const handleContentCreated = (createdContent, contentType) => {
    // Close drawer after successful creation
    handleClose();
    // Notify parent that content was created with the created content data
    if (onContentCreated) {
      onContentCreated(createdContent, contentType);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '600px', md: '700px' },
          maxWidth: '90vw',
          backgroundColor: theme.palette.background.paper,
        },
      }}
      ModalProps={{
        // Use MUI's z-index system - drawer default is 1200, but we need it above modal (1300)
        // Setting to 1350 ensures it's above modal but popovers (1300) will still work via portal
        style: { zIndex: 1300 },
      }}
      SlideProps={{
        // Smooth slide animation
        direction: 'left',
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 2.5,
            borderBottom: `1px solid ${theme.palette.border.main}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: theme.palette.text.primary,
            }}
          >
            Create New Content
          </Typography>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Content Creation Form - Reuse ContentAddModal without Dialog wrapper */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            padding: 0,
          }}
        >
          <ContentAddModal
            open={true} // Always open when drawer is open
            onClose={handleClose}
            onSuccess={handleContentCreated}
            // Pass the current content type so it auto-selects in the form
            initialContentType={contentType}
            renderAsDrawer={true} // Flag to render without Dialog wrapper
          />
        </Box>
      </Box>
    </Drawer>
  );
};

export default CourseContentDrawer;

