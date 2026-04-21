import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const AddPrintableMaterialModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  courseTitle,
  mode = 'add',
  initialData = null,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState('');
  const [existingCoverImage, setExistingCoverImage] = useState('');
  const pdfInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const isEditMode = mode === 'edit';

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (isEditMode) return true;
    return Boolean(pdfFile);
  }, [title, pdfFile, isEditMode]);
  const pdfPreviewUrl = useMemo(() => (pdfFile ? URL.createObjectURL(pdfFile) : ''), [pdfFile]);
  const imagePreviewUrl = useMemo(() => (coverImage ? URL.createObjectURL(coverImage) : ''), [coverImage]);

  useEffect(() => {
    if (!open) return;
    if (isEditMode && initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setPdfFile(null);
      setCoverImage(null);
      setExistingPdfUrl(initialData.pdfUrl || '');
      setExistingCoverImage(initialData.coverImage || '');
      return;
    }
    setTitle('');
    setDescription('');
    setPdfFile(null);
    setCoverImage(null);
    setExistingPdfUrl('');
    setExistingCoverImage('');
  }, [open, isEditMode, initialData]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleClose = () => {
    if (loading) return;
    setTitle('');
    setDescription('');
    setPdfFile(null);
    setCoverImage(null);
    setExistingPdfUrl('');
    setExistingCoverImage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      pdfFile,
      coverImage,
    });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        {isEditMode ? 'Edit Printable Material' : 'Add Printable Material'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 310px) minmax(0, 1fr)' },
            gap: 2,
            minHeight: { xs: 560, md: 620 },
          }}
        >
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 2,
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: 2,
            }}
          >
            <Box
              role="button"
              tabIndex={0}
              aria-label="Cover image preview panel"
              onClick={() => coverInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  coverInputRef.current?.click();
                }
              }}
              sx={{
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                width: '100%',
                maxWidth: 260,
                aspectRatio: '1 / 1',
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: '#fafafa',
                cursor: 'pointer',
                margin: 'auto',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  boxShadow: '0 8px 20px rgba(25,118,210,0.15)',
                },
              }}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                aria-label="Upload cover image"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              {imagePreviewUrl || existingCoverImage ? (
                <Box
                  component="img"
                  src={imagePreviewUrl || existingCoverImage}
                  alt="Printable material cover preview"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover'	 }}
                />
              ) : (
                <Stack spacing={0.8} alignItems="center" sx={{ px: 2, textAlign: 'center'	 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Click to upload cover
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Perfect square preview (1:1)
                  </Typography>
                </Stack>
              )}
            </Box>

            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                Module: {courseTitle || '-'}
              </Typography>
              <Divider />
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
                aria-label="Printable material title"
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={3}
                aria-label="Printable material description"
              />
              <Box>
                <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
                  PDF File ({isEditMode ? 'optional' : 'required'})
                </Typography>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  aria-label="Upload printable PDF"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  variant="outlined"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    borderColor: '#d6dbe6',
                    bgcolor: '#f8faff',
                    color: '#263238',
                    px: 1.5,
                    py: 1,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: '#eef4ff',
                    },
                  }}
                >
                  {pdfFile ? 'Change PDF File' : isEditMode ? 'Replace PDF File' : 'Upload PDF File'}
                </Button>
                {pdfFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    {pdfFile.name}
                  </Typography>
                )}
                {!pdfFile && isEditMode && existingPdfUrl && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    Current PDF is kept unless replaced.
                  </Typography>
                )}
              </Box>{/* 
              <Box>
                <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
                  Cover Image (optional)
                </Typography>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload cover image"
                  onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  variant="outlined"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    borderColor: '#d6dbe6',
                    bgcolor: '#fff8f1',
                    color: '#263238',
                    px: 1.5,
                    py: 1,
                    '&:hover': {
                      borderColor: '#ff9800',
                      bgcolor: '#fff2e0',
                    },
                  }}
                >
                  {coverImage ? 'Change Cover Image' : 'Upload Cover Image'}
                </Button>
                {coverImage && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    {coverImage.name}
                  </Typography>
                )}
              </Box> */}
            </Stack>
          </Box>

          <Box
            role="region"
            aria-label="Printable material preview panel"
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: 1.25,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Typography sx={{ px: 1, py: 0.5, fontWeight: 700, fontSize: '0.95rem' }}>
              Printable Preview
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Box
              sx={{
                borderRadius: 1.5,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: '#ffffff',
                flex: 1,
                minHeight: { xs: 320, md: 0 },
                overflow: 'auto',
                colorScheme: 'light',
                boxShadow: 'inset 0 0 0 1px #f0f2f7',
              }}
            >
              {pdfPreviewUrl || existingPdfUrl ? (
                <Box
                  component="iframe"
                  src={`${pdfPreviewUrl || existingPdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  title="Printable PDF preview"
                  aria-label="Scrollable PDF preview"
                  sx={{
                    width: '100%',
                    minHeight: { xs: 500, md: 860 },
                    border: 0,
                    display: 'block',
                    bgcolor: '#fff',
                    colorScheme: 'light',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {isEditMode
                      ? 'Current PDF preview unavailable. Upload a replacement PDF to preview.'
                      : 'Upload a PDF to show the scrollable preview here.'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || loading} sx={{ textTransform: 'none' }}>
          {loading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Printable'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPrintableMaterialModal;

