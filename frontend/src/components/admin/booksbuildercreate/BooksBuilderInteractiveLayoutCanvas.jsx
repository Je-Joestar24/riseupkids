import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { layoutRectToPx, normalizeLayoutRect } from '../../../utils/cmsInteractiveLayout';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_SIZE_PCT = 3;

const clampRectToStage = (rect) => {
  const safe = normalizeLayoutRect(rect);
  if (!safe) return null;
  const wPct = Math.max(MIN_SIZE_PCT, safe.wPct);
  const hPct = Math.max(MIN_SIZE_PCT, safe.hPct);
  const xPct = Math.min(Math.max(0, safe.xPct), 100 - wPct);
  const yPct = Math.min(Math.max(0, safe.yPct), 100 - hPct);
  return { xPct, yPct, wPct, hPct };
};

const applyResize = (startRect, handle, dxPct, dyPct) => {
  let { xPct, yPct, wPct, hPct } = startRect;
  if (handle.includes('e')) wPct += dxPct;
  if (handle.includes('w')) {
    xPct += dxPct;
    wPct -= dxPct;
  }
  if (handle.includes('s')) hPct += dyPct;
  if (handle.includes('n')) {
    yPct += dyPct;
    hPct -= dyPct;
  }
  return clampRectToStage({ xPct, yPct, wPct, hPct });
};

const BooksBuilderInteractiveLayoutCanvas = ({
  backgroundImageUrl = '',
  elements = [],
  selectedKey = '',
  onSelect,
  onLayoutChange,
}) => {
  const theme = useTheme();
  const stageRef = useRef(null);
  const [draggingKey, setDraggingKey] = useState('');
  const pendingLayoutFrameRef = useRef(null);

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [elements]
  );

  const getStageSize = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    return {
      width: rect?.width || 1,
      height: rect?.height || 1,
    };
  }, []);

  const startInteraction = (event, element, mode, handle = '') => {
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(element.key);
    const layout = normalizeLayoutRect(element.layout);
    if (!layout) return;

    const { width, height } = getStageSize();
    const pointerX = event.clientX;
    const pointerY = event.clientY;

    setDraggingKey(element.key);

    const layoutFromPointer = (clientX, clientY) => {
      const dxPct = ((clientX - pointerX) / width) * 100;
      const dyPct = ((clientY - pointerY) / height) * 100;
      if (mode === 'move') {
        return clampRectToStage({
          ...layout,
          xPct: layout.xPct + dxPct,
          yPct: layout.yPct + dyPct,
        });
      }
      return applyResize(layout, handle, dxPct, dyPct);
    };

    const scheduleLayoutCommit = (nextLayout) => {
      if (!nextLayout) return;
      if (pendingLayoutFrameRef.current) {
        cancelAnimationFrame(pendingLayoutFrameRef.current);
      }
      pendingLayoutFrameRef.current = requestAnimationFrame(() => {
        pendingLayoutFrameRef.current = null;
        onLayoutChange?.(element.key, nextLayout);
      });
    };

    const onMove = (moveEvent) => {
      scheduleLayoutCommit(layoutFromPointer(moveEvent.clientX, moveEvent.clientY));
    };

    const onUp = (upEvent) => {
      if (pendingLayoutFrameRef.current) {
        cancelAnimationFrame(pendingLayoutFrameRef.current);
        pendingLayoutFrameRef.current = null;
      }
      const finalLayout = layoutFromPointer(upEvent.clientX, upEvent.clientY);
      if (finalLayout) onLayoutChange?.(element.key, finalLayout);
      setDraggingKey('');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <Box
      sx={{
        width: '100%',
        borderRadius: '12px',
        border: `1px solid ${theme.palette.border.main}`,
        overflow: 'hidden',
        bgcolor: theme.palette.common.white,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 1.5,
          py: 0.75,
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 700,
          color: 'text.secondary',
        }}
      >
        Layout canvas (16:9) — drag and resize elements; uploads are in the panel beside this area.
      </Typography>

      <Box
        ref={stageRef}
        role="application"
        aria-label="Interactive page layout canvas"
        onPointerDown={() => onSelect?.('')}
        sx={{
          width: '100%',
          aspectRatio: '1920 / 1080',
          position: 'relative',
          bgcolor: backgroundImageUrl ? 'transparent' : theme.palette.common.white,
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {backgroundImageUrl ? (
          <Box
            component="img"
            src={backgroundImageUrl}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        {sortedElements.map((element) => {
          const layout = normalizeLayoutRect(element.layout);
          if (!layout || !element.imageUrl) return null;
          const { width, height } = getStageSize();
          const box = layoutRectToPx(layout, width, height);
          if (!box) return null;
          const isSelected = selectedKey === element.key;
          const isDragging = draggingKey === element.key;

          return (
            <Box
              key={element.key}
              onPointerDown={(event) => startInteraction(event, element, 'move')}
              sx={{
                position: 'absolute',
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                zIndex: element.zIndex || 1,
                boxSizing: 'border-box',
                border: isSelected
                  ? `2px solid ${theme.palette.primary.main}`
                  : '1px dashed rgba(0,0,0,0.25)',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
            >
              <Box
                component="img"
                src={element.imageUrl}
                alt={element.label || element.key}
                draggable={false}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
              {isSelected
                ? HANDLES.map((handle) => (
                    <Box
                      key={`${element.key}-${handle}`}
                      role="presentation"
                      onPointerDown={(event) => startInteraction(event, element, 'resize', handle)}
                      sx={{
                        position: 'absolute',
                        width: 10,
                        height: 10,
                        bgcolor: theme.palette.primary.main,
                        border: `1px solid ${theme.palette.common.white}`,
                        borderRadius: '2px',
                        ...(handle.includes('n') ? { top: -5 } : {}),
                        ...(handle.includes('s') ? { bottom: -5 } : {}),
                        ...(handle.includes('w') ? { left: -5 } : {}),
                        ...(handle.includes('e') ? { right: -5 } : {}),
                        ...((!handle.includes('n') && !handle.includes('s')) ? { top: '50%', mt: '-5px' } : {}),
                        ...((!handle.includes('w') && !handle.includes('e')) ? { left: '50%', ml: '-5px' } : {}),
                        cursor: `${handle}-resize`,
                      }}
                    />
                  ))
                : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BooksBuilderInteractiveLayoutCanvas;
