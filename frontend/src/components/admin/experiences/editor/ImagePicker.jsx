import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DeleteOutline as RemoveIcon, ImageOutlined as ImageIcon, UploadFileOutlined as UploadIcon } from '@mui/icons-material';
import useObjectUrl from '../../../../hooks/useObjectUrl';
import { IMAGE_ACCEPT, pictureIsShown } from '../../../../utils/experienceForm';

/**
 * Choose, see, replace and remove one picture. The picture is only sent when the experience is saved; until
 * then a newly chosen file is shown from the browser's memory.
 *
 * @param {{ id: string, label: string, picture: { url: string|null, file: File|null, remove: boolean }, error?: string,
 *   hint?: string, aspectRatio?: string, onPick: (file: File) => void, onRemove: () => void }} props
 */
const ImagePicker = ({ id, label, picture, error = '', hint = '', aspectRatio = '16 / 9', onPick, onRemove }) => {
  const theme = useTheme();
  const input = useRef(null);
  const [failed, setFailed] = useState(false);

  const previewUrl = useObjectUrl(picture.file);

  const src = previewUrl || (picture.remove ? null : picture.url);
  useEffect(() => setFailed(false), [src]);

  const shown = pictureIsShown(picture);
  const describedBy = error || hint ? `${id}-note` : undefined;

  const handleChange = (event) => {
    const [file] = event.target.files || [];
    // The same file can be chosen again after it was removed.
    event.target.value = '';
    if (file) onPick(file);
  };

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          aspectRatio,
          overflow: 'hidden',
          borderRadius: '12px',
          border: `1px ${shown && src && !failed ? 'solid' : 'dashed'} ${error ? theme.palette.error.main : theme.palette.border.secondary}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        {src && !failed ? (
          <Box component="img" src={src} alt={`${label} preview`} onError={() => setFailed(true)} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ height: '100%', color: theme.palette.text.secondary, p: 1, textAlign: 'center' }}>
            <ImageIcon aria-hidden />
            <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif' }}>
              {src && failed ? 'The picture could not be shown' : 'No picture'}
            </Typography>
          </Stack>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => input.current && input.current.click()}
          aria-describedby={describedBy}
          sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif', borderRadius: '10px' }}
        >
          {shown ? 'Replace picture' : 'Choose picture'}
        </Button>
        {shown && (
          <Button size="small" color="error" startIcon={<RemoveIcon />} onClick={onRemove} sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}>
            Remove
          </Button>
        )}
      </Stack>
      <input ref={input} id={id} type="file" accept={IMAGE_ACCEPT} aria-label={`${label} file`} onChange={handleChange} hidden />

      {(error || hint) && (
        <FormHelperText id={`${id}-note`} error={Boolean(error)} role={error ? 'alert' : undefined} sx={{ mx: 0, fontFamily: 'Quicksand, sans-serif' }}>
          {error || hint}
        </FormHelperText>
      )}
    </Box>
  );
};

export default ImagePicker;
