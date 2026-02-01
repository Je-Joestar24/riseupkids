import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Box,
    Typography,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Visibility as VisibilityIcon,
    Archive as ArchiveIcon,
    Delete as DeleteIcon,
    Stop as StopIcon,
    Videocam as VideocamIcon,
} from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';

/**
 * YoutubeLiveList Component
 *
 * Table of YouTube lives: title, status, created date, archived badge, actions (View, End stream, Archive, Delete).
 */
const YoutubeLiveList = ({
    lives,
    listLoading,
    actionLoading,
    onView,
    onEnd,
    onArchive,
    onDelete,
}) => {
    const theme = useTheme();
    const orange = theme.palette.orange?.main || themeColors.orange;
    const border = theme.palette.border?.main || themeColors.border;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (listLoading && lives.length === 0) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 4,
                }}
            >
                <CircularProgress sx={{ color: orange }} />
            </Box>
        );
    }

    if (lives.length === 0) {
        return (
            <Paper
                sx={{
                    padding: 4,
                    textAlign: 'center',
                    borderRadius: '12px',
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${border}`,
                    boxShadow: theme.shadows[2],
                }}
            >
                {/* Empty State */}
                <Box sx={{ textAlign: 'center', padding: 4 }}>
                    <VideocamIcon
                        sx={{
                            fontSize: 64,
                            color: theme.palette.text.secondary,
                            marginBottom: 2,
                        }}
                    />
                    <Typography
                        variant="h6"
                        sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            marginBottom: 1,
                        }}
                    >
                        No live streams yet
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily: 'Quicksand, sans-serif',
                            color: theme.palette.text.secondary,
                        }}
                    >
                        Create your first live stream to get started
                    </Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                borderRadius: '12px',
                border: `1px solid ${border}`,
                boxShadow: theme.shadows[2],
                overflow: 'hidden',
            }}
        >
            <Table size="medium" aria-label="YouTube lives table">
                <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.background.default }}>
                        <TableCell
                            sx={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                            }}
                        >
                            Title
                        </TableCell>
                        <TableCell
                            sx={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                            }}
                        >
                            Status
                        </TableCell>
                        <TableCell
                            sx={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                            }}
                        >
                            Created
                        </TableCell>
                        <TableCell
                            sx={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                            }}
                        >
                            Archived
                        </TableCell>
                        <TableCell
                            align="right"
                            sx={{
                                fontFamily: 'Quicksand, sans-serif',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                color: theme.palette.text.primary,
                            }}
                        >
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {lives.map((live) => {
                        const id = live._id || live.id;
                        return (
                            <TableRow
                                key={id}
                                hover
                                sx={{
                                    '&:last-child td': { borderBottom: 0 },
                                    fontFamily: 'Quicksand, sans-serif',
                                }}
                            >
                                <TableCell
                                    sx={{
                                        fontFamily: 'Quicksand, sans-serif',
                                        fontWeight: 500,
                                        maxWidth: 280,
                                    }}
                                >
                                    <Typography
                                        noWrap
                                        title={live.title}
                                        sx={{
                                            fontFamily: 'Quicksand, sans-serif',
                                            fontWeight: 500,
                                            fontSize: '0.9375rem',
                                        }}
                                    >
                                        {live.title || '—'}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.875rem' }}>
                                    <Chip
                                        label={live.status || 'created'}
                                        size="small"
                                        sx={{
                                            fontFamily: 'Quicksand, sans-serif',
                                            fontWeight: 600,
                                            textTransform: 'capitalize',
                                            backgroundColor: `${orange}20`,
                                            color: theme.palette.text.primary,
                                            border: `1px solid ${orange}`,
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'Quicksand, sans-serif', fontSize: '0.875rem' }}>
                                    {formatDate(live.createdAt)}
                                </TableCell>
                                <TableCell>
                                    {live.isArchived ? (
                                        <Chip
                                            label="Archived"
                                            size="small"
                                            color="default"
                                            variant="outlined"
                                            sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 600 }}
                                        />
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: 'Quicksand, sans-serif',
                                                color: theme.palette.text.secondary,
                                            }}
                                        >
                                            —
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="View details" arrow>
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => onView(live)}
                                                disabled={actionLoading}
                                                aria-label={`View ${live.title}`}
                                                sx={{
                                                    color: orange,
                                                    '&:hover': { backgroundColor: `${orange}14` },
                                                }}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    {onEnd && live.status !== 'complete' && (
                                        <Tooltip title="End stream (stop on YouTube)" arrow>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onEnd(live)}
                                                    disabled={actionLoading}
                                                    aria-label={`End stream ${live.title}`}
                                                    sx={{
                                                        color: theme.palette.warning?.main || themeColors.warning,
                                                        '&:hover': { backgroundColor: `${theme.palette.warning?.main || themeColors.warning}14` },
                                                    }}
                                                >
                                                    <StopIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    {!live.isArchived && (
                                        <Tooltip title="Archive" arrow>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onArchive(live)}
                                                    disabled={actionLoading}
                                                    aria-label={`Archive ${live.title}`}
                                                    sx={{
                                                        color: theme.palette.text.secondary,
                                                        '&:hover': { backgroundColor: `${orange}14` },
                                                    }}
                                                >
                                                    <ArchiveIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Delete" arrow>
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(live)}
                                                disabled={actionLoading}
                                                aria-label={`Delete ${live.title}`}
                                                sx={{
                                                    color: theme.palette.error.main,
                                                    '&:hover': { backgroundColor: `${theme.palette.error.main}14` },
                                                }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default YoutubeLiveList;
