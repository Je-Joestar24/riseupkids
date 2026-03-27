import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const AddPrintableMaterialModal = ({ open, onClose, onSubmit, loading, courseTitle }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  const isValid = useMemo(() => Boolean(title.trim() && pdfFile), [title, pdfFile]);

  const handleClose = () => {
    if (loading) return;
    setTitle('');
    setDescription('');
    setPdfFile(null);
    setCoverImage(null);
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        Add Printable Material
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Module: {courseTitle || '-'}
          </Typography>

          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
              PDF File (required)
            </Typography>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
          </Box>

          <Box>
            <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
              Cover Image (optional)
            </Typography>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!isValid || loading} sx={{ textTransform: 'none' }}>
          {loading ? 'Saving...' : 'Add Printable'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPrintableMaterialModal;

