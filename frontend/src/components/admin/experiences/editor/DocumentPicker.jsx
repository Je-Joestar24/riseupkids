import React, { useRef } from 'react';
import { Box, Button, FormHelperText, Link, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DeleteOutline as RemoveIcon,
  DescriptionOutlined as FileIcon,
  UploadFileOutlined as UploadIcon,
} from '@mui/icons-material';
import { DOCUMENT_ACCEPT, documentIsShown } from '../../../../utils/experienceForm';
import { fileSizeLabel } from '../../../../utils/experienceAdminFormat';

/**
 * Choose, see, replace and remove the printable file (a PDF or a Word document). Like a picture, it is only sent
 * when the experience is saved. A saved file shows its name and can be opened to check it.
 *
 * @param {{ id: string, document: { url: string|null, name: string, file: File|null, remove: boolean }, error?: string,
 *   hint?: string, onPick: (file: File) => void, onRemove: () => void }} props
 */
const DocumentPicker = ({ id, document: item, error = '', hint = '', onPick, onRemove }) => {
  const theme = useTheme();
  const input = useRef(null);

  const shown = documentIsShown(item);
  const chosen = Boolean(item.file);
  const name = chosen ? item.file.name : item.name || 'Printable file';
  const size = chosen ? fileSizeLabel(item.file.size) : '';
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
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          minHeight: 64,
          borderRadius: '12px',
          border: `1px ${shown ? 'solid' : 'dashed'} ${error ? theme.palette.error.main : theme.palette.border.secondary}`,
          backgroundColor: theme.palette.custom.bgSecondary,
        }}
      >
        <FileIcon aria-hidden sx={{ color: shown ? theme.palette.primary.main : theme.palette.text.disabled, flexShrink: 0 }} />
        {shown ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, overflowWrap: 'anywhere' }}>{name}</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
              {chosen ? `New file${size ? ` · ${size}` : ''}. It is saved when you save the experience.` : 'Saved file. '}
              {!chosen && item.url && (
                <Link href={item.url} target="_blank" rel="noopener noreferrer" underline="always">
                  Open it
                </Link>
              )}
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>No file chosen</Typography>
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
          {shown ? 'Replace file' : 'Choose file'}
        </Button>
        {shown && (
          <Button size="small" color="error" startIcon={<RemoveIcon />} onClick={onRemove} sx={{ textTransform: 'none', fontFamily: 'Quicksand, sans-serif' }}>
            Remove
          </Button>
        )}
      </Stack>
      <input ref={input} id={id} type="file" accept={DOCUMENT_ACCEPT} aria-label="Printable document" onChange={handleChange} hidden />

      {(error || hint) && (
        <FormHelperText id={`${id}-note`} error={Boolean(error)} role={error ? 'alert' : undefined} sx={{ mx: 0, fontFamily: 'Quicksand, sans-serif' }}>
          {error || hint}
        </FormHelperText>
      )}
    </Box>
  );
};

export default DocumentPicker;
