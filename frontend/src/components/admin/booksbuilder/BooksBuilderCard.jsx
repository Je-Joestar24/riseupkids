import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { MenuBookOutlined as MenuBookOutlinedIcon, Language as LanguageIcon } from '@mui/icons-material';

const BooksBuilderCard = ({ book }) => {
  const pageCount = Array.isArray(book?.pages) ? book.pages.length : 0;

  return (
    <Card
      sx={{
        borderRadius: '0px',
        border: (theme) => `1px solid ${theme.palette.border.main}`,
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          paddingTop: '56%',
          position: 'relative',
          backgroundColor: (theme) => theme.palette.custom.bgSecondary,
          borderBottom: (theme) => `1px solid ${theme.palette.border.main}`,
        }}
      >
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 52, color: 'orange.main', opacity: 0.9 }} />
        </Box>
        <Chip
          label={`${pageCount} pages`}
          size="small"
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            fontFamily: 'Quicksand, sans-serif',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: 'common.white',
          }}
        />
      </Box>

      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={1.5}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, lineHeight: 1.35 }}>
            {book?.title || 'Untitled Book'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Quicksand, sans-serif',
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {book?.description || 'No description provided.'}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              icon={<LanguageIcon />}
              size="small"
              label={(book?.language || 'en').toUpperCase()}
              sx={{ fontFamily: 'Quicksand, sans-serif' }}
            />
            <Chip size="small" label={`v${book?.version || 1}`} sx={{ fontFamily: 'Quicksand, sans-serif' }} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BooksBuilderCard;
