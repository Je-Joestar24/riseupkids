import React from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Plays one video in a pop-up so the admin can check the link is the right one. It uses the Bunny player
 * itself, the same page children get. Nothing is loaded until it is opened.
 *
 * @param {{ video: { title: string, url: string }|null, onClose: () => void }} props
 */
const VideoPreviewDialog = ({ video, onClose }) => (
  <Dialog open={Boolean(video)} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="video-preview-title">
    {video && (
      <>
        <DialogTitle id="video-preview-title" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, pr: 6 }}>
          {video.title}
          <IconButton aria-label="Close preview" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}>
            <Box
              component="iframe"
              title={`Preview of ${video.title}`}
              src={video.url}
              allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1.5, fontFamily: 'Quicksand, sans-serif', color: 'text.secondary' }}>
            This is the video Bunny plays for this link.
          </Typography>
        </DialogContent>
      </>
    )}
  </Dialog>
);

export default VideoPreviewDialog;
