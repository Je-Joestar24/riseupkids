import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const StarCamMissionCreatePanel = ({ categories = [], onCreateMission, creating = false }) => {
  const theme = useTheme();
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    missionImageFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState('');

  const isValid = useMemo(
    () => Boolean(form.title.trim() && form.categoryId),
    [form]
  );

  const onSubmit = async () => {
    if (!isValid) return;
    await onCreateMission({
      title: form.title.trim(),
      categoryId: form.categoryId,
      missionImageFile: form.missionImageFile,
    });
    setForm((prev) => ({ ...prev, title: '', missionImageFile: null }));
  };

  useEffect(() => {
    if (!form.missionImageFile) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.missionImageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.missionImageFile]);

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        boxShadow: theme.shadows[1],
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Create Mission</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2 }}>
        Reminder: mission image is optional for now. When adding one, crop it as a perfect 1:1 square for clean UI display.
      </Typography>
      <Box sx={{ display: 'grid', gap: 1.2 }}>
        <TextField
          size="small"
          label="Mission Title"
          placeholder="Nature Hunt 1"
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        />
        <TextField
          size="small"
          label="Category"
          select
          value={form.categoryId}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
        >
          {categories.map((category) => (
            <MenuItem key={category._id} value={category._id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Avatar
            variant="rounded"
            src={previewUrl}
            alt="Mission image preview"
            sx={{
              width: 56,
              height: 56,
              borderRadius: '10px',
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Button component="label" variant="outlined" sx={{ textTransform: 'none' }}>
            {form.missionImageFile ? 'Change Mission Image' : 'Upload Mission Image (Optional)'}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setForm((prev) => ({ ...prev, missionImageFile: selected }));
              }}
            />
          </Button>
          {form.missionImageFile ? (
            <Button
              variant="text"
              color="inherit"
              onClick={() => setForm((prev) => ({ ...prev, missionImageFile: null }))}
              sx={{ textTransform: 'none' }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Recommended: perfectly cropped 1:1 square image to avoid stretching.
        </Typography>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!isValid || creating}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}
        >
          {creating ? 'Creating...' : 'Create Mission'}
        </Button>
      </Box>
    </Paper>
  );
};

export default StarCamMissionCreatePanel;

