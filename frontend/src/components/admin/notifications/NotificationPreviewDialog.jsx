import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

const NotificationPreviewDialog = ({ open, languages = [], preview, onClose, onLanguageChange }) => {
  const [language, setLanguage] = useState(preview?.language || languages[0]?.code || 'en');

  useEffect(() => {
    if (preview?.language) setLanguage(preview.language);
  }, [preview?.language]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="notification-preview-title">
      <DialogTitle id="notification-preview-title" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
        Preview
      </DialogTitle>
      <DialogContent>
        <Select
          size="small"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            onLanguageChange?.(e.target.value);
          }}
          aria-label="Preview language"
          sx={{ mb: 2, minWidth: 160 }}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
        {preview?.image?.url ? (
          <Box
            component="img"
            src={preview.image.url}
            alt="Notification preview image"
            sx={{ width: '100%', height: 'auto', borderRadius: 1, mb: 2 }}
          />
        ) : null}
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, mb: 0.5 }}>
          {preview?.title || '—'}
        </Typography>
        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', mb: 2 }}>{preview?.message || '—'}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Language: {preview?.language || language}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Destination: {preview?.destination?.kind || '—'}
          {preview?.destination?.contentId ? ` (${preview.destination.contentId})` : ''}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationPreviewDialog;
