import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Close as CloseIcon,
    ContentCopy as ContentCopyIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { themeColors } from '../../../config/themeColors';
import { launchScorm } from '../../../services/scormService';

/** Map frontend contentType to backend format (same as child ScormPlayer). */
const toBackendContentType = (contentType) =>
    contentType === 'video'
        ? 'video'
        : contentType === 'book'
            ? 'book'
            : contentType === 'chant'
                ? 'chant'
                : contentType === 'audioAssignment'
                    ? 'audioAssignment'
                    : contentType;

const safeNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : null;
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const getStatusLabel = (status) => {
    switch (status) {
        case 'completed':
            return 'Completed';
        case 'passed':
            return 'Passed';
        case 'failed':
            return 'Failed';
        case 'incomplete':
            return 'In Progress';
        case 'browsed':
            return 'Browsed';
        default:
            return 'Not Attempted';
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'completed':
        case 'passed':
            return themeColors.success;
        case 'failed':
            return themeColors.error;
        case 'incomplete':
        case 'browsed':
            return themeColors.accent;
        default:
            return themeColors.textMuted;
    }
};

const StatRow = ({ label, value, monospace = false }) => (
    <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography
            variant="caption"
            sx={{
                fontFamily: 'Quicksand, sans-serif',
                color: themeColors.textSecondary,
                fontWeight: 700,
                letterSpacing: '0.02em',
            }}
        >
            {label}
        </Typography>
        <Typography
            variant="caption"
            sx={{
                fontFamily: monospace ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'Quicksand, sans-serif',
                color: themeColors.text,
                fontWeight: 700,
                textAlign: 'right',
                maxWidth: '65%',
                wordBreak: 'break-word',
            }}
        >
            {value ?? '—'}
        </Typography>
    </Box>
);

/**
 * AdminTestScormModal
 *
 * Admin/Teacher testing modal for SCORM content.
 * Uses the same flow as child ScormPlayer: same launch API, wrapper URL in iframe,
 * no API injection (wrapper injects API), stats from postMessage SCORM_PROGRESS.
 */
export default function AdminTestScormModal({
    open,
    onClose,
    contentId,
    contentType,
    contentTitle = 'SCORM Test',
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    const iframeRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [launchUrl, setLaunchUrl] = useState(null);
    const [apiReady, setApiReady] = useState(false);
    const [events, setEvents] = useState([]);

    const [snapshot, setSnapshot] = useState({
        lessonStatus: 'not attempted',
        scoreRaw: null,
        scoreMin: null,
        scoreMax: null,
        progressMeasure: null,
        totalTime: '00:00:00.00',
        lessonLocation: '',
        entry: '',
        exit: '',
        suspendDataLength: 0,
    });

    const computed = useMemo(() => {
        const raw = safeNumber(snapshot.scoreRaw);
        const min = safeNumber(snapshot.scoreMin) ?? 0;
        const max = safeNumber(snapshot.scoreMax) ?? 100;
        let scorePct = null;
        if (raw !== null && max !== null && max !== min) {
            scorePct = clamp01((raw - min) / (max - min));
        }

        const pm = safeNumber(snapshot.progressMeasure);
        const progressPct = pm !== null ? clamp01(pm) : null;

        return {
            scorePct,
            progressPct,
        };
    }, [snapshot]);

    const pushEvent = (evt) => {
        setEvents((prev) => {
            const next = [{ ...evt }, ...prev];
            return next.slice(0, 30);
        });
    };

    const resetState = () => {
        setLoading(true);
        setError(null);
        setLaunchUrl(null);
        setApiReady(false);
        setEvents([]);
        setSnapshot({
            lessonStatus: 'not attempted',
            scoreRaw: null,
            scoreMin: null,
            scoreMax: null,
            progressMeasure: null,
            totalTime: '00:00:00.00',
            lessonLocation: '',
            entry: '',
            exit: '',
            suspendDataLength: 0,
        });
    };

    const cleanup = () => {
        try {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'SCORM_FINISH' }, '*');
            }
        } catch (e) {
            // ignore
        }
        resetState();
    };

    useEffect(() => {
        if (!open || !contentId || !contentType) {
            cleanup();
            return;
        }

        let mounted = true;
        resetState();

        const backendContentType = toBackendContentType(contentType);

        (async () => {
            try {
                setLoading(true);
                const res = await launchScorm(contentId, backendContentType);
                if (!mounted) return;
                if (res?.success && res?.data?.launchUrl) {
                    setLaunchUrl(res.data.launchUrl);
                    setError(null);
                } else {
                    throw new Error(res?.message || 'Failed to get SCORM launch URL');
                }
            } catch (e) {
                if (!mounted) return;
                setError(e?.message || 'Failed to load SCORM content');
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, contentId, contentType]);

    // Iframe load: same as child – wrapper injects API, we just mark ready after delay
    useEffect(() => {
        if (!open || !launchUrl || !iframeRef.current) return;

        const iframe = iframeRef.current;

        const handleIframeLoad = () => {
            setTimeout(() => {
                setApiReady(true);
                setLoading(false);
            }, 1000);
        };

        iframe.addEventListener('load', handleIframeLoad);
        return () => iframe.removeEventListener('load', handleIframeLoad);
    }, [open, launchUrl]);

    // postMessage from wrapper (same as child ScormPlayer)
    useEffect(() => {
        if (!open) return;

        const handleMessage = (event) => {
            if (!event?.data || event.data.type !== 'SCORM_PROGRESS') return;
            const d = event.data.data || {};
            const status = d.status || 'not attempted';
            const score = d.score;
            const scoreMax = d.scoreMax;
            const timeSpent = d.timeSpent || '00:00:00.00';
            const progress = d.progress;
            const lessonLocation = d.lessonLocation || '';
            const exit = d.exit || '';
            const suspendData = d.suspendData;

            setSnapshot((prev) => ({
                ...prev,
                lessonStatus: status,
                scoreRaw: score != null ? score : prev.scoreRaw,
                scoreMax: scoreMax != null ? scoreMax : prev.scoreMax,
                totalTime: timeSpent,
                progressMeasure: progress != null ? progress : prev.progressMeasure,
                lessonLocation,
                exit,
                suspendDataLength: typeof suspendData === 'string' ? suspendData.length : (d.suspendDataLength ?? prev.suspendDataLength),
            }));

            pushEvent({ type: 'SCORM_PROGRESS', at: Date.now(), status, score, timeSpent });
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [open]);

    const handleClose = () => {
        try {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'SCORM_SAVE' }, '*');
                setTimeout(() => {
                    if (iframe?.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'SCORM_FINISH' }, '*');
                    }
                }, 500);
            }
        } catch (e) {
            // ignore
        }
        cleanup();
        onClose?.();
    };

    const handleRetry = () => {
        setLaunchUrl(null);
        setError(null);
        setApiReady(false);
        setLoading(true);
        const backendContentType = toBackendContentType(contentType);
        launchScorm(contentId, backendContentType)
            .then((res) => {
                if (res?.success && res?.data?.launchUrl) {
                    setLaunchUrl(res.data.launchUrl);
                    setError(null);
                } else {
                    setError(res?.message || 'Failed to get SCORM launch URL');
                    setLoading(false);
                }
            })
            .catch((e) => {
                setError(e?.message || 'Failed to load SCORM content');
                setLoading(false);
            });
    };

    const handleSaveNow = () => {
        try {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'SCORM_SAVE' }, '*');
            }
        } catch (e) {
            // ignore
        }
    };

    const handleCopyStats = async () => {
        const payload = {
            contentId,
            contentType,
            contentTitle,
            snapshot,
            computed,
            lastEvents: events.slice(0, 10),
            at: new Date().toISOString(),
        };
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            pushEvent({ type: 'COPIED_STATS', at: Date.now() });
        } catch (e) {
            pushEvent({ type: 'COPY_STATS_FAILED', at: Date.now(), error: e?.message || String(e) });
        }
    };

    return (
        <Dialog
            open={!!open}
            onClose={handleClose}
            fullWidth
            maxWidth="xl"
            PaperProps={{
                elevation: 10,
                sx: {
                    borderRadius: '18px',
                    fontFamily: 'Quicksand, sans-serif',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    backgroundColor: themeColors.bgCard,
                },
            }}
            BackdropProps={{
                sx: { backgroundColor: 'rgba(0,0,0,0.65)' },
            }}
        >
            <DialogTitle
                component="div"
                sx={{
                    px: 0,
                    py: 0,
                    borderBottom: `3px solid ${themeColors.orange}`,
                    backgroundColor: themeColors.bgCard,
                    boxShadow: `0 2px 12px ${themeColors.borderOrange}`,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 2.5,
                        px: 3,
                        py: 3,
                    }}
                >
                    {/* Left: title + stats */}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily: 'Quicksand, sans-serif',
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    color: themeColors.orange,
                                    letterSpacing: '0.02em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Test SCORM
                            </Typography>
                            <Typography
                                component="span"
                                sx={{
                                    fontFamily: 'Quicksand, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '1.5rem',
                                    color: themeColors.text,
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }}
                                title={contentTitle}
                            >
                                {contentTitle}
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1.25,
                                alignItems: 'center',
                            }}
                        >
                            <Chip
                                size="small"
                                label={getStatusLabel(snapshot.lessonStatus)}
                                sx={{
                                    height: 28,
                                    backgroundColor: getStatusColor(snapshot.lessonStatus),
                                    color: themeColors.textInverse,
                                    fontFamily: 'Quicksand, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                }}
                            />
                            {computed.scorePct !== null && (
                                <Chip
                                    size="small"
                                    label={`Score ${Math.round(computed.scorePct * 100)}%`}
                                    sx={{
                                        height: 28,
                                        backgroundColor: themeColors.orange,
                                        color: themeColors.textInverse,
                                        fontFamily: 'Quicksand, sans-serif',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                    }}
                                />
                            )}
                            {computed.progressPct !== null && (
                                <Chip
                                    size="small"
                                    label={`Progress ${Math.round(computed.progressPct * 100)}%`}
                                    sx={{
                                        height: 28,
                                        backgroundColor: themeColors.secondary,
                                        color: themeColors.textInverse,
                                        fontFamily: 'Quicksand, sans-serif',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                    }}
                                />
                            )}
                            <Chip
                                size="small"
                                label={`Time ${snapshot.totalTime || '00:00:00.00'}`}
                                sx={{
                                    height: 28,
                                    backgroundColor: themeColors.textInverse,
                                    color: themeColors.text,
                                    fontFamily: 'Quicksand, sans-serif',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    border: `2px solid ${themeColors.orange}`,
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Right: actions – white + orange */}
                    <Stack
                        direction="row"
                        spacing={1.25}
                        sx={{
                            flexShrink: 0,
                            alignItems: 'center',
                            alignSelf: { xs: 'flex-end', sm: 'center' },
                        }}
                    >
                        <Tooltip title="Copy stats JSON" arrow>
                            <IconButton
                                onClick={handleCopyStats}
                                size="medium"
                                aria-label="Copy SCORM stats"
                                sx={{
                                    borderRadius: '12px',
                                    backgroundColor: themeColors.textInverse,
                                    border: `2px solid ${themeColors.orange}`,
                                    color: themeColors.orange,
                                    '&:hover': {
                                        backgroundColor: themeColors.orange,
                                        color: themeColors.textInverse,
                                        borderColor: themeColors.orange,
                                    },
                                }}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Save progress now" arrow>
                            <span>
                                <IconButton
                                    onClick={handleSaveNow}
                                    size="medium"
                                    disabled={!apiReady}
                                    aria-label="Save SCORM progress"
                                    sx={{
                                        borderRadius: '12px',
                                        backgroundColor: themeColors.textInverse,
                                        border: `2px solid ${themeColors.orange}`,
                                        color: themeColors.orange,
                                        '&:hover': {
                                            backgroundColor: themeColors.orange,
                                            color: themeColors.textInverse,
                                            borderColor: themeColors.orange,
                                        },
                                        '&.Mui-disabled': {
                                            borderColor: themeColors.border,
                                            color: themeColors.textMuted,
                                        },
                                    }}
                                >
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Reload SCORM test" arrow>
                            <IconButton
                                onClick={handleRetry}
                                size="medium"
                                aria-label="Reload SCORM test"
                                sx={{
                                    borderRadius: '12px',
                                    backgroundColor: themeColors.textInverse,
                                    border: `2px solid ${themeColors.orange}`,
                                    color: themeColors.orange,
                                    '&:hover': {
                                        backgroundColor: themeColors.orange,
                                        color: themeColors.textInverse,
                                        borderColor: themeColors.orange,
                                    },
                                }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <IconButton
                            onClick={handleClose}
                            aria-label="Close SCORM test"
                            sx={{
                                borderRadius: '12px',
                                backgroundColor: themeColors.orange,
                                color: themeColors.textInverse,
                                border: `2px solid ${themeColors.orange}`,
                                ml: 0.5,
                                '&:hover': {
                                    backgroundColor: themeColors.textInverse,
                                    borderColor: themeColors.orange,
                                    color: themeColors.orange,
                                },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, backgroundColor: themeColors.bgSecondary }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: isSmall ? '1fr' : '360px 1fr',
                        height: isSmall ? 'auto' : 'calc(90vh - 215px)',
                        minHeight: '640px',
                    }}
                >
                    {/* Stats panel */}
                    <Box
                        sx={{
                            borderRight: isSmall ? 'none' : `1px solid ${theme.palette.border.main}`,
                            borderBottom: isSmall ? `1px solid ${theme.palette.border.main}` : 'none',
                            backgroundColor: themeColors.bgCard,
                            p: 2.25,
                            overflow: 'auto',
                        }}
                    >
                        <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 900, fontSize: '0.95rem', mb: 1.5 }}>
                            Live Statistics
                        </Typography>

                        <Stack spacing={1.25}>
                            <StatRow label="Content ID" value={contentId} monospace />
                            <StatRow label="Content Type" value={contentType} monospace />
                            <Divider />

                            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 900, fontSize: '0.85rem' }}>
                                Progress
                            </Typography>
                            <StatRow label="Lesson status" value={snapshot.lessonStatus} monospace />
                            <StatRow label="Lesson location" value={snapshot.lessonLocation || '—'} monospace />
                            <StatRow label="Entry" value={snapshot.entry || '—'} monospace />
                            <StatRow label="Exit" value={snapshot.exit || '—'} monospace />
                            <StatRow label="Total time" value={snapshot.totalTime || '00:00:00.00'} monospace />
                            <StatRow
                                label="Progress"
                                value={snapshot.progressMeasure != null ? `${Math.round(computed.progressPct * 100)}%` : '—'}
                                monospace
                            />

                            <Divider />
                            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 900, fontSize: '0.85rem' }}>
                                Score
                            </Typography>
                            <StatRow label="Raw" value={snapshot.scoreRaw ?? '—'} monospace />
                            <StatRow label="Min" value={snapshot.scoreMin ?? '—'} monospace />
                            <StatRow label="Max" value={snapshot.scoreMax ?? '—'} monospace />

                            <Divider />
                            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 900, fontSize: '0.85rem' }}>
                                Data
                            </Typography>
                            <StatRow label="Suspend data length" value={snapshot.suspendDataLength} monospace />
                            <StatRow label="Wrapper ready" value={apiReady ? 'Yes' : 'No'} />

                            <Divider />{/* 
                            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 900, fontSize: '0.85rem' }}>
                                Recent events
                            </Typography>
                            <Stack spacing={0.75}>
                                {(events || []).slice(0, 8).map((e, idx) => (
                                    <Box
                                        key={`${e.type}-${e.at}-${idx}`}
                                        sx={{
                                            p: 1,
                                            borderRadius: '10px',
                                            border: `1px solid ${theme.palette.border.main}`,
                                            backgroundColor: themeColors.bgSecondary,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                fontWeight: 800,
                                                color: themeColors.text,
                                            }}
                                        >
                                            {e.type}
                                        </Typography>
                                        {(e.status != null || e.score != null || e.timeSpent != null || e.element || e.error) && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'block',
                                                    mt: 0.25,
                                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                    color: themeColors.textSecondary,
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {e.type === 'SCORM_PROGRESS'
                                                    ? [e.status, e.score != null ? `score ${e.score}` : '', e.timeSpent].filter(Boolean).join(' · ')
                                                    : e.element ? `${e.element}` : e.error ? ` ${e.error}` : ''}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                                {events.length === 0 && (
                                    <Typography
                                        variant="caption"
                                        sx={{ fontFamily: 'Quicksand, sans-serif', color: themeColors.textSecondary, fontWeight: 700 }}
                                    >
                                        No events yet.
                                    </Typography>
                                )}
                            </Stack> */}
                        </Stack>
                    </Box>

                    {/* Player panel */}
                    <Box sx={{ position: 'relative', backgroundColor: '#000' }}>
                        {loading && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: themeColors.bgCard,
                                    zIndex: 3,
                                    gap: 2,
                                }}
                            >
                                <CircularProgress sx={{ color: themeColors.orange }} />
                                <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: themeColors.textSecondary }}>
                                    Loading SCORM…
                                </Typography>
                            </Box>
                        )}

                        {error && (
                            <Box sx={{ p: 3, backgroundColor: themeColors.bgCard, height: '100%' }}>
                                <Alert severity="error" sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                                    {error}
                                </Alert>
                                <Button
                                    onClick={handleRetry}
                                    variant="contained"
                                    sx={{
                                        mt: 2,
                                        backgroundColor: themeColors.orange,
                                        color: themeColors.textInverse,
                                        fontFamily: 'Quicksand, sans-serif',
                                        fontWeight: 800,
                                        textTransform: 'none',
                                        borderRadius: '12px',
                                        px: 3,
                                        border: `2px solid ${themeColors.orange}`,
                                        '&:hover': {
                                            backgroundColor: themeColors.text,
                                            borderColor: themeColors.text,
                                        },
                                    }}
                                >
                                    Retry
                                </Button>
                            </Box>
                        )}

                        {launchUrl && !error && (
                            <iframe
                                ref={iframeRef}
                                src={launchUrl}
                                title="SCORM Test Player"
                                style={{ width: '100%', height: '100%', minHeight: 640, border: 'none', display: loading ? 'none' : 'block' }}
                                allow="fullscreen"
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2.5,
                    borderTop: `2px solid ${themeColors.borderOrange}`,
                    backgroundColor: themeColors.bgCard,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                }}
            >
                <Typography
                    sx={{
                        fontFamily: 'Quicksand, sans-serif',
                        color: themeColors.textSecondary,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                    }}
                >
                    Testing mode: progress is saved automatically (same as learner experience).
                </Typography>

                <Stack direction="row" spacing={1.5}>
{/*                     <Button
                        onClick={handleSaveNow}
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        disabled={!apiReady}
                        sx={{
                            borderRadius: '12px',
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 800,
                            textTransform: 'none',
                            borderWidth: 2,
                            borderColor: themeColors.orange,
                            color: themeColors.orange,
                            backgroundColor: themeColors.textInverse,
                            px: 2.5,
                            '&:hover': {
                                borderWidth: 2,
                                borderColor: themeColors.orange,
                                backgroundColor: themeColors.orange,
                                color: themeColors.textInverse,
                            },
                            '&.Mui-disabled': {
                                borderColor: themeColors.border,
                                color: themeColors.textMuted,
                            },
                        }}
                    >
                        Save now
                    </Button> */}
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        sx={{
                            borderRadius: '12px',
                            backgroundColor: themeColors.orange,
                            color: themeColors.textInverse,
                            fontFamily: 'Quicksand, sans-serif',
                            fontWeight: 800,
                            textTransform: 'none',
                            px: 3,
                            boxShadow: `0 2px 8px ${themeColors.borderOrange}`,
                            border: `2px solid ${themeColors.orange}`,
                            '&:hover': {
                                backgroundColor: themeColors.textInverse,
                                color: themeColors.orange,
                            },
                        }}
                    >
                        Close
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
}

