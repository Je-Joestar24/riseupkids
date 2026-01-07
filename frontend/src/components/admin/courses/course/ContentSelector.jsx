import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Checkbox,
  FormControlLabel,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon, Image as ImageIcon, Add as AddIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';

/**
 * ContentSelector Component
 *
 * Modular component for selecting existing content items to add to a course
 * Supports multi-select across different content types
 * Includes button to create new content in a drawer
 */
const ContentSelector = ({ selectedContents = [], onSelectionChange, onCreateContentClick, onContentCreated }) => {
  const theme = useTheme();
  const { fetchContents, allContentItems, loading, CONTENT_TYPES: CONTENT_TYPES_CONST } = useContent();

  const [contentType, setContentType] = useState(CONTENT_TYPES.ACTIVITY);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(new Set());
  const [localContentItems, setLocalContentItems] = useState([]);
  // Store full item data for selected items (key: contentId-contentType, value: full item)
  const [selectedItemsData, setSelectedItemsData] = useState(new Map());

  // Map backend content type to frontend format for lookup
  const mapBackendTypeToFrontend = (backendType) => {
    const mapping = {
      'activity': CONTENT_TYPES.ACTIVITY,
      'book': CONTENT_TYPES.BOOK,
      'video': CONTENT_TYPES.VIDEO,
      'audioAssignment': CONTENT_TYPES.AUDIO_ASSIGNMENT,
    };
    return mapping[backendType] || backendType;
  };

  // Initialize local selected from props
  useEffect(() => {
    const selectedSet = new Set();
    const selectedDataMap = new Map();
    selectedContents.forEach((item) => {
      // Map backend type to frontend for key
      const frontendType = mapBackendTypeToFrontend(item.contentType);
      const key = `${item.contentId}-${frontendType}`;
      selectedSet.add(key);
      // Store full item data if available
      if (item.title || item.coverImage || item.thumbnail) {
        selectedDataMap.set(key, item);
      }
    });
    setLocalSelected(selectedSet);
    setSelectedItemsData(selectedDataMap);
  }, [selectedContents]);

  // Fetch content when type changes and store directly in local state
  const fetchContent = async () => {
    try {
      const result = await fetchContents(contentType, { limit: 50, isPublished: true });
      // Extract items from result (result has { contentType, response } structure)
      // response has { success, data, pagination } structure
      let items = [];
      if (result?.response?.data) {
        items = Array.isArray(result.response.data) ? result.response.data : [];
      } else if (result?.data) {
        // Fallback: direct data property (if response structure is different)
        items = Array.isArray(result.data) ? result.data : [];
      }
      // Ensure each item has _contentType for identification
      items = items.map(item => ({ ...item, _contentType: contentType }));
      setLocalContentItems(items);
    } catch (error) {
      console.error('Error fetching content:', error);
      setLocalContentItems([]);
    }
  };

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  // Refresh content when new content is created (onContentCreated changes)
  useEffect(() => {
    // Trigger refresh when onContentCreated changes (it's a number that increments)
    // This happens when content is created via the drawer
    if (onContentCreated !== undefined && onContentCreated !== null && onContentCreated > 0) {
      // Refetch current content type to show newly created content
      fetchContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onContentCreated]);

  const handleContentTypeChange = (newType) => {
    setContentType(newType);
    setSearchQuery('');
  };

  // Map frontend content type to backend format
  const mapContentTypeToBackend = (frontendType) => {
    const mapping = {
      [CONTENT_TYPES.ACTIVITY]: 'activity',
      [CONTENT_TYPES.BOOK]: 'book',
      [CONTENT_TYPES.VIDEO]: 'video',
      [CONTENT_TYPES.AUDIO_ASSIGNMENT]: 'audioAssignment',
    };
    return mapping[frontendType] || frontendType;
  };

  const handleToggleSelect = (item) => {
    const contentId = item._id;
    const contentType = item._contentType;
    const key = `${contentId}-${contentType}`;
    const newSelected = new Set(localSelected);
    const newSelectedItemsData = new Map(selectedItemsData);

    if (newSelected.has(key)) {
      // Remove
      newSelected.delete(key);
      newSelectedItemsData.delete(key);
    } else {
      // Add
      newSelected.add(key);
      // Store full item data
      newSelectedItemsData.set(key, item);
    }

    setLocalSelected(newSelected);
    setSelectedItemsData(newSelectedItemsData);

    // Convert Set to array format for parent with full item data
    const selectedArray = Array.from(newSelected).map((key) => {
      const [id, type] = key.split('-');
      // Get stored full item data
      const fullItem = newSelectedItemsData.get(key);
      return {
        contentId: id,
        contentType: mapContentTypeToBackend(type),
        // Include full item data for display
        ...fullItem,
        _id: id,
        _contentType: type,
      };
    });

    onSelectionChange(selectedArray);
  };

  const handleRemoveSelected = (contentId, contentType) => {
    const frontendType = mapBackendTypeToFrontend(contentType);
    const key = `${contentId}-${frontendType}`;
    const newSelected = new Set(localSelected);
    const newSelectedItemsData = new Map(selectedItemsData);
    
    newSelected.delete(key);
    newSelectedItemsData.delete(key);
    
    setLocalSelected(newSelected);
    setSelectedItemsData(newSelectedItemsData);

    // Convert Set to array format for parent with full item data
    const selectedArray = Array.from(newSelected).map((key) => {
      const [id, type] = key.split('-');
      // Get stored full item data
      const fullItem = newSelectedItemsData.get(key);
      return {
        contentId: id,
        contentType: mapContentTypeToBackend(type),
        // Include full item data for display
        ...fullItem,
        _id: id,
        _contentType: type,
      };
    });

    onSelectionChange(selectedArray);
  };

  // Filter content items by search query
  const filteredItems = localContentItems.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  // Get selected items for display
  // Note: We show selected items even if they're not in current localContentItems
  const selectedItems = selectedContents.map((item) => {
    const frontendType = mapBackendTypeToFrontend(item.contentType);
    // First try to find in localContentItems (current view)
    let contentItem = localContentItems.find(
      (c) => c._id === item.contentId && c._contentType === frontendType
    );
    // If not found, try allContentItems (might be from previous fetches)
    if (!contentItem) {
      contentItem = allContentItems.find(
        (c) => c._id === item.contentId && c._contentType === frontendType
      );
    }
    // If still not found, return basic info from selectedContents
    return contentItem ? { ...item, ...contentItem } : { ...item, _contentType: frontendType };
  }).filter(Boolean);

  const getContentTypeLabel = (type) => {
    const labels = {
      [CONTENT_TYPES.ACTIVITY]: 'Activity',
      [CONTENT_TYPES.BOOK]: 'Book',
      [CONTENT_TYPES.VIDEO]: 'Video',
      [CONTENT_TYPES.AUDIO_ASSIGNMENT]: 'Audio Assignment',
    };
    return labels[type] || type;
  };

  const getCoverImageUrl = (item) => {
    if (!item) return null;
    const coverImage = item.coverImage || item.thumbnail;
    if (!coverImage) return null;
    if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
      return coverImage;
    }
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${coverImage.startsWith('/') ? coverImage : `/${coverImage}`}`;
  };

  // Get stars value for content item
  const getStarsValue = (item) => {
    const type = item._contentType || contentType;
    // Books use totalStarsAwarded, others use starsAwarded
    if (type === CONTENT_TYPES.BOOK) {
      return item.totalStarsAwarded || item.starsAwarded || 0;
    }
    return item.starsAwarded || 0;
  };

  return (
    <Box>
      {/* Content Type Selector and Search */}
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ fontFamily: 'Quicksand, sans-serif' }}>Content Type</InputLabel>
          <Select
            value={contentType}
            label="Content Type"
            onChange={(e) => handleContentTypeChange(e.target.value)}
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            }}
          >
            <MenuItem value={CONTENT_TYPES.ACTIVITY}>Activities</MenuItem>
            <MenuItem value={CONTENT_TYPES.BOOK}>Books</MenuItem>
            <MenuItem value={CONTENT_TYPES.VIDEO}>Videos</MenuItem>
            <MenuItem value={CONTENT_TYPES.AUDIO_ASSIGNMENT}>Audio Assignments</MenuItem>
          </Select>
        </FormControl>

        <TextField
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{
            flex: 1,
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              fontFamily: 'Quicksand, sans-serif',
              borderRadius: '8px',
              backgroundColor: theme.palette.custom.bgSecondary,
            },
          }}
        />

        {/* Create Content Button */}
        {onCreateContentClick && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => onCreateContentClick(contentType)}
            sx={{
              backgroundColor: theme.palette.orange.main,
              color: theme.palette.textCustom.inverse,
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              borderRadius: '8px',
              textTransform: 'none',
              paddingX: 2.5,
              paddingY: 1,
              whiteSpace: 'nowrap',
              '&:hover': {
                backgroundColor: theme.palette.orange.dark,
              },
            }}
          >
            Create Content
          </Button>
        )}
      </Box>

      {/* Selected Items Display */}
      {selectedItems.length > 0 && (
        <Paper
          sx={{
            padding: 2,
            marginBottom: 2,
            borderRadius: '8px',
            backgroundColor: theme.palette.custom.bgSecondary,
            border: `1px solid ${theme.palette.border.main}`,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 600,
              marginBottom: 1.5,
            }}
          >
            Selected Content ({selectedItems.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedItems.map((item) => (
              <Chip
                key={`${item.contentId}-${item.contentType}`}
                label={`${getContentTypeLabel(item._contentType || item.contentType)}: ${item.title || 'Untitled'}`}
                onDelete={() => handleRemoveSelected(item.contentId, item._contentType || item.contentType)}
                sx={{
                  fontFamily: 'Quicksand, sans-serif',
                  backgroundColor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Content Items Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Paper
          sx={{
            padding: 3,
            textAlign: 'center',
            borderRadius: '8px',
            backgroundColor: theme.palette.custom.bgSecondary,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: theme.palette.text.secondary,
            }}
          >
            {searchQuery ? 'No content found matching your search' : `No ${getContentTypeLabel(contentType).toLowerCase()}s available`}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredItems.map((item) => {
            const key = `${item._id}-${item._contentType}`;
            const isSelected = localSelected.has(key);
            const coverImageUrl = getCoverImageUrl(item);

            const starsValue = getStarsValue(item);

            return (
              <Grid item xs={6} sm={4} md={3} key={item._id}>
                <Card
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: isSelected
                      ? `2px solid ${theme.palette.primary.main}`
                      : `1px solid ${theme.palette.border.main}`,
                    borderRadius: '0px',
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={() => handleToggleSelect(item)}
                >
                  {/* Cover Image - Always Square */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '100%', // Creates perfect square (1:1 aspect ratio)
                      overflow: 'hidden',
                      backgroundColor: theme.palette.custom.bgSecondary,
                    }}
                  >
                    {coverImageUrl ? (
                      <Box
                        component="img"
                        src={coverImageUrl}
                        alt={item.title || 'Content'}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.palette.custom.bgSecondary,
                        }}
                      >
                        <ImageIcon
                          sx={{
                            fontSize: 32,
                            color: theme.palette.text.disabled,
                          }}
                        />
                      </Box>
                    )}

                    {/* Stars Badge - Upper left corner */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={`⭐ ${starsValue}`}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.orange.main}ff`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 600,
                          fontSize: '1.125rem', // 25% smaller than doubled (1.5rem * 0.75)
                          height: 36, // 25% smaller than doubled (48 * 0.75)
                          '& .MuiChip-label': {
                            padding: '0 12px', // 25% smaller than doubled (16px * 0.75)
                          },
                        }}
                      />
                    </Box>

                    {/* Content Type Badge - Lower right corner */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        zIndex: 1,
                      }}
                    >
                      <Chip
                        label={getContentTypeLabel(item._contentType)}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.primary.main}ff`,
                          color: theme.palette.common.white,
                          fontFamily: 'Quicksand, sans-serif',
                          fontWeight: 500,
                          fontSize: '1.05rem', // 25% smaller than doubled (1.4rem * 0.75)
                          height: 33, // 25% smaller than doubled (44 * 0.75)
                          '& .MuiChip-label': {
                            padding: '0 9px', // 25% smaller than doubled (12px * 0.75)
                          },
                        }}
                      />
                    </Box>

                    {/* Selected Checkmark - Upper right corner */}
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          zIndex: 2,
                        }}
                      >
                        <CheckCircleIcon
                          sx={{
                            color: theme.palette.primary.main,
                            fontSize: 28,
                            backgroundColor: `${theme.palette.common.white}dd`,
                            borderRadius: '50%',
                            padding: 0.5,
                          }}
                        />
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ padding: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        fontWeight: 600,
                        fontSize: '1.125rem', // 25% smaller than doubled (1.5rem * 0.75)
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        color: theme.palette.text.primary,
                        minHeight: '3.375rem', // 25% smaller than doubled (4.5rem * 0.75)
                        lineHeight: 1.2,
                      }}
                    >
                      {item.title || 'Untitled'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default ContentSelector;

