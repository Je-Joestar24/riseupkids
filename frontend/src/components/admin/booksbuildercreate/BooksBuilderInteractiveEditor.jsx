import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  AudiotrackOutlined,
  CloseOutlined,
  ImageOutlined,
  PauseOutlined,
  PlayArrowOutlined,
  UploadFileOutlined,
  WallpaperOutlined,
} from '@mui/icons-material';
import useAudioFileWithSilenceTrim from '../../../hooks/useAudioFileWithSilenceTrim';
import {
  createEmptyInteractiveLayouts,
  resolveBuilderInteractiveLayouts,
} from '../../../utils/cmsInteractiveLayout';
import { getOppositeInteractiveOption } from './BooksBuilderCreate.utils';
import BooksBuilderInteractiveLayoutCanvas from './BooksBuilderInteractiveLayoutCanvas';

const FONT = 'Quicksand, sans-serif';

const interactiveSelectProps = {
  MenuProps: { disableScrollLock: true, keepMounted: false },
};

const readImageFile = (file, onDone) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onDone(reader.result);
  };
  reader.readAsDataURL(file);
};

const SectionLabel = ({ children }) => (
  <Typography
    sx={{
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: '0.78rem',
      color: 'text.secondary',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      mb: 0.75,
    }}
  >
    {children}
  </Typography>
);

const AudioPlayButton = ({ audioUrl, playId, playingId, onPlayingChange }) => {
  const theme = useTheme();
  const audioRef = useRef(null);

  useEffect(() => {
    if (playingId !== playId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [playingId, playId]);

  useEffect(
    () => () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    },
    []
  );

  if (!audioUrl) return null;

  const isPlaying = playingId === playId;

  const handleToggle = (event) => {
    event.stopPropagation();
    if (isPlaying) {
      audioRef.current?.pause();
      onPlayingChange(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      onPlayingChange(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      onPlayingChange(null);
      audioRef.current = null;
    };
    onPlayingChange(playId);
    audio.play().catch(() => onPlayingChange(null));
  };

  return (
    <Tooltip title={isPlaying ? 'Pause preview' : 'Play preview'}>
      <IconButton
        size="small"
        aria-label={isPlaying ? `Pause ${playId} audio` : `Play ${playId} audio`}
        onClick={handleToggle}
        sx={{
          color: isPlaying ? 'primary.main' : 'orange.dark',
          bgcolor: isPlaying ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
        }}
      >
        {isPlaying ? <PauseOutlined fontSize="small" /> : <PlayArrowOutlined fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

const BorderedList = ({ children, ariaLabel }) => {
  const theme = useTheme();
  return (
    <Box
      role="list"
      aria-label={ariaLabel}
      sx={{
        border: `1px solid ${theme.palette.border.main}`,
        borderRadius: '10px',
        bgcolor: theme.palette.common.white,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
};

const AssetRow = ({
  icon: Icon,
  label,
  statusLabel,
  statusColor = 'default',
  isActive = false,
  isLast = false,
  onSelect,
  onUpload,
  onClear,
  clearLabel,
  audioUrl,
  audioPlayId,
  playingAudioId,
  onPlayingAudioChange,
  children,
}) => {
  const theme = useTheme();

  return (
    <Box
      role="listitem"
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      tabIndex={onSelect ? 0 : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.9,
        minHeight: 44,
        cursor: onSelect ? 'pointer' : 'default',
        borderBottom: isLast ? 'none' : `1px solid ${theme.palette.border.main}`,
        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
        transition: 'background-color 0.15s ease',
        '&:hover': onSelect ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : undefined,
      }}
    >
      {Icon ? <Icon sx={{ fontSize: 20, color: 'orange.main', flexShrink: 0 }} /> : null}
      <Typography
        sx={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: '0.84rem',
          flex: children ? '0 0 auto' : 1,
          minWidth: 0,
        }}
        noWrap
      >
        {label}
      </Typography>
      {children ? <Box sx={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>{children}</Box> : <Box sx={{ flex: 1 }} />}
      <Chip
        label={statusLabel}
        size="small"
        color={statusColor}
        variant={statusColor === 'default' ? 'outlined' : 'filled'}
        sx={{ fontFamily: FONT, fontWeight: 700, height: 22, fontSize: '0.65rem', flexShrink: 0 }}
      />
      {audioUrl && audioPlayId ? (
        <AudioPlayButton
          audioUrl={audioUrl}
          playId={audioPlayId}
          playingId={playingAudioId}
          onPlayingChange={onPlayingAudioChange}
        />
      ) : null}
      {onUpload ? (
        <Tooltip title="Upload or replace">
          <IconButton
            size="small"
            aria-label={`Upload ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              onUpload();
            }}
            sx={{ color: 'orange.dark' }}
          >
            <UploadFileOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {onClear ? (
        <Tooltip title={clearLabel || 'Remove'}>
          <IconButton
            size="small"
            aria-label={clearLabel || 'Remove'}
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            sx={{ color: 'text.secondary' }}
          >
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
};

const BooksBuilderInteractiveEditor = ({ page, pageIndex, onOpenTypeMenu, onPatch }) => {
  const theme = useTheme();
  const { processAudioFile, isTrimming } = useAudioFileWithSilenceTrim();
  const backgroundInputRef = useRef(null);
  const sceneOneInputRef = useRef(null);
  const sceneTwoInputRef = useRef(null);
  const answerOneInputRef = useRef(null);
  const answerTwoInputRef = useRef(null);
  const optionImageOneInputRef = useRef(null);
  const optionImageTwoInputRef = useRef(null);
  const optionAudioOneInputRef = useRef(null);
  const optionAudioTwoInputRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState(null);

  const isParallel = page.interactionMode === 'two_options_two_answers';
  const layouts = useMemo(() => resolveBuilderInteractiveLayouts(page), [page]);
  const interactiveOptionChoices = [
    { value: 'option_one', label: 'Option 1' },
    { value: 'option_two', label: 'Option 2' },
  ];

  const patchLayouts = (key, layout) => {
    onPatch({
      interactiveLayouts: {
        ...(page.interactiveLayouts || createEmptyInteractiveLayouts(isParallel)),
        [key]: layout,
      },
    });
  };

  const handleImageUpload = (event, fieldKey) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readImageFile(file, (dataUrl) => onPatch({ [fieldKey]: dataUrl }));
    event.target.value = '';
  };

  const handleAudioUpload = async (event, fieldKey) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const trimmed = await processAudioFile(file);
    if (!trimmed?.audioUrl) return;
    onPatch({ [fieldKey]: trimmed.audioUrl });
  };

  const canvasElements = useMemo(() => {
    const items = [];
    if (page.sceneImageOne) {
      items.push({ key: 'sceneOne', label: 'Scene 1', imageUrl: page.sceneImageOne, layout: layouts.sceneOne, zIndex: 1 });
    }
    if (isParallel && page.sceneImageTwo) {
      items.push({ key: 'sceneTwo', label: 'Scene 2', imageUrl: page.sceneImageTwo, layout: layouts.sceneTwo, zIndex: 1 });
    }
    if (page.guideImageOne) {
      items.push({ key: 'answerOne', label: 'Answer 1', imageUrl: page.guideImageOne, layout: layouts.answerOne, zIndex: 2 });
    }
    if (isParallel && page.guideImageTwo) {
      items.push({ key: 'answerTwo', label: 'Answer 2', imageUrl: page.guideImageTwo, layout: layouts.answerTwo, zIndex: 2 });
    }
    if (page.optionImageOne) {
      items.push({ key: 'optionOne', label: 'Option 1', imageUrl: page.optionImageOne, layout: layouts.optionOne, zIndex: 3 });
    }
    if (page.optionImageTwo) {
      items.push({ key: 'optionTwo', label: 'Option 2', imageUrl: page.optionImageTwo, layout: layouts.optionTwo, zIndex: 3 });
    }
    return items;
  }, [isParallel, layouts, page]);

  const selectSx = {
    '& .MuiInputBase-root': { fontFamily: FONT, fontSize: '0.8rem', height: 32 },
    '& .MuiSelect-select': { py: 0.5 },
  };

  const hiddenInputs = (
    <>
      <input ref={backgroundInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'backgroundImageUrl')} />
      <input ref={sceneOneInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'sceneImageOne')} />
      <input ref={sceneTwoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'sceneImageTwo')} />
      <input ref={answerOneInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'guideImageOne')} />
      <input ref={answerTwoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'guideImageTwo')} />
      <input ref={optionImageOneInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'optionImageOne')} />
      <input ref={optionImageTwoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'optionImageTwo')} />
      <input ref={optionAudioOneInputRef} type="file" accept="audio/*" hidden onChange={(e) => handleAudioUpload(e, 'optionAudioOne')} />
      <input ref={optionAudioTwoInputRef} type="file" accept="audio/*" hidden onChange={(e) => handleAudioUpload(e, 'optionAudioTwo')} />
    </>
  );

  const layerRows = [
    {
      key: 'background',
      canvasKey: null,
      icon: WallpaperOutlined,
      label: 'Background',
      hasFile: Boolean(page.backgroundImageUrl),
      optional: true,
      upload: () => backgroundInputRef.current?.click(),
      clear: page.backgroundImageUrl
        ? () => onPatch({ backgroundImageUrl: '', backgroundImageMediaId: null })
        : null,
    },
    {
      key: 'sceneOne',
      canvasKey: 'sceneOne',
      icon: ImageOutlined,
      label: 'Scene image 1',
      hasFile: Boolean(page.sceneImageOne),
      upload: () => sceneOneInputRef.current?.click(),
      clear: page.sceneImageOne ? () => onPatch({ sceneImageOne: '', sceneImageOneMediaId: null }) : null,
    },
    ...(isParallel
      ? [{
          key: 'sceneTwo',
          canvasKey: 'sceneTwo',
          icon: ImageOutlined,
          label: 'Scene image 2',
          hasFile: Boolean(page.sceneImageTwo),
          upload: () => sceneTwoInputRef.current?.click(),
          clear: page.sceneImageTwo ? () => onPatch({ sceneImageTwo: '', sceneImageTwoMediaId: null }) : null,
        }]
      : []),
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
      {hiddenInputs}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography
          role="button"
          tabIndex={0}
          aria-label={`Change page type for page ${pageIndex + 1}`}
          onClick={(event) => onOpenTypeMenu(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpenTypeMenu(event.currentTarget);
            }
          }}
          sx={{
            color: 'orange.dark',
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: '0.82rem',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Change page type
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(260px, 0.82fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <BooksBuilderInteractiveLayoutCanvas
          backgroundImageUrl={page.backgroundImageUrl || ''}
          elements={canvasElements}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          onLayoutChange={patchLayouts}
        />

        <Box
          component="aside"
          aria-label="Interactive page asset panel"
          sx={{
            borderRadius: '12px',
            border: `1px solid ${theme.palette.border.main}`,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
            maxHeight: { lg: 'calc(100vh - 220px)' },
            overflowY: 'auto',
          }}
        >
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${theme.palette.border.main}`, bgcolor: 'common.white' }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: '0.92rem' }}>
              Assets
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>
              Tap row for canvas · ↑ upload · ▶ preview audio
            </Typography>
            {isTrimming ? (
              <Typography variant="caption" sx={{ fontFamily: FONT, color: 'warning.main', fontWeight: 700 }}>
                Trimming audio…
              </Typography>
            ) : null}
          </Box>

          <Stack spacing={1.5} sx={{ p: 1.25 }}>
            <Box>
              <SectionLabel>Layers</SectionLabel>
              <BorderedList ariaLabel="Background and scene">
                {layerRows.map((row, index) => (
                  <AssetRow
                    key={row.key}
                    icon={row.icon}
                    label={row.label}
                    statusLabel={row.hasFile ? 'Set' : row.optional ? 'Optional' : 'Empty'}
                    statusColor={row.hasFile ? 'success' : 'default'}
                    isActive={row.canvasKey ? selectedKey === row.canvasKey : false}
                    isLast={index === layerRows.length - 1}
                    onSelect={row.canvasKey ? () => setSelectedKey(row.canvasKey) : undefined}
                    onUpload={row.upload}
                    onClear={row.clear}
                    clearLabel={`Remove ${row.label}`}
                  />
                ))}
              </BorderedList>
            </Box>

            <Box>
              <SectionLabel>Answers</SectionLabel>
              <BorderedList ariaLabel="Answer zones">
                <AssetRow
                  icon={ImageOutlined}
                  label="Answer 1 image"
                  statusLabel={page.guideImageOne ? 'Set' : 'Empty'}
                  statusColor={page.guideImageOne ? 'success' : 'warning'}
                  isActive={selectedKey === 'answerOne'}
                  onSelect={() => setSelectedKey('answerOne')}
                  onUpload={() => answerOneInputRef.current?.click()}
                  onClear={page.guideImageOne ? () => onPatch({ guideImageOne: '', guideImageMediaId: null }) : null}
                />
                <AssetRow
                  label="Answer 1 → option"
                  statusLabel={page.answerOneCorrectOptionId ? 'Set' : 'Pick'}
                  statusColor={page.answerOneCorrectOptionId ? 'success' : 'warning'}
                  isLast={!isParallel}
                  onSelect={() => setSelectedKey('answerOne')}
                >
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={page.answerOneCorrectOptionId || ''}
                    SelectProps={interactiveSelectProps}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (isParallel) {
                        onPatch({
                          answerOneCorrectOptionId: next,
                          answerTwoCorrectOptionId: getOppositeInteractiveOption(next),
                        });
                        return;
                      }
                      onPatch({ answerOneCorrectOptionId: next });
                    }}
                    sx={selectSx}
                  >
                    {interactiveOptionChoices.map((option) => (
                      <MenuItem key={option.value} value={option.value} sx={{ fontFamily: FONT }}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </AssetRow>
                {isParallel ? (
                  <>
                    <AssetRow
                      icon={ImageOutlined}
                      label="Answer 2 image"
                      statusLabel={page.guideImageTwo ? 'Set' : 'Empty'}
                      statusColor={page.guideImageTwo ? 'success' : 'warning'}
                      isActive={selectedKey === 'answerTwo'}
                      onSelect={() => setSelectedKey('answerTwo')}
                      onUpload={() => answerTwoInputRef.current?.click()}
                      onClear={page.guideImageTwo ? () => onPatch({ guideImageTwo: '' }) : null}
                    />
                    <AssetRow
                      label="Answer 2 → option"
                      statusLabel={page.answerTwoCorrectOptionId ? 'Set' : 'Pick'}
                      statusColor={page.answerTwoCorrectOptionId ? 'success' : 'warning'}
                      isLast
                      onSelect={() => setSelectedKey('answerTwo')}
                    >
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={page.answerTwoCorrectOptionId || ''}
                        SelectProps={interactiveSelectProps}
                        onChange={(event) => {
                          const next = event.target.value;
                          onPatch({
                            answerTwoCorrectOptionId: next,
                            answerOneCorrectOptionId: getOppositeInteractiveOption(next),
                          });
                        }}
                        sx={selectSx}
                      >
                        {interactiveOptionChoices.map((option) => (
                          <MenuItem key={option.value} value={option.value} sx={{ fontFamily: FONT }}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </AssetRow>
                  </>
                ) : null}
              </BorderedList>
            </Box>

            <Box>
              <SectionLabel>Options (drag on canvas)</SectionLabel>
              <BorderedList ariaLabel="Draggable options">
                {[
                  {
                    key: 'optionOne',
                    label: 'Option 1',
                    image: page.optionImageOne,
                    audio: page.optionAudioOne,
                    imageRef: optionImageOneInputRef,
                    audioRef: optionAudioOneInputRef,
                    imageField: 'optionImageOne',
                    audioField: 'optionAudioOne',
                  },
                  {
                    key: 'optionTwo',
                    label: 'Option 2',
                    image: page.optionImageTwo,
                    audio: page.optionAudioTwo,
                    imageRef: optionImageTwoInputRef,
                    audioRef: optionAudioTwoInputRef,
                    imageField: 'optionImageTwo',
                    audioField: 'optionAudioTwo',
                  },
                ].flatMap((opt, index) => {
                  const isLastOption = index === 1;
                  return [
                    <AssetRow
                      key={`${opt.key}-icon`}
                      icon={ImageOutlined}
                      label={`${opt.label} icon`}
                      statusLabel={opt.image ? 'Set' : 'Empty'}
                      statusColor={opt.image ? 'success' : 'warning'}
                      isActive={selectedKey === opt.key}
                      onSelect={() => setSelectedKey(opt.key)}
                      onUpload={() => opt.imageRef.current?.click()}
                      onClear={opt.image ? () => onPatch({ [opt.imageField]: '' }) : null}
                    />,
                    <AssetRow
                      key={`${opt.key}-audio`}
                      icon={AudiotrackOutlined}
                      label={`${opt.label} audio`}
                      statusLabel={opt.audio ? 'Set' : 'Empty'}
                      statusColor={opt.audio ? 'success' : 'warning'}
                      isActive={selectedKey === opt.key}
                      isLast={isLastOption}
                      onSelect={() => setSelectedKey(opt.key)}
                      audioUrl={opt.audio}
                      audioPlayId={`${opt.key}-audio`}
                      playingAudioId={playingAudioId}
                      onPlayingAudioChange={setPlayingAudioId}
                      onUpload={() => opt.audioRef.current?.click()}
                      onClear={
                        opt.audio
                          ? () => {
                              if (playingAudioId === `${opt.key}-audio`) setPlayingAudioId(null);
                              onPatch({ [opt.audioField]: '' });
                            }
                          : null
                      }
                    />,
                  ];
                })}
              </BorderedList>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default BooksBuilderInteractiveEditor;
