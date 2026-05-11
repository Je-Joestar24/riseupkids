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
import { colors } from '@/config/theme/colors';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import { cmsLocalUiAssets, getScaledInteractiveMetrics, resolveImageUrl } from './cms-player-shared';

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
};

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
  const bgImage = resolveImageUrl(page);

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
      dropZones.map((zone, index) => ({
        id: zone?.zoneId || `zone_${index + 1}`,
        label: zone?.label || `Answer ${index + 1}`,
        correctOptionId: zone?.correctOptionId || '',
        guideImageUrl: guideImageUrls[index] || guideImageUrls[0] || '',
      })),
    [dropZones, guideImageUrls]
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
        image:
          (page as { optionImageOne?: string }).optionImageOne
          || firstOptionSource?.imageMedia?.url
          || '',
        audio: firstOptionSource?.audioMedia?.url || '',
      },
      {
        id: secondOptionSource?.optionId || 'option_two',
        label: secondOptionSource?.label || 'Option 2',
        image:
          (page as { optionImageTwo?: string }).optionImageTwo
          || secondOptionSource?.imageMedia?.url
          || '',
        audio: secondOptionSource?.audioMedia?.url || '',
      },
    ];
    return list.filter((option, index) => {
      if (index === 0) return Boolean(option.image || option.audio || firstOptionSource?.label);
      return Boolean(option.image || option.audio || secondOptionSource?.label);
    });
  }, [page]);

  const requiredPlacements = Math.min(dropZoneItems.length, options.length);

  const [layout, setLayout] = useState({ w: 1920, h: 1080 });
  const [stageMetrics, setStageMetrics] = useState(() =>
    getScaledInteractiveMetrics(1920, 1080, isSingleLayout)
  );
  const [optionPositions, setOptionPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [placedByZone, setPlacedByZone] = useState<Record<string, string>>({});
  const [placedByOption, setPlacedByOption] = useState<Record<string, string>>({});
  const placedByZoneRef = useRef(placedByZone);
  const placedByOptionRef = useRef(placedByOption);
  const [dropResult, setDropResult] = useState<'correct' | 'wrong' | ''>('');
  const [playingOptionId, setPlayingOptionId] = useState('');
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
  }, [layout, dropZoneItems, isSingleLayout]);

  useEffect(() => {
    const { w: stageW, h: stageH } = layout;
    const m = getScaledInteractiveMetrics(stageW, stageH, isSingleLayout);
    setStageMetrics(m);
    const { cardWidth, cardHeight, minStartLeft, parallelBottomOffset } = m;
    const gap = isSingleLayout ? 96 * m.scale : 192 * m.scale;
    const totalWidth = options.length * cardWidth + (options.length - 1) * gap;
    const startLeft = Math.max(minStartLeft, (stageW - totalWidth) / 2);
    const top = isSingleLayout
      ? (stageH - cardHeight) / 2
      : stageH - cardHeight - parallelBottomOffset;

    const next: Record<string, { x: number; y: number }> = {};
    options.forEach((option, index) => {
      next[option.id] = {
        x: startLeft + index * (cardWidth + gap),
        y: top,
      };
    });
    setOptionPositions(next);
  }, [layout, isSingleLayout, options, resetSeed]);

  const playOptionAudio = useCallback(
    async (option: OptionModel) => {
      if (isPreloading || isInteractionLocked || placedByOptionRef.current[option.id]) return;
      onPickOption?.(option.id);
      if (!option.audio) return;
      try {
        if (optionAudioRef.current) {
          await optionAudioRef.current.stopAsync();
          await optionAudioRef.current.unloadAsync();
          optionAudioRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync({ uri: option.audio }, { shouldPlay: true });
        optionAudioRef.current = sound;
        setPlayingOptionId(option.id);
        sound.setOnPlaybackStatusUpdate((st) => {
          if (st.isLoaded && st.didJustFinish) {
            setPlayingOptionId('');
          }
        });
      } catch {
        setPlayingOptionId('');
      }
    },
    [isPreloading, isInteractionLocked, onPickOption]
  );

  useEffect(
    () => () => {
      optionAudioRef.current?.unloadAsync().catch(() => {});
    },
    []
  );

  const handleRetry = useCallback(() => {
    optionAudioRef.current?.unloadAsync().catch(() => {});
    optionAudioRef.current = null;
    setPlayingOptionId('');
    setDragLayer(null);
    dragStateRef.current = null;
    setPlacedByZone({});
    setPlacedByOption({});
    placedByZoneRef.current = {};
    placedByOptionRef.current = {};
    setDropResult('');
    setResetSeed((s) => s + 1);
    onRetry?.();
  }, [onRetry]);

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
            w: stageMetrics.cardWidth,
            h: stageMetrics.cardHeight,
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
            const snapY = isSingleLayout ? centeredY - stageMetrics.dropSnapOffset : centeredY;

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
          resizeMode="cover"
          accessibilityLabel={page.title || 'Interactive background'}
          accessibilityRole="image"
        />
      ) : null}

      <View style={styles.overlay} pointerEvents="box-none">
        {page.subtitle ? (
          <Text style={styles.pageSubtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        ) : null}

        <View
          style={[
            styles.optionsLayer,
            { top: isSingleLayout ? stageMetrics.optionTopOffset : 0 },
          ]}
          pointerEvents="box-none"
        >
          {options.map((option) => {
            const pos = optionPositions[option.id];
            if (!pos) return null;
            const hidden = dragLayer?.id === option.id;
            const lockedHere = Boolean(placedByOption[option.id]);
            return (
              <View
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    left: pos.x,
                    top: pos.y,
                    width: stageMetrics.cardWidth,
                    height: stageMetrics.cardHeight,
                    opacity: hidden ? 0 : playingOptionId && playingOptionId !== option.id ? 0.72 : 1,
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
          <View
            key={z.id}
            style={[
              styles.dropZone,
              {
                left: z.x,
                top: z.y,
                width: z.w,
                height: z.h,
              },
            ]}
            pointerEvents="none"
            accessibilityRole="image"
            accessibilityLabel={`${dropZoneItems.find((d) => d.id === z.id)?.label || 'Answer'} drop zone`}
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
          </View>
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

        {dropResult ? (
          <View style={styles.resultWrap} pointerEvents="none">
            <Text
              style={[
                styles.resultText,
                { color: dropResult === 'correct' ? colors.secondary : colors.error },
              ]}
              accessibilityLiveRegion="polite"
            >
              {dropResult === 'correct' ? 'Good Job!' : 'Try again'}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint} pointerEvents="none">
            Drag to the answer zone or tap to play audio.
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleRetry}
        disabled={isPreloading}
        style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Retry current page"
        accessibilityState={{ disabled: isPreloading }}
      >
        <Image
          source={cmsLocalUiAssets.retryButton}
          style={styles.btnImg}
          resizeMode="contain"
          accessibilityLabel="Retry"
        />
      </Pressable>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  resultWrap: {
    position: 'absolute',
    left: '50%',
    top: '72%',
    width: '90%',
    marginLeft: '-45%',
    alignItems: 'center',
    zIndex: 8,
  },
  resultText: {
    fontFamily: Quicksand.bold,
    fontSize: 22,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    color: '#fff',
    fontFamily: Quicksand.bold,
  },
  retryBtn: {
    position: 'absolute',
    right: '0.9375%',
    bottom: '5.1852%',
    width: '7.5%',
    aspectRatio: 1,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnImg: { width: '100%', height: '100%' },
  pressed: { opacity: 0.88 },
});
