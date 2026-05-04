import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  MenuBook as MenuBookIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import cmsBookAdminService from '../../../../services/cmsBookAdminService';

const CMSBooksSelectRightDrawer = ({ open, onClose, onSelectBook, selectedBookId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await cmsBookAdminService.listBooks({
          status: 'published',
          includeArchived: false,
          limit: 100,
          page: 1,
          search: '',
        });
        if (!mounted) return;
        setBooks(response?.data?.items || []);
      } catch (err) {
        if (!mounted) return;
        setError(err || 'Failed to load built-in books');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [open]);

  const filteredBooks = useMemo(() => {
    const keyword = String(search || '').trim().toLowerCase();
    if (!keyword) return books;
    return books.filter((book) => {
      const title = String(book?.title || '').toLowerCase();
      const description = String(book?.description || '').toLowerCase();
      return title.includes(keyword) || description.includes(keyword);
    });
  }, [books, search]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        zIndex: (muiTheme) => muiTheme.zIndex.modal + 20,
      }}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 430 },
          backgroundColor: theme.palette.background.default,
          zIndex: (muiTheme) => muiTheme.zIndex.modal + 21,
        },
      }}
    >
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${theme.palette.border.main}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>
            Select Built-in Book
          </Typography>
          <IconButton onClick={onClose} aria-label="Close built-in books drawer">
            <CloseIcon />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          placeholder="Search by title or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontFamily: 'Quicksand, sans-serif' } }}
        />
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.error.main }}>
            {error}
          </Typography>
        ) : filteredBooks.length === 0 ? (
          <Typography sx={{ fontFamily: 'Quicksand, sans-serif', color: theme.palette.text.secondary }}>
            No published built-in books found.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {filteredBooks.map((book) => {
              const isSelected = String(book._id) === String(selectedBookId || '');
              return (
                <Grid item xs={12} key={book._id}>
                  <Card
                    sx={{
                      borderRadius: '12px',
                      border: `1px solid ${isSelected ? theme.palette.primary.main : theme.palette.border.main}`,
                      boxShadow: isSelected ? theme.shadows[3] : 'none',
                    }}
                  >
                    <CardActionArea
                      onClick={() => onSelectBook?.(book)}
                      aria-label={`Select built-in book ${book.title || ''}`}
                    >
                      <CardContent sx={{ p: 1.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <MenuBookIcon color="primary" sx={{ mt: 0.2 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontFamily: 'Quicksand, sans-serif',
                                  fontWeight: 700,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {book.title || 'Untitled CMS Book'}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'Quicksand, sans-serif',
                                  color: theme.palette.text.secondary,
                                }}
                              >
                                {book.description || 'No description'}
                              </Typography>
                            </Box>
                          </Box>
                          {isSelected && <CheckCircleIcon color="success" fontSize="small" />}
                        </Box>

                        <Box sx={{ mt: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          <Chip size="small" label={`v${book.version || 1}`} />
                          <Chip size="small" label={(book.language || 'en').toUpperCase()} />
                          <Chip size="small" color="success" label="Published" />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Drawer>
  );
};

export default CMSBooksSelectRightDrawer;
