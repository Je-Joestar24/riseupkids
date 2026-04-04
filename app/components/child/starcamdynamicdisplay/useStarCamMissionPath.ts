import { useMemo } from 'react';

export function useStarCamMissionPath(mapW: number, mapH: number) {
  return useMemo(() => {
    if (mapW < 1 || mapH < 1) return '';
    const sx = mapW / 390;
    const sy = mapH / 844;
    return `M ${195 * sx} ${255 * sy} Q ${165 * sx} ${330 * sy}, ${195 * sx} ${410 * sy} Q ${220 * sx} ${490 * sy}, ${195 * sx} ${570 * sy}`;
  }, [mapW, mapH]);
}
