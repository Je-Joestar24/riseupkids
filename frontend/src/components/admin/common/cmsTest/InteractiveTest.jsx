import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Typography } from '@mui/material';
import {
  extractInteractiveLayoutsFromCms,
  hasCustomInteractiveLayout,
  layoutRectToPx,
} from '../../../../utils/cmsInteractiveLayout';
import {
  pageFrameSx,
  resolveCmsAbsoluteMediaUrl,
  resolveDropZoneAudioUrl,
  resolveImageUrl,
} from './shared';
import { resolveCmsInteractiveFeedbackAudioUrl } from './cmsInteractiveFeedbackAudio';
import {
  CMS_GOOD_JOB_ADVANCE_DELAY_MS,
  CMS_GOOD_JOB_ADVANCE_FALLBACK_MS,
} from './cmsInteractiveFeedbackConstants';
import CmsInteractiveResultToast from './CmsInteractiveResultToast';

const DESIGN_STAGE_WIDTH = 1920;
const DESIGN_STAGE_HEIGHT = 1080;
const PARALLEL_SIZE_MULTIPLIER = 1.75; // +75% for parallel options/answers

const getScaledInteractiveMetrics = (stageRect, isSingleLayout) => {
  const scale = Math.min(
    stageRect.width / DESIGN_STAGE_WIDTH,
    stageRect.height / DESIGN_STAGE_HEIGHT
  );

  const single = {
    cardWidth: 320 * scale,
    cardHeight: 272 * scale,
    optionTopOffset: 320 * scale,
    zoneGap: 68 * scale,
    dropSnapOffset: 320 * scale,
    minStartLeft: 16 * scale,
    parallelBottomOffset: 112 * scale,
  };

  const parallel = {
    cardWidth: 180 * PARALLEL_SIZE_MULTIPLIER * scale,
    cardHeight: 136 * PARALLEL_SIZE_MULTIPLIER * scale,
    optionTopOffset: 0,
    // Answers only: bring zones closer together by about half combined.
    zoneGap: 68 * 0.92 * scale,
    dropSnapOffset: 0,
    minStartLeft: 16 * scale,
    parallelBottomOffset: 96 * scale,
  };

  return {
    scale,
    ...(isSingleLayout ? single : parallel),
  };
};

const InteractiveTest = ({
  page,
  isPreloading,
  onPickOption,
  onRetry,
  onCorrectDrop,
}) => {
  const optionAudioRef = useRef(null);
  const answerAudioRef = useRef(null);
  const feedbackAudioRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const stageRef = useRef(null);
  const dropZoneRefs = useRef({});
  const optionRefs = useRef({});
  const [playingOptionId, setPlayingOptionId] = useState('');
  const [playingAnswerId, setPlayingAnswerId] = useState('');
  const [optionPositions, setOptionPositions] = useState({});
  const [dragState, setDragState] = useState(null);
  const [dragLayer, setDragLayer] = useState(null);
  const [resetSeed, setResetSeed] = useState(0);
  const [placedByZone, setPlacedByZone] = useState({});
  const [placedByOption, setPlacedByOption] = useState({});
  const [dropResult, setDropResult] = useState('');
  const [stageMetrics, setStageMetrics] = useState({
    scale: 1,
    cardWidth: 320,
    cardHeight: 272,
    optionTopOffset: 320,
    zoneGap: 68,
    dropSnapOffset: 320,
    minStartLeft: 16,
    parallelBottomOffset: 112,
  });
  const [elementSizes, setElementSizes] = useState({});
  const pageId = page?.pageId || page?.id || `${page?.type ?? 'interactive'}-${page?.order ?? ''}`;

  const clearAdvanceTimeout = () => {
    if (!advanceTimeoutRef.current) return;
    clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  };

  const stopOptionAndAnswerAudio = () => {
    if (optionAudioRef.current) {
      optionAudioRef.current.pause();
      optionAudioRef.current.currentTime = 0;
      optionAudioRef.current = null;
    }
    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current.currentTime = 0;
      answerAudioRef.current = null;
    }
    setPlayingOptionId('');
    setPlayingAnswerId('');
  };

  /** Fresh interactive state every time the player moves to another page. */
  useEffect(() => {
    clearAdvanceTimeout();
    stopOptionAndAnswerAudio();
    if (feedbackAudioRef.current) {
      feedbackAudioRef.current.pause();
      feedbackAudioRef.current.currentTime = 0;
      feedbackAudioRef.current.src = '';
      feedbackAudioRef.current = null;
    }
    setDragState(null);
    setDragLayer(null);
    setPlacedByZone({});
    setPlacedByOption({});
    setDropResult('');
    setResetSeed((seed) => seed + 1);
  }, [pageId]);

  const useCustomLayout = hasCustomInteractiveLayout(page);
  const resolvedLayouts = useMemo(() => extractInteractiveLayoutsFromCms(page), [page]);
  const bgImage = resolveImageUrl(page);
  const sceneImageUrls = useMemo(() => {
    const fromList = Array.isArray(page?.media?.sceneImageMedias)
      ? page.media.sceneImageMedias
        .map((item) => resolveCmsAbsoluteMediaUrl(item?.url || item?.cloudUrl))
        .filter(Boolean)
      : [];
    const single = resolveCmsAbsoluteMediaUrl(
      page?.media?.sceneImageMedia?.url || page?.media?.sceneImageMedia?.cloudUrl || page?.sceneImageOne || ''
    );
    if (fromList.length) return fromList;
    const legacy = [page?.sceneImageOne, page?.sceneImageTwo]
      .map((value) => resolveCmsAbsoluteMediaUrl(value))
      .filter(Boolean);
    return legacy.length ? legacy : (single ? [single] : []);
  }, [page]);
  const dropZones = Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : [];
  const guideImageUrls = useMemo(() => {
    const fromList = Array.isArray(page?.media?.guideImageMedias)
      ? page.media.guideImageMedias
        .map((item) => resolveCmsAbsoluteMediaUrl(item?.url || item?.cloudUrl))
        .filter(Boolean)
      : [];
    const single = resolveCmsAbsoluteMediaUrl(
      page?.media?.guideImageMedia?.url
      || page?.media?.guideImageMedia?.cloudUrl
      || page?.media?.guideImage?.url
      || page?.media?.guideImage?.cloudUrl
      || ''
    );
    return fromList.length ? fromList : (single ? [single] : []);
  }, [page]);
  const dropZoneItems = useMemo(() => {
    const mapZone = (zone, index) => ({
      id: zone?.zoneId || `zone_${index + 1}`,
      label: zone?.label || `Answer ${index + 1}`,
      correctOptionId: zone?.correctOptionId || '',
      guideImageUrl: guideImageUrls[index] || guideImageUrls[0] || '',
      audio: resolveDropZoneAudioUrl(zone, index, page),
    });

    if (dropZones.length) {
      return dropZones.map(mapZone);
    }

    const fallbackGuides = guideImageUrls.length
      ? guideImageUrls
      : [page?.guideImageOne, page?.guideImageTwo].filter(Boolean);
    if (!fallbackGuides.length && !page?.answerAudioOne && !page?.answerAudioTwo) {
      return [];
    }

    const zoneCount = Math.max(
      fallbackGuides.length,
      page?.answerAudioTwo ? 2 : (page?.answerAudioOne ? 1 : 0),
      page?.interactionMode === 'two_options_two_answers' ? 2 : 1
    );

    return Array.from({ length: zoneCount }, (_, index) => ({
      id: `zone_${index + 1}`,
      label: `Answer ${index + 1}`,
      correctOptionId: index === 0
        ? (page?.answerOneCorrectOptionId || '')
        : (page?.answerTwoCorrectOptionId || ''),
      guideImageUrl: fallbackGuides[index] || fallbackGuides[0] || '',
      audio: resolveDropZoneAudioUrl({}, index, page),
    }));
  }, [dropZones, guideImageUrls, page]);
  const interactionType = page?.type || page?.interaction?.kind || '';
  const isParallelInteraction = dropZoneItems.length > 1
    || interactionType === 'activity_drag_2x2'
    || interactionType === 'drag_2x2';
  const isSingleLayout = !isParallelInteraction;
  const isInteractionLocked = dropZoneItems.length === 1 && Object.keys(placedByZone).length > 0;
  const firstOptionSource = page?.interaction?.options?.[0] || {};
  const secondOptionSource = page?.interaction?.options?.[1] || {};
  const options = useMemo(() => ([
    {
      id: firstOptionSource?.optionId || 'option_one',
      label: firstOptionSource?.label || 'Option 1',
      image: resolveCmsAbsoluteMediaUrl(
        page?.optionImageOne
        || firstOptionSource?.imageUrl
        || firstOptionSource?.image?.url
        || firstOptionSource?.image?.cloudUrl
        || firstOptionSource?.imageMedia?.url
        || firstOptionSource?.imageMedia?.cloudUrl
        || ''
      ),
      audio: resolveCmsAbsoluteMediaUrl(
        firstOptionSource?.audioUrl
        || firstOptionSource?.audio?.url
        || firstOptionSource?.audio?.cloudUrl
        || firstOptionSource?.audioMedia?.url
        || firstOptionSource?.audioMedia?.cloudUrl
        || ''
      ),
    },
    {
      id: secondOptionSource?.optionId || 'option_two',
      label: secondOptionSource?.label || 'Option 2',
      image: resolveCmsAbsoluteMediaUrl(
        page?.optionImageTwo
        || secondOptionSource?.imageUrl
        || secondOptionSource?.image?.url
        || secondOptionSource?.image?.cloudUrl
        || secondOptionSource?.imageMedia?.url
        || secondOptionSource?.imageMedia?.cloudUrl
        || ''
      ),
      audio: resolveCmsAbsoluteMediaUrl(
        secondOptionSource?.audioUrl
        || secondOptionSource?.audio?.url
        || secondOptionSource?.audio?.cloudUrl
        || secondOptionSource?.audioMedia?.url
        || secondOptionSource?.audioMedia?.cloudUrl
        || ''
      ),
    },
  ].filter((option, index) => {
    if (index === 0) return Boolean(option.image || option.audio || firstOptionSource?.label);
    return Boolean(option.image || option.audio || secondOptionSource?.label);
  })), [firstOptionSource, secondOptionSource, page?.optionImageOne, page?.optionImageTwo]);
  const requiredPlacements = Math.min(dropZoneItems.length, options.length);
  const optionsSignature = useMemo(() => options.map((option) => option.id).join('|'), [options]);

  const scheduleAdvanceAfterGoodJob = (audio) => {
    clearAdvanceTimeout();
    let delayMs = CMS_GOOD_JOB_ADVANCE_FALLBACK_MS;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      delayMs = Math.round(audio.duration * 1000) + CMS_GOOD_JOB_ADVANCE_DELAY_MS;
    }
    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      onCorrectDrop?.();
    }, delayMs);
  };

  const stopFeedbackAudio = () => {
    const audio = feedbackAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    feedbackAudioRef.current = null;
  };

  useEffect(() => {
    if (!dropResult || isPreloading) {
      stopFeedbackAudio();
      clearAdvanceTimeout();
      return undefined;
    }

    if (optionAudioRef.current) {
      optionAudioRef.current.pause();
      optionAudioRef.current.currentTime = 0;
      optionAudioRef.current = null;
      setPlayingOptionId('');
    }
    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current.currentTime = 0;
      answerAudioRef.current = null;
      setPlayingAnswerId('');
    }

    const feedbackUrl = resolveCmsInteractiveFeedbackAudioUrl(dropResult);
    if (!feedbackUrl) {
      if (dropResult === 'correct') {
        scheduleAdvanceAfterGoodJob(null);
      }
      return undefined;
    }

    const audio = new Audio(feedbackUrl);
    audio.preload = 'auto';
    audio.setAttribute('aria-hidden', 'true');
    feedbackAudioRef.current = audio;

    const handleEnded = () => {
      if (dropResult === 'correct') {
        scheduleAdvanceAfterGoodJob(audio);
      }
    };

    audio.addEventListener('ended', handleEnded, { once: true });

    const tryPlay = () => {
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          if (dropResult === 'correct') {
            scheduleAdvanceAfterGoodJob(null);
          }
        });
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
    } else {
      audio.addEventListener('canplaythrough', tryPlay, { once: true });
    }

    return () => {
      audio.removeEventListener('canplaythrough', tryPlay);
      audio.removeEventListener('ended', handleEnded);
      stopFeedbackAudio();
      clearAdvanceTimeout();
    };
  }, [dropResult, isPreloading, onCorrectDrop, pageId]);

  useEffect(() => {
    const computeInitialPositions = () => {
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;

      const metrics = getScaledInteractiveMetrics(stageRect, isSingleLayout);
      setStageMetrics(metrics);

      if (useCustomLayout) {
        const nextPositions = {};
        const nextSizes = {};
        const optionLayoutMap = {
          option_one: resolvedLayouts.optionOne,
          option_two: resolvedLayouts.optionTwo,
        };
        options.forEach((option) => {
          const box = layoutRectToPx(optionLayoutMap[option.id], stageRect.width, stageRect.height);
          if (!box) return;
          nextPositions[option.id] = { x: box.left, y: box.top };
          nextSizes[option.id] = { width: box.width, height: box.height };
        });
        setElementSizes(nextSizes);
        setOptionPositions(nextPositions);
        return;
      }

      const cardWidth = metrics.cardWidth;
      const cardHeight = metrics.cardHeight;
      const gap = isSingleLayout ? (96 * metrics.scale) : (192 * metrics.scale);
      const totalWidth = (options.length * cardWidth) + ((options.length - 1) * gap);
      const startLeft = Math.max(metrics.minStartLeft, (stageRect.width - totalWidth) / 2);
      const top = isSingleLayout
        ? ((stageRect.height - cardHeight) / 2)
        : (stageRect.height - cardHeight - metrics.parallelBottomOffset);

      const nextPositions = {};
      const nextSizes = {};
      options.forEach((option, index) => {
        nextPositions[option.id] = {
          x: startLeft + (index * (cardWidth + gap)),
          y: top,
        };
        nextSizes[option.id] = { width: cardWidth, height: cardHeight };
      });
      setElementSizes(nextSizes);
      setOptionPositions(nextPositions);
    };

    const raf = requestAnimationFrame(computeInitialPositions);
    window.addEventListener('resize', computeInitialPositions);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computeInitialPositions);
    };
  }, [isSingleLayout, optionsSignature, resetSeed, useCustomLayout, resolvedLayouts, options]);

  const playOptionAudio = (option) => {
    if (isPreloading) return;
    if (isInteractionLocked) return;
    if (placedByOption[option.id]) return;
    onPickOption?.(option.id);

    if (!option?.audio) return;

    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current.currentTime = 0;
      answerAudioRef.current = null;
      setPlayingAnswerId('');
    }

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

  const playAnswerAudio = (zone) => {
    if (isPreloading || !zone?.audio) return;

    if (optionAudioRef.current) {
      optionAudioRef.current.pause();
      optionAudioRef.current.currentTime = 0;
      optionAudioRef.current = null;
      setPlayingOptionId('');
    }

    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current.currentTime = 0;
    }

    answerAudioRef.current = new Audio(zone.audio);
    answerAudioRef.current.onended = () => setPlayingAnswerId('');
    answerAudioRef.current.onerror = () => setPlayingAnswerId('');
    answerAudioRef.current.play().catch(() => {
      setPlayingAnswerId('');
    });
    setPlayingAnswerId(zone.id);
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
      const snapY = useCustomLayout
        ? centeredY
        : (isSingleLayout ? centeredY - stageMetrics.dropSnapOffset : centeredY);
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
    clearAdvanceTimeout();
    stopOptionAndAnswerAudio();
    stopFeedbackAudio();
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
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0 }}
        />
      ) : (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'common.white', zIndex: 0 }} />
      )}

      {useCustomLayout
        ? sceneImageUrls.map((url, index) => {
            const layout = index === 0 ? resolvedLayouts.sceneOne : resolvedLayouts.sceneTwo;
            const stageRect = stageRef.current?.getBoundingClientRect();
            if (!stageRect || !layout) return null;
            const box = layoutRectToPx(layout, stageRect.width, stageRect.height);
            if (!box) return null;
            return (
              <Box
                key={`scene-${index}`}
                component="img"
                src={url}
                alt=""
                sx={{
                  position: 'absolute',
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  objectFit: 'contain',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            );
          })
        : null}

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
        <Box sx={{ mt: 1, textAlign: 'center', color: 'common.white', pointerEvents: 'none' }}>
          {page?.subtitle ? (
            <Typography sx={{ fontFamily: 'Quicksand, sans-serif', opacity: 0.95 }}>
              {page.subtitle}
            </Typography>
          ) : null}
        </Box>

        <Box
          role="group"
          aria-label="Interactive answer options"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            top: useCustomLayout ? 0 : (isSingleLayout ? stageMetrics.optionTopOffset : 0),
            // Let clicks pass through to answer zones below; options opt back in individually.
            pointerEvents: 'none',
          }}
        >
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
                width: elementSizes[option.id]?.width || stageMetrics.cardWidth,
                height: elementSizes[option.id]?.height || stageMetrics.cardHeight,
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
          useCustomLayout ? (
            dropZoneItems.map((zone, index) => {
              const zoneLayout = index === 0 ? resolvedLayouts.answerOne : resolvedLayouts.answerTwo;
              const stageRect = stageRef.current?.getBoundingClientRect();
              if (!stageRect || !zoneLayout) return null;
              const box = layoutRectToPx(zoneLayout, stageRect.width, stageRect.height);
              if (!box) return null;
              const hasAnswerAudio = Boolean(zone.audio);
              return (
                <Box
                  key={zone.id}
                  ref={(element) => { dropZoneRefs.current[zone.id] = element; }}
                  role={hasAnswerAudio ? 'button' : 'img'}
                  tabIndex={hasAnswerAudio ? 0 : undefined}
                  aria-label={hasAnswerAudio ? `Play ${zone.label} sound` : `${zone.label} drop zone`}
                  onPointerDown={
                    hasAnswerAudio
                      ? (event) => {
                          event.stopPropagation();
                          playAnswerAudio(zone);
                        }
                      : undefined
                  }
                  onKeyDown={
                    hasAnswerAudio
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            playAnswerAudio(zone);
                          }
                        }
                      : undefined
                  }
                  sx={{
                    position: 'absolute',
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                    zIndex: 4,
                    pointerEvents: hasAnswerAudio ? 'auto' : 'none',
                    cursor: hasAnswerAudio ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    opacity: playingAnswerId && playingAnswerId !== zone.id ? 0.82 : 1,
                    transition: 'opacity 0.12s ease',
                  }}
                >
                  {zone.guideImageUrl ? (
                    <Box
                      component="img"
                      src={zone.guideImageUrl}
                      alt={`${zone.label} guide`}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                    />
                  ) : null}
                </Box>
              );
            })
          ) : (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: isSingleLayout ? '58%' : '56%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: stageMetrics.zoneGap,
                zIndex: 4,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {dropZoneItems.map((zone) => {
                const hasAnswerAudio = Boolean(zone.audio);
                return (
                <Box
                  key={zone.id}
                  ref={(element) => { dropZoneRefs.current[zone.id] = element; }}
                  role={hasAnswerAudio ? 'button' : 'img'}
                  tabIndex={hasAnswerAudio ? 0 : undefined}
                  aria-label={hasAnswerAudio ? `Play ${zone.label} sound` : `${zone.label} drop zone`}
                  onPointerDown={
                    hasAnswerAudio
                      ? (event) => {
                          event.stopPropagation();
                          playAnswerAudio(zone);
                        }
                      : undefined
                  }
                  onKeyDown={
                    hasAnswerAudio
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            playAnswerAudio(zone);
                          }
                        }
                      : undefined
                  }
                  sx={{
                    width: stageMetrics.cardWidth,
                    height: stageMetrics.cardHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    pointerEvents: hasAnswerAudio ? 'auto' : 'none',
                    cursor: hasAnswerAudio ? 'pointer' : 'default',
                    opacity: playingAnswerId && playingAnswerId !== zone.id ? 0.82 : 1,
                    transition: 'opacity 0.12s ease',
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
                        pointerEvents: 'none',
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
                );
              })}
            </Box>
          )
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

        {!dropResult ? (
          <Typography
            sx={{
              position: 'absolute',
              left: '50%',
              bottom: '8%',
              transform: 'translateX(-50%)',
              color: 'common.white',
              textAlign: 'center',
              fontFamily: 'Quicksand, sans-serif',
              fontWeight: 700,
              fontSize: { xs: '0.95rem', md: '1.05rem' },
              textShadow: '0 1px 6px rgba(0,0,0,0.45)',
              pointerEvents: 'none',
              zIndex: 4,
              px: 2,
            }}
          >
            Drag to the answer zone or tap to play audio.
          </Typography>
        ) : null}
      </Box>

      <CmsInteractiveResultToast
        visible={Boolean(dropResult)}
        tone={dropResult === 'correct' ? 'success' : 'retry'}
        onDismiss={dropResult === 'wrong' ? handleRetryClick : undefined}
      />
    </Box>
  );
};

export default InteractiveTest;
