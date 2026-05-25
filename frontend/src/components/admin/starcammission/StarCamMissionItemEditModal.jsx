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
  questionText: '',
  successText: '',
  tryAgainText: '',
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
      questionText: String(item.questionText || item.prompt || ''),
      successText: String(item.successText || item.success || ''),
      tryAgainText: String(item.tryAgainText || item.fail || ''),
    });
  }, [open, item]);

  const isValid = useMemo(
    () =>
      Boolean(
        String(form.target || '').trim() &&
          String(form.questionText || '').trim() &&
          String(form.successText || '').trim() &&
          String(form.tryAgainText || '').trim()
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
      questionText: String(form.questionText || '').trim(),
      successText: String(form.successText || '').trim(),
      tryAgainText: String(form.tryAgainText || '').trim(),
    });
  };

  const handleDelete = async () => {
    if (!item || mutating) return;
    await onDelete?.();
  };

  return (
    <Dialog open={open} onClose={mutating ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Scan Question</DialogTitle>
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
            helperText="Must match one vocabulary detect target so audio can be resolved."
          />
          <TextField
            label="Question Text"
            value={form.questionText}
            onChange={handleChange('questionText')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
            helperText='Example: "Is this a book?"'
          />
          <TextField
            label="Success Text"
            value={form.successText}
            onChange={handleChange('successText')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
            helperText='Example: "That is a book, yeyy."'
          />
          <TextField
            label="Try Again Text"
            value={form.tryAgainText}
            onChange={handleChange('tryAgainText')}
            fullWidth
            required
            disabled={mutating}
            inputProps={{ maxLength: 200 }}
            helperText='Example: "Ow that is not a book, let us try again."'
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.2, justifyContent: 'space-between' }}>
        <Button color="error" onClick={handleDelete} disabled={mutating}>
          Delete Scan Item
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
