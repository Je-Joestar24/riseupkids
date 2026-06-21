/**
 * Resolved local media URIs after CMS player preload — consumed by page components.
 */

import React, { createContext, useContext, useMemo } from 'react';

import { resolvePlayableMediaUri, type CmsMediaUriMap } from './cms-player-media';

const CmsMediaUriContext = createContext<CmsMediaUriMap | null>(null);

export function useCmsMediaUriMap(): CmsMediaUriMap {
  return useContext(CmsMediaUriContext) ?? {};
}

export function CmsMediaUriProvider({
  uriMap,
  children,
}: {
  uriMap: CmsMediaUriMap;
  children: React.ReactNode;
}) {
  const value = useMemo(() => uriMap, [uriMap]);
  return (
    <CmsMediaUriContext.Provider value={value}>{children}</CmsMediaUriContext.Provider>
  );
}

/** Playable URI for a remote CMS asset (local file when preloaded). */
export function useCmsPlayableMediaUri(remoteUrl: string | null | undefined): string {
  const uriMap = useContext(CmsMediaUriContext);
  return resolvePlayableMediaUri(remoteUrl, uriMap);
}
