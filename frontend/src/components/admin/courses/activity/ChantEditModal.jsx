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
  Typography,
  IconButton,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import useContent from '../../../../hooks/contentHook';
import { CONTENT_TYPES } from '../../../../services/contentService';
import { BACKEND_BASE_URL } from '../../../../config/constants';
import { looksLikeBunnyExploreEmbedUrl } from '../../../../utils/bunnyExploreEmbed';
import BentoCoverImageField from './BentoCoverImageField';
import BentoInstructionVideoField from './BentoInstructionVideoField';

const ChantEditModal = ({ open, onClose, chantId, onSuccess }) => {
  const theme = useTheme();
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
    instructions: '',
    estimatedDuration: null,
    starsAwarded: 10,
    isPublished: false,
    instructionVideoSource: 'upload',
    instructionVideoEmbedUrl: '',
  });

  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [selectedScormFile, setSelectedScormFile] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [currentCoverImage, setCurrentCoverImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [selectedInstructionVideo, setSelectedInstructionVideo] = useState(null);
  const [currentInstructionVideo, setCurrentInstructionVideo] = useState(null);
  const [instructionVideoPreviewUrl, setInstructionVideoPreviewUrl] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchedIdRef = useRef(null);

  const bentoCardSx = {
    height: '100%',
    borderRadius: '20px',
    borderColor: theme.palette.divider,
    p: { xs: 2, md: 2.5 },
    background:
      theme.palette.mode === 'dark'
        ? 'linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
        : 'linear-gradient(145deg, #ffffff, #fbfaf7)',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.05)',
  };

  const bentoTitleSx = {
    fontFamily: 'Quicksand, sans-serif',
    fontWeight: 700,
    mb: 0.5,
  };

  useEffect(() => {
    if (open && chantId) {
      const hasCorrectChant = currentContent && currentContent._id === chantId;
      const isDifferentChant = lastFetchedIdRef.current !== chantId;

      if (!hasCorrectChant && !isFetchingRef.current && isDifferentChant) {
        isFetchingRef.current = true;
        lastFetchedIdRef.current = chantId;
        fetchContent(CONTENT_TYPES.CHANT, chantId)
          .catch((error) => {
            console.error('Error fetching chant:', error);
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
  }, [open, chantId, currentContent, clearContent, fetchContent]);

  useEffect(() => {
    if (open && chantId && currentContent && currentContent._id === chantId && !isInitialized) {
      const instructionMedia = currentContent.instructionVideo;
      const isEmbed = typeof instructionMedia === 'object' && instructionMedia?.videoSource === 'embed';

      setFormData({
        title: currentContent.title || '',
        description: currentContent.description || '',
        instructions: currentContent.instructions || '',
        estimatedDuration: currentContent.estimatedDuration || null,
        starsAwarded: currentContent.starsAwarded || 10,
        isPublished: currentContent.isPublished || false,
        instructionVideoSource: isEmbed ? 'embed' : 'upload',
        instructionVideoEmbedUrl: isEmbed ? (instructionMedia.embedUrl || instructionMedia.url || '') : '',
      });
      setCurrentCoverImage(currentContent.coverImage);
      setCurrentAudio(currentContent.audio || null);
      setSelectedCoverImage(null);
      setSelectedAudioFile(null);
      setSelectedScormFile(null);
      setCurrentInstructionVideo(instructionMedia || null);
      setSelectedInstructionVideo(null);
      setIsInitialized(true);
    }
  }, [open, chantId, currentContent, isInitialized]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverImageChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedCoverImage(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (instructionVideoPreviewUrl) URL.revokeObjectURL(instructionVideoPreviewUrl);
    };
  }, [imagePreviewUrl, instructionVideoPreviewUrl]);

  const handleSubmit = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      if (formData.instructions) {
        formDataToSend.append('instructions', formData.instructions);
      }
      if (formData.estimatedDuration) {
        formDataToSend.append('estimatedDuration', formData.estimatedDuration);
      }
      formDataToSend.append('starsAwarded', formData.starsAwarded);
      formDataToSend.append('isPublished', formData.isPublished);

      if (selectedCoverImage) {
        formDataToSend.append('coverImage', selectedCoverImage);
      }

      if (selectedAudioFile) {
        formDataToSend.append('audio', selectedAudioFile);
      }

      if (selectedScormFile) {
        formDataToSend.append('scormFile', selectedScormFile);
      }

      if (formData.instructionVideoSource === 'embed') {
        const embed = formData.instructionVideoEmbedUrl?.trim();
        if (embed) {
          if (!looksLikeBunnyExploreEmbedUrl(embed)) {
            alert('Please enter a valid Bunny iframe embed URL for the instruction video.');
            return;
          }
          formDataToSend.append('instructionVideoSource', 'embed');
          formDataToSend.append('instructionVideoEmbedUrl', embed);
        }
      } else if (selectedInstructionVideo) {
        formDataToSend.append('instructionVideoSource', 'upload');
        formDataToSend.append('instructionVideo', selectedInstructionVideo);
      }

      await updateContentData(CONTENT_TYPES.CHANT, chantId, formDataToSend);

      if (onSuccess) onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating chant:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      estimatedDuration: null,
      starsAwarded: 10,
      isPublished: false,
      instructionVideoSource: 'upload',
      instructionVideoEmbedUrl: '',
    });
    setSelectedCoverImage(null);
    setCurrentCoverImage(null);
    setSelectedAudioFile(null);
    setSelectedScormFile(null);
    setCurrentAudio(null);
    setSelectedInstructionVideo(null);
    setCurrentInstructionVideo(null);
    setIsInitialized(false);
    isFetchingRef.current = false;
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (instructionVideoPreviewUrl) {
      URL.revokeObjectURL(instructionVideoPreviewUrl);
      setInstructionVideoPreviewUrl(null);
    }
    onClose();
  };

  const resolveMediaUrl = (maybeUrl) => {
    if (!maybeUrl || typeof maybeUrl !== 'string') return null;
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    return `${BACKEND_BASE_URL}${maybeUrl}`;
  };

  const getMediaUrl = (media) => {
    if (!media) return null;
    if (typeof media === 'object' && media.videoSource === 'embed') {
      return media.embedUrl || media.url || null;
    }
    const url = typeof media === 'string' ? media : media.url;
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const displayCoverImage = selectedCoverImage && imagePreviewUrl
    ? imagePreviewUrl
    : currentCoverImage
      ? resolveMediaUrl(currentCoverImage)
      : null;

  const currentInstructionUploadUrl = currentInstructionVideo
    && typeof currentInstructionVideo === 'object'
    && currentInstructionVideo.videoSource !== 'embed'
    ? getMediaUrl(currentInstructionVideo)
    : '';

  const currentInstructionEmbedUrl = currentInstructionVideo
    && typeof currentInstructionVideo === 'object'
    && currentInstructionVideo.videoSource === 'embed'
    ? (currentInstructionVideo.embedUrl || currentInstructionVideo.url || '')
    : '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          fontFamily: 'Quicksand, sans-serif',
          width: 'min(1280px, calc(100vw - 32px))',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 3,
          borderBottom: `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Typography component="span" variant="h5" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
          Edit Chant
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="Close edit chant dialog">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        <Stack spacing={3} sx={{ marginTop: '20px' }}>
          <TextField
            label="Chant Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            required
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
          />
          <TextField
            label="Instructions (Optional)"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Paper variant="outlined" sx={bentoCardSx}>
                <BentoInstructionVideoField
                  theme={theme}
                  idPrefix="chant-edit"
                  videoSource={formData.instructionVideoSource}
                  embedUrl={formData.instructionVideoEmbedUrl}
                  onSourceChange={(value) => {
                    handleInputChange('instructionVideoSource', value);
                    if (value === 'embed') {
                      setSelectedInstructionVideo(null);
                      if (instructionVideoPreviewUrl) {
                        URL.revokeObjectURL(instructionVideoPreviewUrl);
                        setInstructionVideoPreviewUrl(null);
                      }
                    } else {
                      handleInputChange('instructionVideoEmbedUrl', '');
                    }
                  }}
                  onEmbedUrlChange={(value) => handleInputChange('instructionVideoEmbedUrl', value)}
                  selectedFile={selectedInstructionVideo}
                  filePreviewUrl={instructionVideoPreviewUrl}
                  currentUploadUrl={currentInstructionUploadUrl}
                  currentEmbedUrl={currentInstructionEmbedUrl}
                  onFileSelect={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      setSelectedInstructionVideo(file);
                      const url = URL.createObjectURL(file);
                      setInstructionVideoPreviewUrl(url);
                    }
                  }}
                  onClearFile={() => {
                    setSelectedInstructionVideo(null);
                    if (instructionVideoPreviewUrl) {
                      URL.revokeObjectURL(instructionVideoPreviewUrl);
                      setInstructionVideoPreviewUrl(null);
                    }
                  }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={bentoCardSx}>
                  <Stack spacing={1.5}>
                    <Typography sx={bentoTitleSx}>Rewards & timing</Typography>
                    <TextField
                      label="Estimated Duration (minutes)"
                      type="number"
                      value={formData.estimatedDuration || ''}
                      onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value, 10) || null)}
                      inputProps={{ min: 0 }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                    />
                    <TextField
                      label="Stars Awarded"
                      type="number"
                      value={formData.starsAwarded}
                      onChange={(e) => handleInputChange('starsAwarded', parseInt(e.target.value, 10) || 0)}
                      inputProps={{ min: 0 }}
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
                    />
                  </Stack>
                </Paper>
                <Paper variant="outlined" sx={bentoCardSx}>
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
              <Paper variant="outlined" sx={bentoCardSx}>
                <Stack spacing={1.5}>
                  <Typography sx={bentoTitleSx}>Chant audio</Typography>
                  {currentAudio && !selectedAudioFile && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
                      Current: {typeof currentAudio === 'object' ? currentAudio.title || 'Audio file' : 'Audio file'}
                    </Typography>
                  )}
                  <input
                    accept="audio/*"
                    style={{ display: 'none' }}
                    id="chant-audio-upload-edit"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedAudioFile(e.target.files[0]);
                    }}
                  />
                  <label htmlFor="chant-audio-upload-edit">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} fullWidth sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}>
                      {currentAudio ? 'Replace chant audio' : 'Upload chant audio'}
                    </Button>
                  </label>
                  {selectedAudioFile && (
                    <Chip label={selectedAudioFile.name} size="small" onDelete={() => setSelectedAudioFile(null)} />
                  )}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={bentoCardSx}>
                <Stack spacing={1.5}>
                  <Typography sx={bentoTitleSx}>SCORM package (optional)</Typography>
                  <input
                    accept=".zip,application/zip,application/x-zip-compressed"
                    style={{ display: 'none' }}
                    id="chant-scorm-upload-edit"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedScormFile(e.target.files[0]);
                    }}
                  />
                  <label htmlFor="chant-scorm-upload-edit">
                    <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />} fullWidth sx={{ borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' }}>
                      {currentContent?.scormFile ? 'Replace SCORM package (ZIP)' : 'Upload SCORM package (ZIP)'}
                    </Button>
                  </label>
                  {selectedScormFile && (
                    <Chip label={selectedScormFile.name} size="small" onDelete={() => setSelectedScormFile(null)} />
                  )}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={bentoCardSx}>
                <BentoCoverImageField
                  theme={theme}
                  id="chant-cover-image-upload-edit"
                  previewUrl={displayCoverImage}
                  fileName={selectedCoverImage?.name}
                  onFileChange={handleCoverImageChange}
                  onClearFile={() => {
                    setSelectedCoverImage(null);
                    if (imagePreviewUrl) {
                      URL.revokeObjectURL(imagePreviewUrl);
                      setImagePreviewUrl(null);
                    }
                  }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ padding: 3, borderTop: `1px solid ${theme.palette.border.main}` }}>
        <Button onClick={handleClose} sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600, borderRadius: '10px' }}>
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
            '&:hover': { backgroundColor: theme.palette.orange.dark },
          }}
        >
          {loading ? 'Updating...' : 'Update Chant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChantEditModal;
