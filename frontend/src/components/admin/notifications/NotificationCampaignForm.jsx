import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
import { DEFAULT_NOTIFICATION_TIMEZONE, isEditableCampaignStatus } from '../../../hooks/useAdminNotifications';

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
  onSchedule,
  onSendNow,
  onSendTest,
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
  const canMutate = isEditableCampaignStatus(form.status);
  const timezones = useMemo(() => {
    const list = [...(meta?.timezones || [])];
    if (form.timezone && !list.includes(form.timezone)) list.unshift(form.timezone);
    if (!list.length) list.push(DEFAULT_NOTIFICATION_TIMEZONE);
    return list;
  }, [form.timezone, meta]);

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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
            Schedule
          </Typography>
          {form.status ? (
            <Chip size="small" label={form.status} aria-label={`Campaign status ${form.status}`} />
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 240, flex: 1 }} disabled={!canMutate}>
            <InputLabel id="notification-timing-mode">Timing mode</InputLabel>
            <Select
              labelId="notification-timing-mode"
              label="Timing mode"
              value={form.timingMode || 'recipient_local'}
              onChange={(e) => updateField('timingMode', e.target.value)}
              inputProps={{ 'aria-label': 'Timing mode' }}
            >
              {(meta?.timingModes || [
                { value: 'recipient_local', label: 'Recipient Local Time' },
                { value: 'same_moment', label: 'Same Moment Worldwide' },
              ]).map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180, flex: 1 }} disabled={!canMutate}>
            <InputLabel id="notification-quiet-hours">Quiet-hour behavior</InputLabel>
            <Select
              labelId="notification-quiet-hours"
              label="Quiet-hour behavior"
              value={form.quietHourBehavior || 'defer'}
              onChange={(e) => updateField('quietHourBehavior', e.target.value)}
              inputProps={{ 'aria-label': 'Quiet-hour behavior' }}
            >
              {(meta?.quietHourBehaviors || [
                { value: 'defer', label: 'Defer' },
                { value: 'expire', label: 'Expire' },
              ]).map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {form.timingMode === 'same_moment'
            ? 'Same Moment Worldwide sends at one instant. Use this for live lessons.'
            : 'Recipient Local Time delivers at this clock time in each family’s timezone.'}{' '}
          Quiet hours are 8:00 PM–7:00 AM local. Defer waits until 7:00 AM; Expire drops stale live alerts.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Send date"
            type="date"
            value={form.sendDate || ''}
            onChange={(e) => updateField('sendDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 180 }}
            inputProps={{ 'aria-label': 'Send date' }}
            disabled={!canMutate}
          />
          <TextField
            label="Send time"
            type="time"
            value={form.sendTime || ''}
            onChange={(e) => updateField('sendTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 140 }}
            inputProps={{ 'aria-label': 'Send time', step: 60 }}
            disabled={!canMutate}
          />
          <FormControl sx={{ minWidth: 240, flex: 1 }} disabled={!canMutate}>
            <InputLabel id="notification-timezone">
              {form.timingMode === 'same_moment' ? 'Timezone' : 'Reference timezone'}
            </InputLabel>
            <Select
              labelId="notification-timezone"
              label={form.timingMode === 'same_moment' ? 'Timezone' : 'Reference timezone'}
              value={form.timezone || ''}
              onChange={(e) => updateField('timezone', e.target.value)}
              inputProps={{ 'aria-label': 'Timezone' }}
            >
              {timezones.map((zone) => (
                <MenuItem key={zone} value={zone}>
                  {zone}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Expires date (optional)"
            type="date"
            value={form.expiresDate || ''}
            onChange={(e) => updateField('expiresDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 180 }}
            inputProps={{ 'aria-label': 'Expiration date' }}
            disabled={!canMutate}
            helperText="Leave blank for normal notifications."
          />
          <TextField
            label="Expires time (optional)"
            type="time"
            value={form.expiresTime || ''}
            onChange={(e) => updateField('expiresTime', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1, minWidth: 140 }}
            inputProps={{ 'aria-label': 'Expiration time', step: 60 }}
            disabled={!canMutate}
          />
        </Box>
        <TextField
          label="Test user id (optional)"
          value={form.testUserId || ''}
          onChange={(e) => updateField('testUserId', e.target.value)}
          helperText="Leave blank to send the test to the designated test account or your admin user."
          fullWidth
          disabled={!canMutate}
          inputProps={{ 'aria-label': 'Test user id' }}
        />

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
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
        <Button onClick={onSave} variant="outlined" disabled={saving || !canMutate} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button
          onClick={onSendTest}
          variant="outlined"
          disabled={saving || !canMutate}
          sx={{ textTransform: 'none' }}
        >
          Send test
        </Button>
        <Button
          onClick={onSchedule}
          variant="outlined"
          disabled={saving || !canMutate}
          sx={{ textTransform: 'none' }}
        >
          {form.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
        </Button>
        <Button
          onClick={onSendNow}
          variant="contained"
          disabled={saving || !canMutate}
          sx={{ textTransform: 'none' }}
        >
          Send now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationCampaignForm;
