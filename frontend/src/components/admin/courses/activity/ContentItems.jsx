import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Description as DescriptionIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { useAuth } from '../../../../hooks/userHook';
import { canManageContent } from '../../../../utils/contentOwnership';
import { BOOK_PACKAGE_TYPES, CONTENT_TYPES } from '../../../../services/contentService';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import ContentEditModal from './ContentEditModl';
import AdminTestHtmlModal from '../../common/AdminTestHtmlModal';
import AdminVideoTester from '../../common/AdminVideoTester';
import CmsBooksModalTest from '../../common/CmsBooksModalTest';
import useHtml5 from '../../../../hooks/html5Hook';
import useCmsBookPlayer from '../../../../hooks/cmsBookPlayer';
import { showConfirmationDialog } from '../../../../store/slices/uiSlice';
import cmsBookAdminService from '../../../../services/cmsBookAdminService';

/**
 * ContentItems Component
 *
 * Displays list of content items (currently activities/books/videos/audio)
 * Cards are perfect squares on top, no border radius, matching child-friendly layout.
 */
const ContentItems = ({ loading, onRefresh }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const {
    contentItems,
    archiveContentData,
    restoreContentData,
    deleteContentData,
    filters,
  } = useContent();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState(CONTENT_TYPES.ACTIVITY);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [videoTestItem, setVideoTestItem] = useState(null);
  const [cmsTestModalOpen, setCmsTestModalOpen] = useState(false);
  const [cmsTestPages, setCmsTestPages] = useState([]);
  const { openTestHtml5, modalProps: html5ModalProps, canTestHtml5 } = useHtml5();
  const {
    loadPlayableBookById,
    preloadBookMedia,
    clearPreloadState,
    preloadProgress,
    preloadSummary,
    loading: cmsPlayerLoading,
  } = useCmsBookPlayer();

  const resolveMediaUrl = useCallback((maybeUrl) => {
    if (!maybeUrl) return '';
    if (typeof maybeUrl !== 'string') return '';
    // Full transition to S3/CloudFront: accept absolute URLs as-is.
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    // Backward compatibility: older records store relative paths from backend.
    return `${BACKEND_BASE_URL}${maybeUrl}`;
  }, []);

  const resolvedMenuType = useMemo(() => {
    if (!selectedItem) return null;
    return selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
  }, [selectedItem, filters.contentType]);

  const isScormItem = useCallback((type, item) => {
    // Content types that still rely on SCORM in this admin UI.
    if (type === CONTENT_TYPES.ACTIVITY) return true;
    if (type === CONTENT_TYPES.BOOK && item?.packageType === BOOK_PACKAGE_TYPES.SCORM) return true;
    return false;
  }, []);

  const canShowTest = useCallback(
    (type, item) => !isScormItem(type, item) && canTestHtml5(type, item),
    [canTestHtml5, isScormItem]
  );

  const canShowBuiltinTest = useCallback(
    (type, item) =>
      type === CONTENT_TYPES.BOOK &&
      item?.packageType === BOOK_PACKAGE_TYPES.BUILTIN &&
      Boolean(item?.cmsBookId || item?.cmsBook?._id),
    []
  );

  const canShowVideoTest = useCallback(
    (type, item) => {
      if (type !== CONTENT_TYPES.VIDEO || !item) return false;
      return Boolean(item.embedUrl || item.cloudUrl || item.url || item.videoFileUrl || item.videoFile?.url || item.filePath);
    },
    []
  );

  const canPreviewItem = useCallback(
    (type, item) =>
      canShowVideoTest(type, item) ||
      canShowTest(type, item) ||
      canShowBuiltinTest(type, item),
    [canShowBuiltinTest, canShowTest, canShowVideoTest]
  );

  const handleTestClick = useCallback(
    async (item) => {
      const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
      if (canShowVideoTest(type, item)) {
        setVideoTestItem(item);
        return;
      }
      if (canShowBuiltinTest(type, item)) {
        const cmsBookId =
          (typeof item?.cmsBookId === 'string' && item.cmsBookId) ||
          item?.cmsBookId?._id ||
          item?.cmsBook?._id;
        if (!cmsBookId) return;
        try {
          clearPreloadState();
          let pages = [];
          let playableBook = null;
          try {
            const playableResponse = await loadPlayableBookById(cmsBookId);
            playableBook = playableResponse?.data || null;
            pages = Array.isArray(playableBook?.pages) ? playableBook.pages : [];
          } catch (_playableError) {
            const response = await cmsBookAdminService.getBookById(cmsBookId);
            pages = Array.isArray(response?.data?.pages) ? response.data.pages : [];
          }
          setCmsTestPages(pages);
          const preloadPromise = pages.length > 0
            ? preloadBookMedia({ bookId: cmsBookId, pages, book: playableBook })
            : null;
          setCmsTestModalOpen(true);
          if (preloadPromise) {
            await preloadPromise;
          }
        } catch (error) {
          console.error('Failed to load built-in CMS book for testing:', error);
        }
        return;
      }
      if (isScormItem(type, item)) return;
      if (canTestHtml5(type, item)) {
        openTestHtml5(item, type);
      }
    },
    [filters.contentType, canShowVideoTest, canShowBuiltinTest, isScormItem, canTestHtml5, openTestHtml5]
  );

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      setSelectedContentId(selectedItem._id);
      setSelectedContentType(selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY);
      setEditModalOpen(true);
    }
    handleMenuClose();
  };

  const handleTestHtml5 = () => {
    if (selectedItem) {
      const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
      openTestHtml5(selectedItem, type);
    }
    handleMenuClose();
  };

  const handleTestBuiltin = async () => {
    if (selectedItem) {
      await handleTestClick(selectedItem);
    }
    handleMenuClose();
  };

  const handleTestVideo = () => {
    if (selectedItem) {
      setVideoTestItem(selectedItem);
    }
    handleMenuClose();
  };

  const handleArchive = async () => {
    if (selectedItem) {
      try {
        const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY || type === CONTENT_TYPES.BOOK) {
          await archiveContentData(type, selectedItem._id);
        }
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error archiving content:', error);
      }
    }
    handleMenuClose();
  };

  const handleRestore = async () => {
    if (selectedItem) {
      try {
        const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        if (type === CONTENT_TYPES.ACTIVITY || type === CONTENT_TYPES.BOOK) {
          await restoreContentData(type, selectedItem._id);
        }
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error restoring content:', error);
      }
    }
    handleMenuClose();
  };

  const handleDeletePermanent = async () => {
    if (selectedItem) {
      try {
        const type = selectedItem._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
        await deleteContentData(type, selectedItem._id);
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error('Error deleting content permanently:', error);
      }
    }
    handleMenuClose();
  };

  const handleArchiveWithConfirm = () => {
    if (!selectedItem) return;
    const item = selectedItem;
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    handleMenuClose();
    dispatch(
      showConfirmationDialog({
        title: 'Archive Content?',
        message: `Are you sure you want to archive "${item.title || 'this content'}"? You can restore it later.`,
        type: 'warning',
        confirmText: 'Archive',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            await archiveContentData(type, item._id);
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Error archiving content:', error);
          }
        },
      })
    );
  };

  const handleDeleteWithConfirm = () => {
    if (!selectedItem) return;
    const item = selectedItem;
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    handleMenuClose();
    dispatch(
      showConfirmationDialog({
        title: 'Delete Permanently?',
        message: `This will permanently delete "${item.title || 'this content'}" and cannot be undone. Continue?`,
        type: 'error',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            await deleteContentData(type, item._id);
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Error deleting content permanently:', error);
          }
        },
      })
    );
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedContentId(null);
    if (onRefresh) onRefresh();
  };

  const getTypeBadge = (item) => {
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    switch (type) {
      case CONTENT_TYPES.BOOK:
        return '📚 Book';
      case CONTENT_TYPES.VIDEO:
        return '🎥 Video';
      case CONTENT_TYPES.AUDIO_ASSIGNMENT:
        return '🎤 Audio';
      case CONTENT_TYPES.CHANT:
        return '🎵 Chant';
      case CONTENT_TYPES.ACTIVITY:
      default:
        return '⭐ Activity';
    }
  };

  const getStarsValue = (item) => {
    const type = item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY;
    // Books use totalStarsAwarded, others use starsAwarded
    if (type === CONTENT_TYPES.BOOK) {
      return item.totalStarsAwarded || 0;
    }
    return item.starsAwarded || 0;
  };

  const getBookPackageMeta = (item) => {
    if ((item?._contentType || filters.contentType) !== CONTENT_TYPES.BOOK) return null;
    const packageType = item?.packageType || BOOK_PACKAGE_TYPES.HTML5;
    if (packageType === BOOK_PACKAGE_TYPES.BUILTIN) return 'Built-in';
    if (packageType === BOOK_PACKAGE_TYPES.HTML5) return 'HTML5';
    return 'Legacy SCORM';
  };

  const supportsArchive = (type) => type === CONTENT_TYPES.ACTIVITY || type === CONTENT_TYPES.BOOK;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!contentItems || contentItems.length === 0) {
    return (
      <Paper
        sx={{
          padding: 4,
          textAlign: 'center',
          borderRadius: '12px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
          }}
        >
          No contents found
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            color: theme.palette.text.secondary,
            marginTop: 1,
          }}
        >
          Create your first content item to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {contentItems.map((item) => (
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={item._id}>
          {/*
            Card clicks launch supported previews where available; menu remains separate.
          */}
          <Card
            sx={{
              borderRadius: '0px',
              border: `1px solid ${theme.palette.border.main}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: theme.shadows[4],
                transform: 'translateY(-4px)',
              },
            }}
          >
            {/* Action Menu Button */}
            <IconButton
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                backgroundColor: theme.palette.background.paper,
                opacity: 0.9,
                '&:hover': {
                  backgroundColor: theme.palette.custom.bgTertiary,
                  opacity: 1,
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e, item);
              }}
              aria-label="Content actions"
            >
              <MoreVertIcon />
            </IconButton>

            <CardActionArea
              onClick={() => handleTestClick(item)}
              disabled={
                !canPreviewItem(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item)
              }
              sx={{
                cursor:
                  canPreviewItem(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item)
                    ? 'pointer'
                    : 'default',
              }}
              aria-label={
                canShowVideoTest(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item)
                  ? `Test video playback for ${item.title}`
                  : canShowBuiltinTest(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item)
                  ? `Preview built-in book ${item.title}`
                  : canShowTest(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item)
                    ? `Test HTML5 for ${item.title}`
                    : `${item.title}`
              }
            >
              {/* Cover / Placeholder - full width square */}
              {item.coverImage ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    component="img"
                    src={resolveMediaUrl(item.coverImage)}
                    alt={item.title}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Type Badge - Upper left */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label={getTypeBadge(item)}
                      size="small"
                      sx={{
                        backgroundColor: `${theme.palette.orange.main}e0`,
                        color: theme.palette.textCustom.inverse || theme.palette.common.white,
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                  </Box>
                  {getBookPackageMeta(item) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 104,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={getBookPackageMeta(item)}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.primary.main}d9`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                  )}
                  {/* Published/Draft Badge - Lower right */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label={item.isPublished ? 'Published' : 'Draft'}
                      size="small"
                      sx={{
                        backgroundColor: item.isPublished
                          ? `${theme.palette.success.main}e0`
                          : `${theme.palette.grey[600]}e0`,
                        color: theme.palette.textCustom.inverse || theme.palette.common.white,
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 500,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                  </Box>
                  {/* Stars badge - Lower left */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      zIndex: 1,
                      display: 'flex',
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Chip
                      label={`⭐ ${getStarsValue(item)}`}
                      size="small"
                      sx={{
                        backgroundColor: `${theme.palette.primary.main}e0`,
                        color: theme.palette.textCustom.inverse || theme.palette.common.white,
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                    {canPreviewItem(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item) && (
                      <Chip
                        icon={<PlayArrowIcon sx={{ color: theme.palette.common.white }} />}
                        label={
                          canShowVideoTest(
                            item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY,
                            item
                          )
                            ? 'Test video'
                            : canShowBuiltinTest(
                            item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY,
                            item
                          )
                            ? 'Preview'
                            : 'Test'
                        }
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.success.main}e0`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    paddingTop: '100%',
                    position: 'relative',
                    backgroundColor: theme.palette.custom.bgSecondary || theme.palette.grey[100],
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 48, color: theme.palette.orange.main }} />
                  </Box>
                  {/* Type Badge - Upper left */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label={getTypeBadge(item)}
                      size="small"
                      sx={{
                        backgroundColor: `${theme.palette.orange.main}e0`,
                        color: theme.palette.textCustom.inverse || theme.palette.common.white,
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                  </Box>
                  {getBookPackageMeta(item) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 104,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={getBookPackageMeta(item)}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.primary.main}d9`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                        }}
                      />
                    </Box>
                  )}
                  {/* Published/Draft Badge - Lower right */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      zIndex: 1,
                    }}
                  >
                    <Chip
                      label={item.isPublished ? 'Published' : 'Draft'}
                      size="small"
                      sx={{
                        backgroundColor: item.isPublished
                          ? `${theme.palette.success.main}e0`
                          : `${theme.palette.grey[600]}e0`,
                        color: theme.palette.textCustom.inverse || theme.palette.common.white,
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 500,
                        backdropFilter: 'blur(4px)',
                      }}
                    />
                  </Box>
                  {/* Preview/test badge for HTML5 and built-in CMS books */}
                  {canPreviewItem(item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY, item) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        icon={<PlayArrowIcon sx={{ color: theme.palette.common.white }} />}
                        label={
                          canShowVideoTest(
                            item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY,
                            item
                          )
                            ? 'Test video'
                            : canShowBuiltinTest(
                            item._contentType || filters.contentType || CONTENT_TYPES.ACTIVITY,
                            item
                          )
                            ? 'Preview'
                            : 'Test'
                        }
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.success.main}e0`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              <CardContent sx={{ flexGrow: 1, padding: 2.5 }}>
                <Stack spacing={2}>
                  {/* Title */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'Quicksand, sans-serif',
                      fontWeight: 600,
                      fontSize: '1.125rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.title}
                  </Typography>

                  {/* Description */}
                  {item.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: theme.palette.text.secondary,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            fontFamily: 'Quicksand, sans-serif',
            minWidth: 150,
          },
        }}
      >
        {selectedItem && resolvedMenuType && canShowVideoTest(resolvedMenuType, selectedItem) && (
          <MenuItem
            onClick={handleTestVideo}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.success.main,
            }}
          >
            <PlayArrowIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Test Video
          </MenuItem>
        )}
        {selectedItem && resolvedMenuType && canShowBuiltinTest(resolvedMenuType, selectedItem) && (
          <MenuItem
            onClick={handleTestBuiltin}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.success.main,
            }}
          >
            <PlayArrowIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Preview Built-in Book
          </MenuItem>
        )}
        {selectedItem && resolvedMenuType && canTestHtml5(resolvedMenuType, selectedItem) && (
          <MenuItem
            onClick={handleTestHtml5}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.success.main,
            }}
          >
            <PlayArrowIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Test HTML5
          </MenuItem>
        )}
        {canManageContent(selectedItem, user) ? (
          <MenuItem
            onClick={handleEdit}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
            }}
          >
            <EditIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Edit
          </MenuItem>
        ) : null}
        {canManageContent(selectedItem, user) && selectedItem && supportsArchive(resolvedMenuType) ? (
          selectedItem?.isArchived ? (
            <>
              <MenuItem
                onClick={handleRestore}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.success.main,
                }}
              >
                <RestoreIcon sx={{ marginRight: 1, fontSize: 20 }} />
                Restore
              </MenuItem>
              <MenuItem
                onClick={handleDeleteWithConfirm}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  color: theme.palette.error.main,
                }}
              >
                <DeleteForeverIcon sx={{ marginRight: 1, fontSize: 20 }} />
                Delete Permanently
              </MenuItem>
            </>
          ) : (
            <MenuItem
              onClick={handleArchiveWithConfirm}
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: theme.palette.warning.main,
              }}
            >
              <ArchiveIcon sx={{ marginRight: 1, fontSize: 20 }} />
              Archive
            </MenuItem>
          )
        ) : canManageContent(selectedItem, user) ? (
          <MenuItem
            onClick={handleDeleteWithConfirm}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.error.main,
            }}
          >
            <DeleteForeverIcon sx={{ marginRight: 1, fontSize: 20 }} />
            Delete Permanently
          </MenuItem>
        ) : null}
      </Menu>

      {/* Unified Edit Modal */}
      <ContentEditModal
        open={editModalOpen}
        onClose={handleEditModalClose}
        contentId={selectedContentId}
        contentType={selectedContentType}
        onSuccess={handleEditModalClose}
      />

      {/* HTML5 Test Modal (admin/teacher, books with packageType html5) */}
      <AdminTestHtmlModal {...html5ModalProps} />

      {/* Video Test Modal (uploaded video, Bunny embed, optional HTML5/CMS follow-up) */}
      <AdminVideoTester
        open={Boolean(videoTestItem)}
        onClose={() => setVideoTestItem(null)}
        video={videoTestItem}
      />

      {/* Built-in CMS Book Test Modal */}
      <CmsBooksModalTest
        open={cmsTestModalOpen}
        onClose={() => {
          setCmsTestModalOpen(false);
          setCmsTestPages([]);
          clearPreloadState();
        }}
        pages={cmsTestPages}
        isPreloading={Boolean(cmsPlayerLoading?.preload)}
        preloadProgress={preloadProgress}
        preloadSummary={preloadSummary}
      />
    </Grid>
  );
};

export default ContentItems;


