/**
 * CMS drag activity page — behavior aligned with web InteractiveTest.jsx (1920×1080 scaling).
 */

import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import {
  extractInteractiveLayoutsFromCms,
  hasCustomInteractiveLayout,
  layoutRectToPx,
} from '@/utils/cmsInteractiveLayout';
import { getScaledInteractiveMetrics, resolveImageUrl } from './cms-player-shared';
import { resolvePlayableMediaUri } from './cms-player-media';
import { useCmsMediaUriMap } from './cms-player-media-context';
import { CmsInteractiveResultToast } from './cms-interactive-result-toast';

type OptionModel = {
  id: string;
  label: string;
  image: string;
  audio: string;
};

type ZoneModel = {
  id: string;
  label: string;
  correctOptionId: string;
  guideImageUrl: string;
  audio: string;
};

function toSafeMediaUrl(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const media = value as { url?: unknown; cloudUrl?: unknown };
    if (typeof media.url === 'string') return media.url.trim();
    if (typeof media.cloudUrl === 'string') return media.cloudUrl.trim();
  }
  return '';
}

function sanitizeInteractiveImageUrl(value: unknown): string {
  const safe = toSafeMediaUrl(value);
  if (!safe) return '';
  const lowered = safe.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return safe;
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;
}

export function CmsInteractivePage({
  page,
  isPreloading,
  onPickOption,
  onRetry,
  onCorrectDrop,
}: {
  page: CmsPlayablePage;
  isPreloading: boolean;
  onPickOption?: (optionId: string) => void;
  onRetry?: () => void;
  onCorrectDrop?: () => void;
}) {
  const mediaUriMap = useCmsMediaUriMap();
  const bgImage = resolvePlayableMediaUri(resolveImageUrl(page), mediaUriMap);
  const useCustomLayout = hasCustomInteractiveLayout(page as Record<string, unknown>);
  const resolvedLayouts = useMemo(
    () => extractInteractiveLayoutsFromCms(page as Record<string, unknown>),
    [page]
  );
  const sceneImageUrls = useMemo(() => {
    const media = page?.media;
    const fromList = Array.isArray(media?.sceneImageMedias)
      ? media.sceneImageMedias
        .map((item) => sanitizeInteractiveImageUrl(item?.url))
        .filter(Boolean) as string[]
      : [];
    const single = sanitizeInteractiveImageUrl(media?.sceneImageMedia?.url);
    return fromList.length ? fromList : single ? [single] : [];
  }, [page]);
  const resolvedSceneImageUrls = useMemo(
    () => sceneImageUrls.map((url) => resolvePlayableMediaUri(url, mediaUriMap)),
    [sceneImageUrls, mediaUriMap]
  );

  const dropZones = useMemo(
    () => (Array.isArray(page?.interaction?.dropZones) ? page.interaction.dropZones : []),
    [page]
  );

  const guideImageUrls = useMemo(() => {
    const fromList = Array.isArray(page?.media?.guideImageMedias)
      ? page.media.guideImageMedias.map((item) => item?.url).filter(Boolean) as string[]
      : [];
    const single = page?.media?.guideImageMedia?.url || '';
    return fromList.length ? fromList : single ? [single] : [];
  }, [page]);

  const dropZoneItems: ZoneModel[] = useMemo(
    () =>
      dropZones.map((zone, index) => {
        const rawAudio =
          toSafeMediaUrl(zone?.audioUrl)
          || toSafeMediaUrl(zone?.audio)
          || toSafeMediaUrl(zone?.audioMedia)
          || toSafeMediaUrl(index === 0 ? page?.answerAudioOne : page?.answerAudioTwo);
        const rawGuide = guideImageUrls[index] || guideImageUrls[0] || '';
        return {
          id: zone?.zoneId || `zone_${index + 1}`,
          label: zone?.label || `Answer ${index + 1}`,
          correctOptionId: zone?.correctOptionId || '',
          guideImageUrl: resolvePlayableMediaUri(rawGuide, mediaUriMap),
          audio: resolvePlayableMediaUri(rawAudio, mediaUriMap),
        };
      }),
    [dropZones, guideImageUrls, page, mediaUriMap]
  );

  const interactionType = page?.type || page?.interaction?.kind || '';
  const isParallelInteraction =
    dropZoneItems.length > 1
    || interactionType === 'activity_drag_2x2'
    || interactionType === 'drag_2x2';
  const isSingleLayout = !isParallelInteraction;

  const options: OptionModel[] = useMemo(() => {
    const firstOptionSource = page?.interaction?.options?.[0] || {};
    const secondOptionSource = page?.interaction?.options?.[1] || {};
    const list: OptionModel[] = [
      {
        id: firstOptionSource?.optionId || 'option_one',
        label: firstOptionSource?.label || 'Option 1',
        image: resolvePlayableMediaUri(
          (page as { optionImageOne?: string }).optionImageOne
          || firstOptionSource?.imageMedia?.url
          || '',
          mediaUriMap
        ),
        audio: resolvePlayableMediaUri(firstOptionSource?.audioMedia?.url || '', mediaUriMap),
      },
      {
        id: secondOptionSource?.optionId || 'option_two',
        label: secondOptionSource?.label || 'Option 2',
        image: resolvePlayableMediaUri(
          (page as { optionImageTwo?: string }).optionImageTwo
          || secondOptionSource?.imageMedia?.url
          || '',
          mediaUriMap
        ),
        audio: resolvePlayableMediaUri(secondOptionSource?.audioMedia?.url || '', mediaUriMap),
      },
    ];
    return list.filter((option, index) => {
      if (index === 0) return Boolean(option.image || option.audio || firstOptionSource?.label);
      return Boolean(option.image || option.audio || secondOptionSource?.label);
    });
  }, [page, mediaUriMap]);

  const requiredPlacements = Math.min(dropZoneItems.length, options.length);

  const [layout, setLayout] = useState({ w: 1920, h: 1080 });
  const [stageMetrics, setStageMetrics] = useState(() =>
    getScaledInteractiveMetrics(1920, 1080, isSingleLayout)
  );
  const [optionPositions, setOptionPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [elementSizes, setElementSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [placedByZone, setPlacedByZone] = useState<Record<string, string>>({});
  const [placedByOption, setPlacedByOption] = useState<Record<string, string>>({});
  const placedByZoneRef = useRef(placedByZone);
  const placedByOptionRef = useRef(placedByOption);
  const [dropResult, setDropResult] = useState<'correct' | 'wrong' | ''>('');
  const [playingOptionId, setPlayingOptionId] = useState('');
  const [playingAnswerId, setPlayingAnswerId] = useState('');
  const [dragLayer, setDragLayer] = useState<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    option: OptionModel;
  } | null>(null);
  const [resetSeed, setResetSeed] = useState(0);

  const optionAudioRef = useRef<Audio.Sound | null>(null);
  const answerAudioRef = useRef<Audio.Sound | null>(null);
  const audioRequestIdRef = useRef(0);
  const positionRef = useRef<Record<string, { x: number; y: number }>>({});
  const dragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
    w: number;
    h: number;
    option: OptionModel;
  } | null>(null);

  useEffect(() => {
    positionRef.current = optionPositions;
  }, [optionPositions]);

  useEffect(() => {
    placedByZoneRef.current = placedByZone;
  }, [placedByZone]);

  useEffect(() => {
    placedByOptionRef.current = placedByOption;
  }, [placedByOption]);

  const isInteractionLocked = dropZoneItems.length === 1 && Object.keys(placedByZone).length > 0;

  const allDropZonesCorrect = useMemo(
    () =>
      dropZoneItems.length > 0
      && dropZoneItems.every((zone) => placedByZone[zone.id] === zone.correctOptionId),
    [dropZoneItems, placedByZone]
  );

  useEffect(() => {
    if (!allDropZonesCorrect) return undefined;
    const t = setTimeout(() => onCorrectDrop?.(), 1000);
    return () => clearTimeout(t);
  }, [allDropZonesCorrect, onCorrectDrop]);

  const zoneLayouts = useMemo(() => {
    const { w: stageW, h: stageH } = layout;
    const m = getScaledInteractiveMetrics(stageW, stageH, isSingleLayout);
    const n = dropZoneItems.length;
    if (!n) return { metrics: m, zones: [] as { id: string; x: number; y: number; w: number; h: number }[] };

    if (useCustomLayout) {
      const zoneLayoutMap = [resolvedLayouts.answerOne, resolvedLayouts.answerTwo];
      const zones = dropZoneItems
        .map((zone, index) => {
          const box = layoutRectToPx(zoneLayoutMap[index], stageW, stageH);
          if (!box) return null;
          return { id: zone.id, x: box.left, y: box.top, w: box.width, h: box.height };
        })
        .filter(Boolean) as { id: string; x: number; y: number; w: number; h: number }[];
      return { metrics: m, zones };
    }

    const { cardWidth, cardHeight, zoneGap } = m;
    const totalW = n * cardWidth + (n - 1) * zoneGap;
    const startX = Math.max(m.minStartLeft, (stageW - totalW) / 2);
    const centerY = stageH * (isSingleLayout ? 0.58 : 0.56);
    const topY = centerY - cardHeight / 2;

    const zones = dropZoneItems.map((zone, index) => ({
      id: zone.id,
      x: startX + index * (cardWidth + zoneGap),
      y: topY,
      w: cardWidth,
      h: cardHeight,
    }));
    return { metrics: m, zones };
  }, [layout, dropZoneItems, isSingleLayout, useCustomLayout, resolvedLayouts]);

  useEffect(() => {
    const { w: stageW, h: stageH } = layout;
    const m = getScaledInteractiveMetrics(stageW, stageH, isSingleLayout);
    setStageMetrics(m);

    if (useCustomLayout) {
      const optionLayoutMap: Record<string, ReturnType<typeof layoutRectToPx>> = {
        option_one: layoutRectToPx(resolvedLayouts.optionOne, stageW, stageH),
        option_two: layoutRectToPx(resolvedLayouts.optionTwo, stageW, stageH),
      };
      const next: Record<string, { x: number; y: number }> = {};
      const sizes: Record<string, { w: number; h: number }> = {};
      options.forEach((option) => {
        const box = optionLayoutMap[option.id];
        if (!box) return;
        next[option.id] = { x: box.left, y: box.top };
        sizes[option.id] = { w: box.width, h: box.height };
      });
      setElementSizes(sizes);
      setOptionPositions(next);
      return;
    }

    const { cardWidth, cardHeight, minStartLeft, parallelBottomOffset } = m;
    const gap = isSingleLayout ? 96 * m.scale : 192 * m.scale;
    const totalWidth = options.length * cardWidth + (options.length - 1) * gap;
    const startLeft = Math.max(minStartLeft, (stageW - totalWidth) / 2);
    const top = isSingleLayout
      ? (stageH - cardHeight) / 2
      : stageH - cardHeight - parallelBottomOffset;

    const next: Record<string, { x: number; y: number }> = {};
    const sizes: Record<string, { w: number; h: number }> = {};
    options.forEach((option, index) => {
      next[option.id] = {
        x: startLeft + index * (cardWidth + gap),
        y: top,
      };
      sizes[option.id] = { w: cardWidth, h: cardHeight };
    });
    setElementSizes(sizes);
    setOptionPositions(next);
  }, [layout, isSingleLayout, options, resetSeed, useCustomLayout, resolvedLayouts]);

  const stopAllInteractiveAudio = useCallback(async () => {
    const optionSound = optionAudioRef.current;
    const answerSound = answerAudioRef.current;
    optionAudioRef.current = null;
    answerAudioRef.current = null;
    setPlayingOptionId('');
    setPlayingAnswerId('');

    await Promise.all([
      (async () => {
        if (!optionSound) return;
        try {
          await optionSound.stopAsync();
        } catch {
          // ignore stop errors for unloaded sounds
        }
        try {
          await optionSound.unloadAsync();
        } catch {
          // ignore unload errors
        }
      })(),
      (async () => {
        if (!answerSound) return;
        try {
          await answerSound.stopAsync();
        } catch {
          // ignore stop errors for unloaded sounds
        }
        try {
          await answerSound.unloadAsync();
        } catch {
          // ignore unload errors
        }
      })(),
    ]);
  }, []);

  const playOptionAudio = useCallback(
    async (option: OptionModel) => {
      if (isPreloading || isInteractionLocked || placedByOptionRef.current[option.id]) return;
      onPickOption?.(option.id);
      if (!option.audio) return;

      const requestId = audioRequestIdRef.current + 1;
      audioRequestIdRef.current = requestId;
      await stopAllInteractiveAudio();
      if (requestId !== audioRequestIdRef.current) return;

      try {
        const { sound } = await Audio.Sound.createAsync({ uri: option.audio }, { shouldPlay: true });
        if (requestId !== audioRequestIdRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        optionAudioRef.current = sound;
        setPlayingOptionId(option.id);
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) {
            if (optionAudioRef.current === sound) {
              optionAudioRef.current = null;
            }
            setPlayingOptionId((current) => (current === option.id ? '' : current));
          }
        });
      } catch {
        if (requestId === audioRequestIdRef.current) {
          setPlayingOptionId('');
        }
      }
    },
    [isPreloading, isInteractionLocked, onPickOption, stopAllInteractiveAudio]
  );

  const playZoneAudio = useCallback(
    async (zone: ZoneModel) => {
      if (isPreloading || !zone.audio) return;

      const requestId = audioRequestIdRef.current + 1;
      audioRequestIdRef.current = requestId;
      await stopAllInteractiveAudio();
      if (requestId !== audioRequestIdRef.current) return;

      try {
        const { sound } = await Audio.Sound.createAsync({ uri: zone.audio }, { shouldPlay: true });
        if (requestId !== audioRequestIdRef.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        answerAudioRef.current = sound;
        setPlayingAnswerId(zone.id);
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) {
            if (answerAudioRef.current === sound) {
              answerAudioRef.current = null;
            }
            setPlayingAnswerId((current) => (current === zone.id ? '' : current));
          }
        });
      } catch {
        if (requestId === audioRequestIdRef.current) {
          setPlayingAnswerId('');
        }
      }
    },
    [isPreloading, stopAllInteractiveAudio]
  );

  useEffect(
    () => () => {
      audioRequestIdRef.current += 1;
      void stopAllInteractiveAudio();
    },
    [stopAllInteractiveAudio]
  );

  const handleRetry = useCallback(() => {
    audioRequestIdRef.current += 1;
    void stopAllInteractiveAudio();
    setDragLayer(null);
    dragStateRef.current = null;
    setPlacedByZone({});
    setPlacedByOption({});
    placedByZoneRef.current = {};
    placedByOptionRef.current = {};
    setDropResult('');
    setResetSeed((s) => s + 1);
    onRetry?.();
  }, [onRetry, stopAllInteractiveAudio]);

  const buildPanResponder = useCallback(
    (option: OptionModel) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !isPreloading && !isInteractionLocked && !placedByOptionRef.current[option.id],
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          const p = positionRef.current[option.id] || { x: 0, y: 0 };
          dragStateRef.current = {
            id: option.id,
            startX: p.x,
            startY: p.y,
            moved: false,
            w: elementSizes[option.id]?.w || stageMetrics.cardWidth,
            h: elementSizes[option.id]?.h || stageMetrics.cardHeight,
            option,
          };
        },
        onPanResponderMove: (_, g) => {
          const d = dragStateRef.current;
          if (!d || d.id !== option.id) return;
          if (Math.hypot(g.dx, g.dy) > 8) d.moved = true;
          const nx = d.startX + g.dx;
          const ny = d.startY + g.dy;
          setDragLayer({
            id: option.id,
            x: nx,
            y: ny,
            w: d.w,
            h: d.h,
            option,
          });
          setOptionPositions((prev) => ({
            ...prev,
            [option.id]: { x: nx, y: ny },
          }));
        },
        onPanResponderRelease: (_, g) => {
          const d = dragStateRef.current;
          if (!d || d.id !== option.id) {
            setDragLayer(null);
            return;
          }
          const finalX = d.startX + g.dx;
          const finalY = d.startY + g.dy;
          const dragRect = { x: finalX, y: finalY, w: d.w, h: d.h };

          if (!d.moved) {
            playOptionAudio(option);
            setOptionPositions((prev) => ({
              ...prev,
              [option.id]: { x: d.startX, y: d.startY },
            }));
            dragStateRef.current = null;
            setDragLayer(null);
            return;
          }

          const zones = zoneLayouts.zones;
          const target = zones.find((z) =>
            rectsOverlap(dragRect, { x: z.x, y: z.y, w: z.w, h: z.h })
          );

          if (target) {
            const zoneMeta = dropZoneItems.find((z) => z.id === target.id);
            if (!zoneMeta) {
              dragStateRef.current = null;
              setDragLayer(null);
              return;
            }

            const prevPlacedByZone = placedByZoneRef.current;
            const occupying = prevPlacedByZone[target.id];
            if (occupying && occupying !== option.id) {
              setOptionPositions((prev) => ({
                ...prev,
                [option.id]: { x: d.startX, y: d.startY },
              }));
              setDropResult('');
              dragStateRef.current = null;
              setDragLayer(null);
              return;
            }

            const centeredX = target.x + (target.w - d.w) / 2;
            const centeredY = target.y + (target.h - d.h) / 2;
            const snapY = useCustomLayout
              ? centeredY
              : (isSingleLayout ? centeredY - stageMetrics.dropSnapOffset : centeredY);

            setOptionPositions((prev) => ({
              ...prev,
              [option.id]: { x: centeredX, y: snapY },
            }));

            const nextPlacedByZone = { ...prevPlacedByZone, [target.id]: option.id };
            setPlacedByZone(nextPlacedByZone);
            placedByZoneRef.current = nextPlacedByZone;
            setPlacedByOption((prevOpt) => {
              const next = { ...prevOpt, [option.id]: target.id };
              placedByOptionRef.current = next;
              return next;
            });

            if (!isParallelInteraction) {
              setDropResult(option.id === zoneMeta.correctOptionId ? 'correct' : 'wrong');
            } else if (Object.keys(nextPlacedByZone).length >= requiredPlacements) {
              const allOk = dropZoneItems.every((z) => nextPlacedByZone[z.id] === z.correctOptionId);
              setDropResult(allOk ? 'correct' : 'wrong');
            } else {
              setDropResult('');
            }
          } else {
            setOptionPositions((prev) => ({
              ...prev,
              [option.id]: { x: d.startX, y: d.startY },
            }));
            setDropResult('');
          }

          dragStateRef.current = null;
          setDragLayer(null);
        },
        onPanResponderTerminate: () => {
          setDragLayer(null);
          dragStateRef.current = null;
        },
      }),
    [
      isPreloading,
      isInteractionLocked,
      playOptionAudio,
      stageMetrics,
      zoneLayouts.zones,
      isParallelInteraction,
      isSingleLayout,
      useCustomLayout,
      elementSizes,
      requiredPlacements,
      dropZoneItems,
    ]
  );

  const responders = useMemo(
    () => Object.fromEntries(options.map((o) => [o.id, buildPanResponder(o)])),
    [options, buildPanResponder]
  );

  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setLayout({ w: width, h: height });
      }}
    >
      {bgImage ? (
        <Image
          source={{ uri: bgImage }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="stretch"
          accessibilityLabel={page.title || 'Interactive background'}
          accessibilityRole="image"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fff' }]} />
      )}

      {useCustomLayout
        ? resolvedSceneImageUrls.map((url, index) => {
            const sceneLayout = index === 0 ? resolvedLayouts.sceneOne : resolvedLayouts.sceneTwo;
            const box = layoutRectToPx(sceneLayout, layout.w, layout.h);
            if (!box) return null;
            return (
              <Image
                key={`scene-${index}`}
                source={{ uri: url }}
                style={{
                  position: 'absolute',
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                  zIndex: 1,
                }}
                resizeMode="contain"
                accessibilityLabel={`Scene image ${index + 1}`}
                accessibilityRole="image"
              />
            );
          })
        : null}

      <View style={styles.overlay} pointerEvents="box-none">
        {page.subtitle ? (
          <Text style={styles.pageSubtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        ) : null}

        <View
          style={[
            styles.optionsLayer,
            { top: useCustomLayout ? 0 : (isSingleLayout ? stageMetrics.optionTopOffset : 0) },
          ]}
          pointerEvents="box-none"
        >
          {options.map((option) => {
            const pos = optionPositions[option.id];
            if (!pos) return null;
            const hidden = dragLayer?.id === option.id;
            const lockedHere = Boolean(placedByOption[option.id]);
            const size = elementSizes[option.id];
            return (
              <View
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    left: pos.x,
                    top: pos.y,
                    width: size?.w || stageMetrics.cardWidth,
                    height: size?.h || stageMetrics.cardHeight,
                    opacity:
                      hidden
                        ? 0
                        : (playingOptionId || playingAnswerId) && playingOptionId !== option.id
                          ? 0.72
                          : 1,
                    zIndex: lockedHere ? 12 : 6,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${option.label}`}
                {...responders[option.id].panHandlers}
              >
                {option.image ? (
                  <Image
                    source={{ uri: option.image }}
                    style={styles.optionImg}
                    resizeMode="contain"
                    accessibilityLabel={option.label}
                  />
                ) : (
                  <Text style={styles.optionFallback}>{option.label}</Text>
                )}
              </View>
            );
          })}
        </View>

        {zoneLayouts.zones.map((z) => (
          <Pressable
            key={z.id}
            onPress={() => {
              const zoneMeta = dropZoneItems.find((d) => d.id === z.id);
              if (zoneMeta?.audio) {
                void playZoneAudio(zoneMeta);
              }
            }}
            style={[
              styles.dropZone,
              {
                left: z.x,
                top: z.y,
                width: z.w,
                height: z.h,
                opacity:
                  playingAnswerId && playingAnswerId !== z.id
                    ? 0.82
                    : 1,
              },
            ]}
            pointerEvents={dropZoneItems.find((d) => d.id === z.id)?.audio ? 'auto' : 'none'}
            accessibilityRole="button"
            accessibilityLabel={`Play ${dropZoneItems.find((d) => d.id === z.id)?.label || 'Answer'} sound`}
          >
            {dropZoneItems.find((d) => d.id === z.id)?.guideImageUrl ? (
              <Image
                source={{ uri: dropZoneItems.find((d) => d.id === z.id)?.guideImageUrl || '' }}
                style={styles.optionImg}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.dropPlaceholder} />
            )}
          </Pressable>
        ))}

        {dragLayer ? (
          <View
            style={[
              styles.dragLayer,
              {
                left: dragLayer.x,
                top: dragLayer.y,
                width: dragLayer.w,
                height: dragLayer.h,
              },
            ]}
            pointerEvents="none"
          >
            {dragLayer.option.image ? (
              <Image
                source={{ uri: dragLayer.option.image }}
                style={styles.optionImg}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.optionFallback}>{dragLayer.option.label}</Text>
            )}
          </View>
        ) : null}

        {!dropResult ? (
          <Text style={styles.hint} pointerEvents="none">
            Drag to the answer zone or tap to play audio.
          </Text>
        ) : null}
      </View>

      <CmsInteractiveResultToast
        visible={Boolean(dropResult)}
        tone={dropResult === 'correct' ? 'success' : 'retry'}
        onDismiss={dropResult === 'wrong' ? handleRetry : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  pageSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: '#fff',
    fontFamily: Quicksand.semiBold,
    opacity: 0.95,
  },
  optionsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  optionCard: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  optionImg: {
    width: '100%',
    height: '100%',
  },
  optionFallback: {
    color: '#fff',
    fontFamily: Quicksand.bold,
  },
  dropZone: {
    position: 'absolute',
    zIndex: 4,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropPlaceholder: {
    flex: 1,
    alignSelf: 'stretch',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  dragLayer: {
    position: 'absolute',
    zIndex: 7,
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    color: '#fff',
    fontFamily: Quicksand.bold,
  },
});
