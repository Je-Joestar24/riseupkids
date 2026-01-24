import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, CircularProgress, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { themeColors } from '../../../config/themeColors';
import ChildProgressModal from './ChildProgressModal';
import ChildEditModal from '../childmodal/ChildEditModal';
import ChildAddModal from '../childmodal/ChildAddModal';
import { useChildren } from '../../../hooks/childrenHook';

/**
 * ChildListProgress Component
 * 
 * Displays list of children with progress information
 * Each child has a "View Child Progress" button
 * Fully mobile responsive
 */
const ChildListProgress = ({ children: childrenProp, loading: loadingProp, onSelectChild, onViewProgress }) => {
  const theme = useTheme();
  const { updateChildData, deleteChildData, createNewChild, loading: childrenLoading, fetchChildren, children: reduxChildren } = useChildren();
  
  // Use Redux children state for real-time updates, fallback to prop children
  const children = reduxChildren && reduxChildren.length > 0 ? reduxChildren : childrenProp;
  const loading = childrenLoading || loadingProp;
  
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [selectedChildName, setSelectedChildName] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [editChildId, setEditChildId] = useState(null);
  const [editChild, setEditChild] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Add child modal state
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleViewProgress = (childId) => {
    const child = children.find((c) => c._id === childId);
    setSelectedChildId(childId);
    setSelectedChildName(child?.displayName || child?.name || null);
    setModalOpen(true);
    if (onViewProgress) {
      onViewProgress(childId);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedChildId(null);
    setSelectedChildName(null);
  };

  const handleEditChild = (child) => {
    setEditChild(child);
    setEditChildId(child._id);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditChild(null);
    setEditChildId(null);
  };

  const handleSaveChild = async (childId, updateData) => {
    try {
      await updateChildData(childId, updateData);
      handleCloseEditModal();
      // Refresh children list with active filter
      setTimeout(() => {
        fetchChildren({ isActive: true });
      }, 300);
    } catch (error) {
      console.error('Error updating child:', error);
    }
  };

  const handleDeleteChild = async (childId) => {
    try {
      await deleteChildData(childId);
      handleCloseEditModal();
      // Refresh children list with active filter
      setTimeout(() => {
        fetchChildren({ isActive: true });
      }, 500);
    } catch (error) {
      console.error('Error deleting child:', error);
    }
  };

  // Add child handlers
  const handleOpenAddModal = () => {
    setAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
  };

  const handleAddChild = async (childData) => {
    try {
      await createNewChild(childData);
      handleCloseAddModal();
      // Refresh children list with active filter
      setTimeout(() => {
        fetchChildren({ isActive: true });
      }, 300);
    } catch (error) {
      console.error('Error adding child:', error);
    }
  };

  if (loading && children.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: { xs: '16px', sm: '20px' },
          backgroundColor: themeColors.bgCard,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 3 }}>
            <CircularProgress size={40} sx={{ color: themeColors.secondary }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (children.length === 0) {
    return (
      <>
        <Card
          sx={{
            borderRadius: { xs: '16px', sm: '20px' },
            backgroundColor: themeColors.bgCard,
            border: `1px solid ${themeColors.border}`,
          }}
        >
          <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: { xs: 2, sm: 3 } }}>
              <PeopleIcon
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  color: themeColors.secondary,
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  fontWeight: 700,
                  color: themeColors.secondary,
                }}
              >
                Your Children
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: { xs: 3, sm: 4 },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  color: themeColors.textSecondary,
                  textAlign: 'center',
                }}
              >
                No children found. Add your first child to get started!
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleOpenAddModal}
                aria-label="Add your first child"
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  textTransform: 'none',
                  backgroundColor: themeColors.secondary,
                  color: themeColors.textInverse,
                  borderRadius: { xs: '10px', sm: '12px' },
                  paddingX: { xs: '20px', sm: '24px' },
                  paddingY: { xs: '10px', sm: '12px' },
                  boxShadow: '0 2px 8px rgba(98, 202, 202, 0.2)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#4db5b5',
                    boxShadow: '0 4px 12px rgba(98, 202, 202, 0.3)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Add Your First Child
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Child Add Modal */}
        <ChildAddModal
          open={addModalOpen}
          onClose={handleCloseAddModal}
          loading={childrenLoading}
          onSave={handleAddChild}
        />
      </>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: { xs: '16px', sm: '20px' },
        backgroundColor: themeColors.bgCard,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <CardContent sx={{ padding: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                color: themeColors.secondary,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 700,
                color: themeColors.secondary,
              }}
            >
              Your Children
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenAddModal}
            aria-label="Add new child"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              textTransform: 'none',
              backgroundColor: themeColors.secondary,
              color: themeColors.textInverse,
              borderRadius: { xs: '8px', sm: '10px' },
              paddingX: { xs: '12px', sm: '16px' },
              paddingY: { xs: '6px', sm: '8px' },
              boxShadow: '0 2px 8px rgba(98, 202, 202, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#4db5b5',
                boxShadow: '0 4px 12px rgba(98, 202, 202, 0.3)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Add Child
          </Button>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 2, md: 2 }}>
          {children.map((child) => (
            <Grid item xs={12} sm={6} md={4} key={child._id}>
              <Card
                sx={{
                  borderRadius: { xs: '12px', sm: '16px' },
                  backgroundColor: themeColors.bgTertiary,
                  border: `1px solid ${themeColors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4],
                  },
                  position: 'relative',
                }}
                onClick={() => onSelectChild && onSelectChild(child._id)}
              >
                {/* Edit & Delete Icons */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: { xs: '8px', sm: '12px' },
                    right: { xs: '8px', sm: '12px' },
                    display: 'flex',
                    gap: '4px',
                    zIndex: 10,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChild(child);
                    }}
                    sx={{
                      backgroundColor: 'rgba(98, 202, 202, 0.1)',
                      color: themeColors.primary,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: themeColors.secondary,
                        color: 'white',
                      },
                    }}
                  >
                    <EditIcon sx={{ fontSize: '18px' }} />
                  </IconButton>
{/*                   <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChild(child);
                    }}
                    sx={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: themeColors.error,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: themeColors.error,
                        color: 'white',
                      },
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: '18px' }} />
                  </IconButton> */}
                </Box>

                <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      fontWeight: 700,
                      color: themeColors.text,
                      marginBottom: 1,
                      paddingRight: '60px',
                    }}
                  >
                    {child.displayName || child.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      color: themeColors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    {child.stats?.totalStars || 0} stars earned
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<TrendingUpIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProgress(child._id);
                    }}
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      textTransform: 'none',
                      backgroundColor: themeColors.secondary,
                      color: themeColors.textInverse,
                      borderRadius: { xs: '8px', sm: '12px' },
                      paddingY: { xs: '10px', sm: '12px' },
                      '&:hover': {
                        backgroundColor: themeColors.primary,
                      },
                    }}
                  >
                    View Child Progress
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </CardContent>

      {/* Child Progress Modal */}
      <ChildProgressModal
        open={modalOpen}
        onClose={handleCloseModal}
        childId={selectedChildId}
        childName={selectedChildName}
      />

      {/* Child Edit Modal */}
      <ChildEditModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        child={editChild}
        loading={childrenLoading}
        onSave={handleSaveChild}
        onDelete={handleDeleteChild}
      />

      {/* Child Add Modal */}
      <ChildAddModal
        open={addModalOpen}
        onClose={handleCloseAddModal}
        loading={childrenLoading}
        onSave={handleAddChild}
      />
    </Card>
  );
};

export default ChildListProgress;
