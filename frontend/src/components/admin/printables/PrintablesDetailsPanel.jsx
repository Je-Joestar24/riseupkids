import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddPrintableMaterialModal from './AddPrintableMaterialModal';
import PrintablesPagination from './PrintablesPagination';

const PrintablesDetailsPanel = ({
  course,
  printables,
  pagination,
  loading,
  adding,
  onAddPrintable,
  onPageChange,
  onLimitChange,
}) => {
  const theme = useTheme();
  const [openAddModal, setOpenAddModal] = useState(false);

  const list = useMemo(() => printables || [], [printables]);

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        minHeight: '420px',
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontFamily: 'Quicksand, sans-serif' }}>
              Printable Materials
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {course?.title || '-'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => setOpenAddModal(true)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            Add Printable
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : list.length === 0 ? (
          <Typography color="text.secondary">No printables in this module yet.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {list.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  borderColor: theme.palette.border.main,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: `1px solid ${theme.palette.border.main}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    {item.coverImage ? (
                      <Box
                        component="img"
                        src={item.coverImage}
                        alt={item.title || 'Printable cover'}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          No Img
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.title || 'Untitled Printable'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => window.open(item.pdfUrl, '_blank', 'noopener,noreferrer')}
                        disabled={!item.pdfUrl}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        Download
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        <PrintablesPagination
          pagination={pagination}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          itemLabel="printables"
        />
      </Stack>

      <AddPrintableMaterialModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onSubmit={onAddPrintable}
        loading={adding}
        courseTitle={course?.title}
      />
    </Paper>
  );
};

export default PrintablesDetailsPanel;

