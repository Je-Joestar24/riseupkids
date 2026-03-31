import React, { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const StarCamMissionCreatePanel = ({ categories = [], onCreateMission, creating = false }) => {
  const theme = useTheme();
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
  });

  const isValid = useMemo(
    () => Boolean(form.title.trim() && form.categoryId),
    [form]
  );

  const onSubmit = async () => {
    if (!isValid) return;
    await onCreateMission({
      title: form.title.trim(),
      categoryId: form.categoryId,
    });
    setForm((prev) => ({ ...prev, title: '' }));
  };

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

