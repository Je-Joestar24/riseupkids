import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import retryButtonImage from '../../../../assets/images/book/retry_button.png';
import {
  imageActionButtonSx,
  pageFrameSx,
  resolveImageUrl,
} from './shared';

const InteractiveTest = ({
  page,
  isPreloading,
  onPickOption,
  onRetry,
  onCorrectDrop,
}) => {
  const optionAudioRef = useRef(null);
  const stageRef = useRef(null);
  const dropZoneRefs = useRef({});
  const optionRefs = useRef({});
  const [playingOptionId, setPlayingOptionId] = useState('');
  const [optionPositions, setOptionPositions] = useState({});
  const [dragState, setDragState] = useState(null);
  const [dragLayer, setDragLayer] = useState(null);
  const [resetSeed, setResetSeed] = useState(0);
  const [placedByZone, setPlacedByZone] = useState({});
  const [placedByOption, setPlacedByOption] = useState({});
  const [dropResult, setDropResult] = useState('');
  const bgImage = resolveImageUrl(page);
  const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];
  const guideImageUrls = useMemo(() => {
    const fromList = Array.isArray(page?.media?.guideImageMedias)
      ? page.media.guideImageMedias.map((item) => item?.url).filter(Boolean)
      : [];
    const single = page?.media?.guideImageMedia?.url || page?.media?.guideImage?.url || '';
    return fromList.length ? fromList : (single ? [single] : []);
  }, [page]);
  const dropZoneItems = useMemo(() => (
    dropZones.map((zone, index) => ({
      id: zone?.zoneId || `zone_${index + 1}`,
      label: zone?.label || `Answer ${index + 1}`,
      correctOptionId: zone?.correctOptionId || '',
      guideImageUrl: guideImageUrls[index] || guideImageUrls[0] || '',
    }))
  ), [dropZones, guideImageUrls]);
  const interactionType = page?.type || page?.interaction?.kind || '';
  const isParallelInteraction = dropZoneItems.length > 1
    || interactionType === 'activity_drag_2x2'
    || interactionType === 'drag_2x2';
  const isSingleLayout = !isParallelInteraction;
  const isInteractionLocked = dropZoneItems.length === 1 && Object.keys(placedByZone).length > 0;
  const allDropZonesCorrect = useMemo(
    () => dropZoneItems.length > 0 && dropZoneItems.every((zone) => placedByZone[zone.id] === zone.correctOptionId),
    [dropZoneItems, placedByZone]
  );
  const firstOptionSource = page?.interaction?.options?.[0] || {};
  const secondOptionSource = page?.interaction?.options?.[1] || {};
  const options = useMemo(() => ([
    {
      id: firstOptionSource?.optionId || 'option_one',
      label: firstOptionSource?.label || 'Option 1',
      image: page?.optionImageOne || firstOptionSource?.imageUrl || firstOptionSource?.image?.url || firstOptionSource?.imageMedia?.url || '',
      audio: firstOptionSource?.audioUrl || firstOptionSource?.audio?.url || firstOptionSource?.audioMedia?.url || '',
    },
    {
      id: secondOptionSource?.optionId || 'option_two',
      label: secondOptionSource?.label || 'Option 2',
      image: page?.optionImageTwo || secondOptionSource?.imageUrl || secondOptionSource?.image?.url || secondOptionSource?.imageMedia?.url || '',
      audio: secondOptionSource?.audioUrl || secondOptionSource?.audio?.url || secondOptionSource?.audioMedia?.url || '',
    },
  ].filter((option, index) => {
    if (index === 0) return Boolean(option.image || option.audio || firstOptionSource?.label);
    return Boolean(option.image || option.audio || secondOptionSource?.label);
  })), [firstOptionSource, secondOptionSource, page?.optionImageOne, page?.optionImageTwo]);
  const requiredPlacements = Math.min(dropZoneItems.length, options.length);
  const optionsSignature = useMemo(() => options.map((option) => option.id).join('|'), [options]);

  useEffect(() => {
    if (!allDropZonesCorrect) return undefined;
    const timer = setTimeout(() => {
      onCorrectDrop?.();
    }, 1000);
    return () => clearTimeout(timer);
  }, [allDropZonesCorrect, onCorrectDrop]);

  useEffect(() => {
    const computeInitialPositions = () => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      const isMobile = stageRect.width < 900;
      const cardWidth = isSingleLayout
        ? (isMobile ? Math.min(420, stageRect.width * 0.62) : 320)
        : (isMobile ? Math.min(170, stageRect.width * 0.24) : 180);
      const cardHeight = isSingleLayout ? (isMobile ? 240 : 272) : (isMobile ? 120 : 136);
      const gap = isSingleLayout ? (isMobile ? 8.4 * 8 : 12 * 8) : (isMobile ? 16.8 * 8 : 24 * 8);
      const totalWidth = (options.length * cardWidth) + ((options.length - 1) * gap);
      const startLeft = Math.max(16, (stageRect.width - totalWidth) / 2);
      const top = isSingleLayout
        ? ((stageRect.height - cardHeight) / 2)
        : (stageRect.height - cardHeight - (isMobile ? 336 : 112));

      const nextPositions = {};
      options.forEach((option, index) => {
        nextPositions[option.id] = {
          x: startLeft + (index * (cardWidth + gap)),
          y: top,
        };
      });
      setOptionPositions(nextPositions);
    };

    const raf = requestAnimationFrame(computeInitialPositions);
    window.addEventListener('resize', computeInitialPositions);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computeInitialPositions);
    };
  }, [isSingleLayout, optionsSignature, resetSeed]);

  const playOptionAudio = (option) => {
    if (isPreloading) return;
    if (isInteractionLocked) return;
    if (placedByOption[option.id]) return;
    onPickOption?.(option.id);

    if (!option?.audio) return;

    if (optionAudioRef.current) {
      optionAudioRef.current.pause();
      optionAudioRef.current.currentTime = 0;
    }

    optionAudioRef.current = new Audio(option.audio);
    optionAudioRef.current.onended = () => setPlayingOptionId('');
    optionAudioRef.current.onerror = () => setPlayingOptionId('');
    optionAudioRef.current.play().catch(() => {
      setPlayingOptionId('');
    });
    setPlayingOptionId(option.id);
  };

  const handlePointerDown = (event, option) => {
    if (isPreloading || !stageRef.current) return;
    if (isInteractionLocked) return;
    if (placedByOption[option.id]) return;

    const optionEl = optionRefs.current[option.id];
    const stageRect = stageRef.current.getBoundingClientRect();
    const optionRect = optionEl?.getBoundingClientRect();
    if (!optionRect) return;

    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    const offsetX = event.clientX - optionRect.left;
    const offsetY = event.clientY - optionRect.top;
    const startPosition = optionPositions[option.id] || {
      x: optionRect.left - stageRect.left,
      y: optionRect.top - stageRect.top,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      id: option.id,
      pointerId: event.pointerId,
      offsetX,
      offsetY,
      pointerStartX: pointerX,
      pointerStartY: pointerY,
      startPosition,
      moved: false,
      width: optionRect.width,
      height: optionRect.height,
      option,
    });
    setDragLayer({
      id: option.id,
      x: startPosition.x,
      y: startPosition.y,
      width: optionRect.width,
      height: optionRect.height,
      option,
    });
  };

  const handlePointerMove = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const nextX = event.clientX - stageRect.left - dragState.offsetX;
    const nextY = event.clientY - stageRect.top - dragState.offsetY;
    const movedDistance = Math.hypot(
      (event.clientX - stageRect.left) - dragState.pointerStartX,
      (event.clientY - stageRect.top) - dragState.pointerStartY
    );

    setDragState((prev) => (prev ? { ...prev, moved: prev.moved || movedDistance > 8 } : prev));
    setDragLayer((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev));
  };

  const handlePointerEnd = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId || !stageRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const stageRect = stageRef.current.getBoundingClientRect();
    const finalX = event.clientX - stageRect.left - dragState.offsetX;
    const finalY = event.clientY - stageRect.top - dragState.offsetY;
    const dragRect = {
      left: stageRect.left + finalX,
      top: stageRect.top + finalY,
      right: stageRect.left + finalX + dragState.width,
      bottom: stageRect.top + finalY + dragState.height,
    };

    if (!dragState.moved) {
      playOptionAudio(dragState.option);
      setDragState(null);
      setDragLayer(null);
      return;
    }

    const targetZone = dropZoneItems.find((zone) => {
      const zoneRect = dropZoneRefs.current[zone.id]?.getBoundingClientRect();
      if (!zoneRect) return false;
      return dragRect.right > zoneRect.left
        && dragRect.left < zoneRect.right
        && dragRect.bottom > zoneRect.top
        && dragRect.top < zoneRect.bottom;
    });

    if (targetZone) {
      const zoneRect = dropZoneRefs.current[targetZone.id]?.getBoundingClientRect();
      if (!zoneRect) {
        setDragState(null);
        setDragLayer(null);
        return;
      }
      const occupyingOptionId = placedByZone[targetZone.id];
      if (occupyingOptionId && occupyingOptionId !== dragState.id) {
        setOptionPositions((prev) => ({
          ...prev,
          [dragState.id]: dragState.startPosition,
        }));
        setDropResult('');
        setDragState(null);
        setDragLayer(null);
        return;
      }
      const centeredX = (zoneRect.left - stageRect.left) + ((zoneRect.width - dragState.width) / 2);
      const centeredY = (zoneRect.top - stageRect.top) + ((zoneRect.height - dragState.height) / 2);
      const snapY = isSingleLayout ? centeredY - 320 : centeredY;
      setOptionPositions((prev) => ({
        ...prev,
        [dragState.id]: { x: centeredX, y: snapY },
      }));
      const nextPlacedByZone = { ...placedByZone, [targetZone.id]: dragState.id };
      const nextPlacedByOption = { ...placedByOption, [dragState.id]: targetZone.id };
      setPlacedByZone(nextPlacedByZone);
      setPlacedByOption(nextPlacedByOption);

      if (!isParallelInteraction) {
        setDropResult(dragState.id === targetZone.correctOptionId ? 'correct' : 'wrong');
      } else if (Object.keys(nextPlacedByZone).length >= requiredPlacements) {
        const isAllCorrect = dropZoneItems.every((zone) => nextPlacedByZone[zone.id] === zone.correctOptionId);
        setDropResult(isAllCorrect ? 'correct' : 'wrong');
      } else {
        setDropResult('');
      }
    } else {
      setOptionPositions((prev) => ({
        ...prev,
        [dragState.id]: dragState.startPosition,
      }));
      setDropResult('');
    }

    setDragState(null);
    setDragLayer(null);
  };

  const handleRetryClick = () => {
    if (optionAudioRef.current) {
      optionAudioRef.current.pause();
      optionAudioRef.current.currentTime = 0;
      optionAudioRef.current = null;
    }
    setPlayingOptionId('');
    setDragState(null);
    setDragLayer(null);
    setPlacedByZone({});
    setPlacedByOption({});
    setDropResult('');
    setResetSeed((prev) => prev + 1);
    onRetry?.();
  };

  return (
    <Box ref={stageRef} sx={pageFrameSx}>
      {bgImage ? (
        <Box
          component="img"
          src={bgImage}
          alt={page?.title || 'Interactive preview'}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: { xs: 2, md: 3 },
          background: 'transparent',
        }}
      >
        <Box sx={{ mt: 1, textAlign: 'center', color: 'common.white' }}>
          {page?.subtitle ? (
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', opacity: 0.95 }}>
              {page.subtitle}
            </Typography>
          ) : null}
        </Box>

        <Box role="group" aria-label="Interactive answer options" sx={{ position: 'absolute', inset: 0, zIndex: 5, top: isSingleLayout ? 320: ''}}>
          {options.map((option) => (
            <Box
              key={option.id}
              role="button"
              tabIndex={0}
              aria-label={`Choose ${option.label}`}
              ref={(element) => { optionRefs.current[option.id] = element; }}
              onPointerDown={(event) => handlePointerDown(event, option)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  playOptionAudio(option);
                }
              }}
              sx={{
                position: 'absolute',
                left: optionPositions[option.id]?.x ?? -9999,
                top: optionPositions[option.id]?.y ?? -9999,
                width: isSingleLayout ? { xs: '62%', md: 320 } : { xs: '24%', md: 190 },
                maxWidth: isSingleLayout ? { xs: 420, md: 320 } : { xs: 170, md: 190 },
                minHeight: isSingleLayout ? { xs: 240, md: 272 } : { xs: 120, md: 136 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (isInteractionLocked || placedByOption[option.id])
                  ? 'default'
                  : (dragState?.id === option.id ? 'grabbing' : 'grab'),
                pointerEvents: (isPreloading || isInteractionLocked || Boolean(placedByOption[option.id])) ? 'none' : 'auto',
                overflow: 'hidden',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                transition: dragState?.id === option.id
                  ? 'none'
                  : 'left 0.2s ease, top 0.2s ease, transform 0.2s ease, opacity 0.12s ease',
                opacity: dragState?.id === option.id ? 0 : (playingOptionId && playingOptionId !== option.id ? 0.72 : 1),
                visibility: dragState?.id === option.id ? 'hidden' : 'visible',
                zIndex: placedByOption[option.id] ? 12 : 6,
                '&:hover': {
                  transform: 'scale(1.03)',
                },
              }}
            >
              {option.image ? (
                <Box
                  component="img"
                  src={option.image}
                  alt={option.label}
                  draggable={false}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                  }}
                />
              ) : (
                <Typography sx={{ color: 'common.white', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                  {option.label}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {dropZoneItems.length ? (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: isSingleLayout ? '58%' : '56%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 8, md: 68 },
              zIndex: 4,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {dropZoneItems.map((zone) => (
              <Box
                key={zone.id}
                ref={(element) => { dropZoneRefs.current[zone.id] = element; }}
                role="img"
                aria-label={`${zone.label} drop zone`}
                sx={{
                  width: isSingleLayout ? { xs: '62vw', md: 320 } : { xs: '24vw', md: 180 },
                  maxWidth: isSingleLayout ? { xs: 420, md: 320 } : { xs: 170, md: 180 },
                  minHeight: isSingleLayout ? { xs: 240, md: 272 } : { xs: 120, md: 136 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                }}
              >
                {zone.guideImageUrl ? (
                  <Box
                    component="img"
                    src={zone.guideImageUrl}
                    alt={`${zone.label} guide`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      border: '2px dashed rgba(255,255,255,0.6)',
                      borderRadius: 1.5,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        ) : null}

        {dragLayer ? (
          <Box
            sx={{
              position: 'absolute',
              left: dragLayer.x,
              top: dragLayer.y,
              width: dragLayer.width,
              height: dragLayer.height,
              zIndex: 7,
              pointerEvents: 'none',
            }}
          >
            {dragLayer.option?.image ? (
              <Box
                component="img"
                src={dragLayer.option.image}
                alt={dragLayer.option.label}
                draggable={false}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                }}
              />
            ) : (
              <Typography sx={{ color: 'common.white', fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
                {dragLayer.option?.label || 'Option'}
              </Typography>
            )}
          </Box>
        ) : null}

        {dropResult ? (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: '72%',
              transform: 'translate(-50%, -50%)',
              zIndex: 8,
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Quicksand, sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.6rem', md: '2.1rem' },
                color: (theme) => (dropResult === 'correct'
                  ? (theme.palette.button?.teal || theme.palette.secondary.main)
                  : theme.palette.error.main),
                textAlign: 'center',
                textShadow: '0 1px 2px rgba(0,0,0,0.18)',
              }}
            >
              {dropResult === 'correct' ? 'Good Job!' : 'Try again'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ color: 'common.white', textAlign: 'center', mt: 1.2 }}>
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}>
              Drag to the answer zone or tap to play audio.
            </Typography>
          </Box>
        )}
      </Box>

      <IconButton
        onClick={handleRetryClick}
        disabled={isPreloading}
        aria-label="Retry current page"
        sx={{
          ...imageActionButtonSx,
          position: 'absolute',
          right: { xs: 12, md: 18 },
          bottom: { xs: 44, md: 56 },
          zIndex: 30,
          pointerEvents: 'auto',
        }}
      >
        <img src={retryButtonImage} alt="Retry button" />
      </IconButton>
    </Box>
  );
};

export default InteractiveTest;
