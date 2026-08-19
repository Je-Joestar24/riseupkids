import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

const NotificationCampaignForm = ({
  open,
  mode,
  form,
  meta,
  saving,
  uploadingLanguage,
  onChange,
  onClose,
  onSave,
  onUploadImage,
}) => {
  const languages = meta?.languages || [];
  const firstLanguage = languages[0]?.code || 'en';
  const [tab, setTab] = useState(firstLanguage);

  useEffect(() => {
    if (open) setTab(firstLanguage);
  }, [open, firstLanguage]);
  const destination = useMemo(
    () => (meta?.destinationKinds || []).find((item) => item.value === form.destinationKind),
    [form.destinationKind, meta]
  );
  const localization = form.localizations?.[tab] || { title: '', message: '' };

  const updateField = (key, value) => onChange((current) => ({ ...current, [key]: value }));

  const updateLocalization = (key, value) =>
    onChange((current) => ({
      ...current,
      localizations: {
        ...current.localizations,
        [tab]: {
          ...current.localizations[tab],
          [key]: value,
        },
      },
    }));

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUploadImage?.(file, tab, form, onChange);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="notification-campaign-form-title">
      <DialogTitle id="notification-campaign-form-title" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        {mode === 'edit' ? 'Edit notification' : 'Create notification'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Internal name"
          value={form.internalName}
          onChange={(e) => updateField('internalName', e.target.value)}
          fullWidth
          required
          inputProps={{ 'aria-label': 'Internal campaign name' }}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 220, flex: 1 }}>
            <InputLabel id="notification-type">Notification type</InputLabel>
            <Select
              labelId="notification-type"
              label="Notification type"
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
            >
              {(meta?.types || []).map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180, flex: 1 }}>
            <InputLabel id="notification-audience">Audience</InputLabel>
            <Select
              labelId="notification-audience"
              label="Audience"
              value={form.audience}
              onChange={(e) => updateField('audience', e.target.value)}
            >
              {(meta?.audiences || []).map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 220, flex: 1 }}>
            <InputLabel id="notification-destination">Destination</InputLabel>
            <Select
              labelId="notification-destination"
              label="Destination"
              value={form.destinationKind}
              onChange={(e) => updateField('destinationKind', e.target.value)}
            >
              {(meta?.destinationKinds || []).map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {destination?.needsContentId ? (
            <TextField
              label="Content id"
              value={form.contentId}
              onChange={(e) => updateField('contentId', e.target.value)}
              sx={{ flex: 1, minWidth: 180 }}
              inputProps={{ 'aria-label': 'Destination content id' }}
            />
          ) : null}
        </Box>

        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mt: 1 }}>
          Localized content
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          aria-label="Notification languages"
        >
          {languages.map((lang) => (
            <Tab key={lang.code} value={lang.code} label={lang.name} />
          ))}
        </Tabs>
        <TextField
          label="Push title"
          value={localization.title}
          onChange={(e) => updateLocalization('title', e.target.value)}
          fullWidth
          inputProps={{ 'aria-label': `${tab} push title` }}
        />
        <TextField
          label="Push message"
          value={localization.message}
          onChange={(e) => updateLocalization('message', e.target.value)}
          fullWidth
          multiline
          minRows={2}
          inputProps={{ 'aria-label': `${tab} push message` }}
        />
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Recommended image 1920 × 600 px (3.2:1). JPG, PNG, or WebP. The image is not cropped.
          </Typography>
          <Button
            component="label"
            variant="outlined"
            disabled={uploadingLanguage === tab}
            sx={{ textTransform: 'none' }}
          >
            {uploadingLanguage === tab ? 'Uploading…' : 'Upload image'}
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              aria-label={`Upload ${tab} notification image`}
            />
          </Button>
          {uploadingLanguage === tab ? <CircularProgress size={18} sx={{ ml: 2 }} /> : null}
          {localization.imageUrl ? (
            <Box
              component="img"
              src={localization.imageUrl}
              alt={`${tab} notification preview`}
              sx={{ display: 'block', mt: 2, maxWidth: '100%', height: 'auto', borderRadius: 1 }}
            />
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button onClick={onSave} variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationCampaignForm;
