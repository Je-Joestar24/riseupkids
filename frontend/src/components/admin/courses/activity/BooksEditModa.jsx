import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Grid,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  InsertLink as InsertLinkIcon,
} from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES, BOOK_PACKAGE_TYPES } from '../../../../services/contentService';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import CMSBooksSelectRightDrawer from './CMSBooksSelectRightDrawer';
import BentoCoverImageField from './BentoCoverImageField';

/**
 * BookEditModal — edit book with the same bento layout as ContentAddModal book flow.
 */
const BookEditModal = ({ open, onClose, bookId, onSuccess }) => {
  const theme = useTheme();
  const packageInputRef = useRef(null);
  const {
    fetchContent,
    updateContentData,
    loading,
    currentContent,
    clearContent,
  } = useContent();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'en',
    readingLevel: 'beginner',
    estimatedReadingTime: null,
    requiredReadingCount: 5,
    starsPerReading: 10,
    totalStarsAwarded: 50,
    isPublished: false,
    cmsBookId: '',
    selectedCmsBook: null,
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [selectedPackageFile, setSelectedPackageFile] = useState(null);
  const [packageType, setPackageType] = useState('html5');
  const [cmsBooksDrawerOpen, setCmsBooksDrawerOpen] = useState(false);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  const paperSx = {
    p: 2,
    borderRadius: '14px',
    height: '100%',
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  };

  const bentoTitleSx = {
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 700,
    fontSize: '1.05rem',
    color: theme.palette.text.primary,
  };

  useEffect(() => {
    if (open && bookId) {
      const hasCorrectBook = currentContent && currentContent._id === bookId;
      const isDifferentBook = lastFetchedIdRef.current !== bookId;

      if (!hasCorrectBook && !isFetchingRef.current && isDifferentBook) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = bookId;
        fetchContent(CONTENT_TYPES.BOOK, bookId)
          .catch((error) => {
            console.error('Error fetching book:', error);
          })
          .finally(() => {
            isFetchingRef.current = false;
          });
      }
    } else if (!open) {
      setIsInitialized(false);
      isFetchingRef.current = false;
      lastFetchedIdRef.current = null;
      clearContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookId]);

  useEffect(() => {
    if (open && bookId && currentContent && currentContent._id === bookId && !isInitialized) {
      setFormData({
        title: currentContent.title || '',
        description: currentContent.description || '',
        language: currentContent.language || 'en',
        readingLevel: currentContent.readingLevel || 'beginner',
        estimatedReadingTime: currentContent.estimatedReadingTime || null,
        requiredReadingCount: currentContent.requiredReadingCount || 5,
        starsPerReading: currentContent.starsPerReading || 10,
        totalStarsAwarded: currentContent.totalStarsAwarded || 50,
        isPublished: currentContent.isPublished || false,
        cmsBookId: typeof currentContent.cmsBookId === 'object' ? currentContent.cmsBookId?._id || '' : currentContent.cmsBookId || '',
        selectedCmsBook: typeof currentContent.cmsBookId === 'object' ? currentContent.cmsBookId : null,
      });
      setPackageType(currentContent.packageType || 'html5');
      setCurrentCoverImage(currentContent.coverImage);
      setSelectedCoverImage(null);
      setSelectedPackageFile(null);
      setImagePreviewUrl(null);
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookId, currentContent?._id]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    if (file) {
      setSelectedCoverImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedCoverImage(null);
      setImagePreviewUrl(null);
    }
  };

  const clearCoverImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedCoverImage(null);
    setImagePreviewUrl(null);
  };

  const handlePackageFileChange = (fileList) => {
    const file = fileList?.[0] || null;
    setSelectedPackageFile(file);
  };

  const clearPackageFile = () => {
    setSelectedPackageFile(null);
    if (packageInputRef.current) {
      packageInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('language', formData.language);
      formDataToSend.append('readingLevel', formData.readingLevel);
      if (formData.estimatedReadingTime) {
        formDataToSend.append('estimatedReadingTime', formData.estimatedReadingTime);
      }
      formDataToSend.append('requiredReadingCount', formData.requiredReadingCount);
      formDataToSend.append('starsPerReading', formData.starsPerReading);
      formDataToSend.append('totalStarsAwarded', formData.totalStarsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);

      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      const bookMeta = {
        isBuiltinBook: packageType === BOOK_PACKAGE_TYPES.BUILTIN,
        isHtml5Book: packageType === BOOK_PACKAGE_TYPES.HTML5,
        isLegacyScormBook: packageType === BOOK_PACKAGE_TYPES.SCORM,
      };
      if (bookMeta.isBuiltinBook) {
        if (formData.cmsBookId) {
          formDataToSend.append('cmsBookId', formData.cmsBookId);
        }
      } else if (selectedPackageFile) {
        formDataToSend.append('scormFile', selectedPackageFile);
      }

      await updateContentData(CONTENT_TYPES.BOOK, bookId, formDataToSend);

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (error) {
      console.error('Error updating book:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      language: 'en',
      readingLevel: 'beginner',
      estimatedReadingTime: null,
      requiredReadingCount: 5,
      starsPerReading: 10,
      totalStarsAwarded: 50,
      isPublished: false,
      cmsBookId: '',
      selectedCmsBook: null,
    });
    setSelectedCoverImage(null);
    setSelectedPackageFile(null);
    setPackageType('html5');
    setCurrentCoverImage(null);
    setIsInitialized(false);
    isFetchingRef.current = false;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (packageInputRef.current) {
      packageInputRef.current.value = '';
    }
    onClose();
  };

  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl || typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    return `${BACKEND_BASE_URL}${maybeUrl}`;
  };

  const displayCoverImage = imagePreviewUrl
    || (currentCoverImage ? resolveMediaUrl(currentCoverImage) : null);

  const bookMeta = {
    isBuiltinBook: packageType === BOOK_PACKAGE_TYPES.BUILTIN,
    isHtml5Book: packageType === BOOK_PACKAGE_TYPES.HTML5,
    isLegacyScormBook: packageType === BOOK_PACKAGE_TYPES.SCORM,
  };

  const packageTypeLabel = bookMeta.isBuiltinBook
    ? 'Built-in CMS book'
    : bookMeta.isHtml5Book
      ? 'HTML5 package'
      : 'SCORM package';

  const linkedCmsTitle = formData.selectedCmsBook?.title
    || currentContent?.cmsBookId?.title
    || 'No built-in book linked';

  if (!currentContent && open && bookId) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: '20px',
            fontFamily: 'Quicksand, sans-serif',
            maxWidth: 1080,
          },
        }}
      >
        <DialogContent sx={{ padding: 3, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            Loading book...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '20px',
          fontFamily: 'Quicksand, sans-serif',
          maxWidth: 1080,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `2px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 700,
            fontSize: '1.75rem',
            color: theme.palette.text.primary,
          }}
        >
          Edit Book
        </Typography>
        <IconButton onClick={handleClose} aria-label="Close edit book dialog" size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3, pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Quicksand, sans-serif' }}>
          Update book details, replace the package or built-in source, and change the cover. Leave media unchanged if
          you only edit metadata.
        </Typography>

        <Stack spacing={2.5}>
          <TextField
            label="Book title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            required
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                fontFamily: 'Quicksand, sans-serif',
              },
            }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={paperSx}>
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={bentoTitleSx}>Book package</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Package type cannot be changed on edit. Upload a new ZIP or re-link a built-in CMS book.
                    </Typography>
                  </Box>

                  <Chip
                    label={packageTypeLabel}
                    size="small"
                    icon={bookMeta.isBuiltinBook ? <InsertLinkIcon aria-hidden /> : <CloudUploadIcon aria-hidden />}
                    sx={{ alignSelf: 'flex-start', fontFamily: 'Quicksand, sans-serif' }}
                  />

                  {bookMeta.isBuiltinBook ? (
                    <Box
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '14px',
                        p: 2,
                        backgroundColor: theme.palette.background.default,
                      }}
                    >
                      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>
                        Built-in book source
                      </Typography>
                      <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary, mb: 1.5 }}>
                        {linkedCmsTitle}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setCmsBooksDrawerOpen(true)}
                        fullWidth
                        sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                      >
                        {formData.cmsBookId ? 'Change built-in book' : 'Select built-in book'}
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
                          {bookMeta.isHtml5Book ? 'HTML5 package (ZIP)' : 'SCORM package (ZIP)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                          Click the box to replace the current book package.
                        </Typography>
                      </Box>
                      <input
                        ref={packageInputRef}
                        accept=".zip,application/zip,application/x-zip-compressed"
                        style={{ display: 'none' }}
                        id="book-package-upload-edit-bento"
                        type="file"
                        aria-label="Replace book package ZIP"
                        onChange={(e) => handlePackageFileChange(e.target.files)}
                      />
                      <Box
                        component="label"
                        htmlFor="book-package-upload-edit-bento"
                        role="button"
                        tabIndex={0}
                        aria-label={selectedPackageFile ? 'Change replacement package ZIP' : 'Upload replacement package ZIP'}
                        sx={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          minHeight: { xs: 200, md: 280 },
                          borderRadius: '14px',
                          border: selectedPackageFile
                            ? `1px solid ${theme.palette.divider}`
                            : `2px dashed ${theme.palette.divider}`,
                          overflow: 'hidden',
                          backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: '160ms ease',
                          '&:hover': {
                            borderColor: theme.palette.orange?.main || theme.palette.primary.main,
                          },
                        }}
                      >
                        {selectedPackageFile ? (
                          <>
                            <Stack alignItems="center" spacing={1} sx={{ px: 3, textAlign: 'center' }}>
                              <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} aria-hidden />
                              <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                                {selectedPackageFile.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                                {(selectedPackageFile.size / (1024 * 1024)).toFixed(2)} MB
                              </Typography>
                            </Stack>
                            <Chip
                              label="Change package"
                              size="small"
                              sx={{ position: 'absolute', top: 12, right: 12, fontFamily: 'Quicksand, sans-serif' }}
                            />
                          </>
                        ) : (
                          <Stack alignItems="center" spacing={1.25} sx={{ px: 3, textAlign: 'center' }}>
                            <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.text.secondary }} aria-hidden />
                            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                              Replace package
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                              Optional — leave empty to keep the current package.
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                      {selectedPackageFile && (
                        <Chip
                          label={selectedPackageFile.name}
                          size="small"
                          sx={{ alignSelf: 'flex-start' }}
                          onDelete={clearPackageFile}
                        />
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <Paper variant="outlined" sx={paperSx}>
                  <Stack spacing={1.5}>
                    <Typography sx={bentoTitleSx}>Reading settings</Typography>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        label="Language"
                        sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel>Reading level</InputLabel>
                      <Select
                        value={formData.readingLevel}
                        onChange={(e) => handleInputChange('readingLevel', e.target.value)}
                        label="Reading level"
                        sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                      >
                        <MenuItem value="beginner">Beginner</MenuItem>
                        <MenuItem value="intermediate">Intermediate</MenuItem>
                        <MenuItem value="advanced">Advanced</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Estimated reading time (min)"
                      type="number"
                      value={formData.estimatedReadingTime ?? ''}
                      onChange={(e) => handleInputChange('estimatedReadingTime', parseInt(e.target.value, 10) || null)}
                      inputProps={{ min: 0 }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                    />
                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        label="Required readings"
                        type="number"
                        value={formData.requiredReadingCount}
                        onChange={(e) => handleInputChange('requiredReadingCount', parseInt(e.target.value, 10) || 1)}
                        inputProps={{ min: 1 }}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                      />
                      <TextField
                        label="Total stars"
                        type="number"
                        value={formData.totalStarsAwarded}
                        onChange={(e) => handleInputChange('totalStarsAwarded', parseInt(e.target.value, 10) || 0)}
                        inputProps={{ min: 0 }}
                        fullWidth
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={paperSx}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.isPublished ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('isPublished', e.target.value === 'true')}
                      label="Status"
                      sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}
                    >
                      <MenuItem value="false">Draft</MenuItem>
                      <MenuItem value="true">Published</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Paper variant="outlined" sx={paperSx}>
                <BentoCoverImageField
                  theme={theme}
                  id="book-cover-upload-edit-bento"
                  previewUrl={displayCoverImage}
                  fileName={selectedCoverImage?.name}
                  onFileChange={handleCoverImageChange}
                  onClearFile={clearCoverImage}
                  title="Cover image"
                  description="Optional thumbnail displayed on the book card."
                />
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          padding: 3,
          borderTop: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title}
          sx={{
            backgroundColor: theme.palette.orange.main,
            color: theme.palette.textCustom.inverse,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: theme.palette.orange.dark,
            },
          }}
        >
          {loading ? 'Updating...' : 'Update Book'}
        </Button>
      </DialogActions>

      <CMSBooksSelectRightDrawer
        open={cmsBooksDrawerOpen}
        onClose={() => setCmsBooksDrawerOpen(false)}
        selectedBookId={formData.cmsBookId}
        onSelectBook={(book) => {
          handleInputChange('cmsBookId', book?._id || '');
          handleInputChange('selectedCmsBook', book || null);
          setCmsBooksDrawerOpen(false);
        }}
      />
    </Dialog>
  );
};

export default BookEditModal;
