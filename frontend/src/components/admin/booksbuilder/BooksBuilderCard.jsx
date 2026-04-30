import React from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { MenuBookOutlined as MenuBookOutlinedIcon, Language as LanguageIcon } from '@mui/icons-material';

const resolveBookIntroImage = (book) => {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const introLikePage = pages.find((page) => page?.type === 'intro' || page?.type === 'cover');
  if (!introLikePage) return '';

  return (
    introLikePage.imageUrl
    || introLikePage?.media?.imageUrl
    || introLikePage?.media?.image?.url
    || introLikePage?.media?.imageMedia?.url
    || ''
  );
};

const BooksBuilderCard = ({
  book,
  onTest,
  onEdit,
  onDelete,
  isTesting = false,
  isEditing = false,
  isDeleting = false,
}) => {
  const pageCount = Array.isArray(book?.pages) ? book.pages.length : 0;
  const introImageUrl = resolveBookIntroImage(book);

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
        {introImageUrl ? (
          <Box
            component="img"
            src={introImageUrl}
            alt={book?.title || 'Book intro preview'}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <MenuBookOutlinedIcon sx={{ fontSize: 52, color: 'orange.main', opacity: 0.9 }} />
          </Box>
        )}
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
          <Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-start' }}>
            <Button
              variant="outlined"
              onClick={() => onEdit?.(book)}
              disabled={isEditing}
              aria-label={`Edit book ${book?.title || ''}`}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {isEditing ? 'Opening...' : 'Edit'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => onTest?.(book)}
              disabled={isTesting}
              aria-label={`Test book ${book?.title || ''}`}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {isTesting ? 'Loading...' : 'Test'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => onDelete?.(book)}
              disabled={isDeleting}
              aria-label={`Delete book ${book?.title || ''}`}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default BooksBuilderCard;
