import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useAudioFileWithSilenceTrim from '../../../hooks/useAudioFileWithSilenceTrim';
import {
  createStarCamCategoryRenderValue,
  renderStarCamCategoryMenuItems,
  starCamCategoryFilterSelectMenuProps,
  starCamCategoryTextFieldLabelProps,
} from './starCamCategorySelectOptions';

const StarCamMissionCreatePanel = ({ categories = [], onCreateMission, creating = false }) => {
  const theme = useTheme();
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    missionImageFile: null,
    missionShortVideoFile: null,
    rewardAudioFile: null,
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const { processAudioFileForUpload } = useAudioFileWithSilenceTrim();

  const handleRewardAudioChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      setForm((prev) => ({ ...prev, rewardAudioFile: null }));
      return;
    }
    const result = await processAudioFileForUpload(file);
    if (result?.file) setForm((prev) => ({ ...prev, rewardAudioFile: result.file }));
  };

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
      missionShortVideoFile: form.missionShortVideoFile,
      rewardAudioFile: form.rewardAudioFile,
    });
    setForm((prev) => ({
      ...prev,
      title: '',
      categoryId: '',
      missionImageFile: null,
      missionShortVideoFile: null,
      rewardAudioFile: null,
    }));
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
          value={form.categoryId != null ? String(form.categoryId) : ''}
          onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
          {...starCamCategoryTextFieldLabelProps}
          SelectProps={{
            displayEmpty: true,
            renderValue: createStarCamCategoryRenderValue(categories, 'Select category'),
            MenuProps: starCamCategoryFilterSelectMenuProps,
          }}
        >
          {renderStarCamCategoryMenuItems(categories)}
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
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Button component="label" variant="outlined" sx={{ textTransform: 'none' }}>
            {form.missionShortVideoFile ? 'Short Video Selected' : 'Upload Mission Short Video'}
            <input
              hidden
              type="file"
              accept="video/*"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setForm((prev) => ({ ...prev, missionShortVideoFile: selected }));
              }}
            />
          </Button>
          {form.missionShortVideoFile ? (
            <Button
              variant="text"
              color="inherit"
              onClick={() => setForm((prev) => ({ ...prev, missionShortVideoFile: null }))}
              sx={{ textTransform: 'none' }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Button component="label" variant="outlined" sx={{ textTransform: 'none' }}>
            {form.rewardAudioFile ? 'Reward Audio Selected' : 'Upload Reward Audio'}
            <input
              hidden
              type="file"
              accept="audio/*"
              onChange={handleRewardAudioChange}
            />
          </Button>
          {form.rewardAudioFile ? (
            <Button
              variant="text"
              color="inherit"
              onClick={() => setForm((prev) => ({ ...prev, rewardAudioFile: null }))}
              sx={{ textTransform: 'none' }}
            >
              Remove
            </Button>
          ) : null}
        </Stack>
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