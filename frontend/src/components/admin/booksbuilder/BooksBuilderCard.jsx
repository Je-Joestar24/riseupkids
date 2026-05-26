import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { MenuBookOutlined as MenuBookOutlinedIcon, Language as LanguageIcon } from '@mui/icons-material';
import { getCoverImageUrl } from '../../../utils/coverImageUrl';

const resolveBookIntroImage = (book) => {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const introLikePage =
    pages.find((page) => page?.type === 'cover' && Number(page?.order) === 1) ||
    pages.find((page) => page?.type === 'cover') ||
    pages.find((page) => page?.type === 'intro') ||
    pages.find((page) => Number(page?.order) === 1);
  const bookLevelCoverUrl = book?.coverImageUrl || book?.coverImageMedia?.url || '';
  if (!introLikePage) return getCoverImageUrl(bookLevelCoverUrl) || '';

  const coverUrl = (
    bookLevelCoverUrl
    || introLikePage.coverImageUrl
    || introLikePage.imageUrl
    || introLikePage?.media?.imageUrl
    || introLikePage?.media?.image?.url
    || introLikePage?.media?.imageMedia?.url
    || introLikePage?.media?.imageMedia?.cloudUrl
    || ''
  );

  return getCoverImageUrl(coverUrl) || '';
};

const DotsMenuSvgIcon = () => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    role="img"
    aria-label="More options"
    sx={{ width: 20, height: 20, display: 'block' }}
  >
    <circle cx="12" cy="5" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="19" r="2" fill="currentColor" />
  </Box>
);

const BooksBuilderCard = ({
  book,
  onTest,
  onEdit,
  onDelete,
  isTesting = false,
  isEditing = false,
  isDeleting = false,
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const pageCount = Array.isArray(book?.pages) ? book.pages.length : 0;
  const introImageUrl = resolveBookIntroImage(book);
  const isMenuOpen = Boolean(menuAnchorEl);

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleAction = (action) => {
    handleCloseMenu();
    action?.(book);
  };

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
        <IconButton
          onClick={handleOpenMenu}
          aria-label={`Open actions for ${book?.title || 'book'}`}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: 'common.white',
            width: 30,
            height: 30,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.75)',
            },
          }}
        >
          <DotsMenuSvgIcon />
        </IconButton>
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
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          disabled={isEditing}
          onClick={() => handleAction(onEdit)}
          aria-label={`Edit ${book?.title || 'book'}`}
        >
          {isEditing ? 'Opening...' : 'Edit'}
        </MenuItem>
        <MenuItem
          disabled={isTesting}
          onClick={() => handleAction(onTest)}
          aria-label={`Test ${book?.title || 'book'}`}
        >
          {isTesting ? 'Loading...' : 'Test'}
        </MenuItem>
        <MenuItem
          disabled={isDeleting}
          onClick={() => handleAction(onDelete)}
          aria-label={`Delete ${book?.title || 'book'}`}
          sx={{ color: 'error.main' }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default BooksBuilderCard;
