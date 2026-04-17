import React, { useEffect, useMemo, useState } from 'react';
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

const INITIAL_FORM = {
  target: '',
  prompt: '',
  success: '',
  fail: '',
};

const StarCamMissionItemEditModal = ({
  open,
  item,
  missionTitle = '',
  mutating = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!open || !item) {
      setForm(INITIAL_FORM);
      return;
    }
    setForm({
      target: String(item.target || ''),
      prompt: String(item.prompt || ''),
      success: String(item.success || ''),
      fail: String(item.fail || ''),
    });
  }, [open, item]);

  const isValid = useMemo(
    () =>
      Boolean(
        String(form.target || '').trim() &&
          String(form.prompt || '').trim() &&
          String(form.success || '').trim() &&
          String(form.fail || '').trim()
      ),
    [form]
  );

  const handleChange = (field) => (event) => {
    const value = event?.target?.value ?? '';
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!item || !isValid || mutating) return;
    await onSave?.({
      target: String(form.target || '').trim().toLowerCase(),
      prompt: String(form.prompt || '').trim(),
      success: String(form.success || '').trim(),
      fail: String(form.fail || '').trim(),
    });
  };

  const handleDelete = async () => {
    if (!item || mutating) return;
    await onDelete?.();
  };

  return (
    <Dialog open={open} onClose={mutating ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Mission Object</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {missionTitle ? `${missionTitle} - ` : ''}
              Item #{Number(item?.sortOrder ?? 0) + 1}
            </Typography>
          </Box>
          <TextField
            label="Target"
            value={form.target}
            onChange={handleChange('target')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 60 }}
          />
          <TextField
            label="Prompt"
            value={form.prompt}
            onChange={handleChange('prompt')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Success Message"
            value={form.success}
            onChange={handleChange('success')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Fail Message"
            value={form.fail}
            onChange={handleChange('fail')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.2, justifyContent: 'space-between' }}>
        <Button color="error" onClick={handleDelete} disabled={mutating}>
          Delete Object
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={mutating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!isValid || mutating}>
            Save Changes
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default StarCamMissionItemEditModal;
