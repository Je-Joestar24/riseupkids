import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddPrintableMaterialModal from './AddPrintableMaterialModal';
import DraftModuleBanner from './DraftModuleBanner';
import ModuleStatusChip from './ModuleStatusChip';
import PrintablesPagination from './PrintablesPagination';

const ActionSvgIcon = ({ path, size = 18, stroke = 'currentColor' }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: size, height: size, display: 'block' }}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d={path} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Box>
);

const PrintablesDetailsPanel = ({
  course,
  printables,
  pagination,
  loading,
  adding,
  updating,
  deleting,
  onAddPrintable,
  onEditPrintable,
  onDeletePrintable,
  onPageChange,
  onLimitChange,
  itemLabel = 'printable',
  itemLabelPlural = 'printable materials',
  sectionTitle = 'Printable Materials',
}) => {
  const theme = useTheme();
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingPrintable, setEditingPrintable] = useState(null);

  const list = useMemo(() => printables || [], [printables]);
  const isPublished = course?.isPublished;

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
              {sectionTitle}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {course?.title || '-'}
              </Typography>
              {course?.title ? <ModuleStatusChip isPublished={isPublished} /> : null}
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={() => setOpenAddModal(true)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
          >
            {`Add ${itemLabel.charAt(0).toUpperCase()}${itemLabel.slice(1)}`}
          </Button>
        </Box>

        <DraftModuleBanner isPublished={isPublished} itemLabelPlural={itemLabelPlural} />

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : list.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: '14px',
              borderStyle: 'dashed',
              borderWidth: '2px',
              borderColor: theme.palette.border.main,
              backgroundColor: theme.palette.custom.bgSecondary,
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <ActionSvgIcon
                size={40}
                stroke={theme.palette.text.secondary}
                path="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 1v5h5M9 13h6M9 17h6"
              />
            </Box>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{`No ${itemLabelPlural} available yet`}</Typography>
            <Typography variant="body2" color="text.secondary">
              {`Start by adding your first ${itemLabel} for this module.`}
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {list.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  borderColor: theme.palette.border.main,
                  backgroundColor: theme.palette.background.default,
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }} role="group" aria-label="Printable material card">
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
                        alt={item.title || `${itemLabel} cover`}
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
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.title || `Untitled ${itemLabel.charAt(0).toUpperCase()}${itemLabel.slice(1)}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={`Download ${itemLabel}`}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={`Download ${item.title || itemLabel}`}
                              onClick={() => window.open(item.pdfUrl, '_blank', 'noopener,noreferrer')}
                              disabled={!item.pdfUrl}
                              sx={{
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  backgroundColor: `${theme.palette.primary.main}1A`,
                                },
                              }}
                            >
                              <ActionSvgIcon path="M12 4v10m0 0 4-4m-4 4-4-4M5 18v2h14v-2" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title={`Edit ${itemLabel}`}>
                          <IconButton
                            size="small"
                            aria-label={`Edit ${item.title || itemLabel}`}
                            onClick={() => {
                              setEditingPrintable(item);
                              setOpenEditModal(true);
                            }}
                            sx={{
                              color: theme.palette.orange.main,
                              '&:hover': {
                                backgroundColor: `${theme.palette.orange.main}1A`,
                              },
                            }}
                          >
                            <ActionSvgIcon path="M4 20h4l10-10-4-4L4 16v4Zm12-12 2 2M13 5l4 4" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={`Delete ${itemLabel}`}>
                          <span>
                            <IconButton
                              size="small"
                              aria-label={`Delete ${item.title || itemLabel}`}
                              disabled={Boolean(deleting)}
                              onClick={() => onDeletePrintable?.(item)}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                  backgroundColor: `${theme.palette.error.main}1A`,
                                },
                              }}
                            >
                              <ActionSvgIcon path="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
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
          itemLabel={itemLabelPlural}
        />
      </Stack>

      <AddPrintableMaterialModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onSubmit={onAddPrintable}
        loading={adding}
        courseTitle={course?.title}
        courseIsPublished={isPublished}
        itemLabel={itemLabel}
      />

      <AddPrintableMaterialModal
        open={openEditModal}
        onClose={() => {
          setOpenEditModal(false);
          setEditingPrintable(null);
        }}
        onSubmit={(payload) => onEditPrintable?.(editingPrintable?.id, payload)}
        loading={updating}
        courseTitle={course?.title}
        mode="edit"
        initialData={editingPrintable}
        courseIsPublished={isPublished}
        itemLabel={itemLabel}
      />
    </Paper>
  );
};

export default PrintablesDetailsPanel;

