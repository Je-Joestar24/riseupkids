export interface NotificationDestination {
  kind?: string | null;
  contentId?: string | null;
}

/**
 * Map a campaign destination onto an in-app route.
 * Unknown kinds return null so a tap never crashes.
 */
export function resolveNotificationDestinationPath(
  destination: NotificationDestination | null | undefined,
  childId?: string | null
): string | null {
  const kind = String(destination?.kind || '').trim().toLowerCase();
  if (!kind) return null;

  const id = childId ? encodeURIComponent(String(childId)) : '';
  const contentId = destination?.contentId ? encodeURIComponent(String(destination.contentId)) : '';

  if (kind === 'parent_progress') {
    return '/parent/settings';
  }

  if (!id) {
    return null;
  }

  switch (kind) {
    case 'home':
      return `/child/${id}/home`;
    case 'journey':
      return `/child/${id}/journey`;
    case 'explore':
    case 'story_time':
      return `/child/${id}/explore`;
    case 'wall':
      return `/child/${id}/wall`;
    case 'rewards':
      return `/child/${id}/profile`;
    case 'live_lesson':
      return contentId ? `/child/${id}/home?liveId=${contentId}` : `/child/${id}/home`;
    case 'book':
      return contentId ? `/child/${id}/module?bookId=${contentId}` : `/child/${id}/journey`;
    case 'mini_mission':
      return contentId
        ? `/child/${id}/star-cam-mission-start?missionId=${contentId}`
        : `/child/${id}/star-cam`;
    case 'announcement':
      return `/child/${id}/home`;
    default:
      return null;
  }
}

export function parseNotificationTapData(
  data: {
    destinationKind?: string | null;
    contentId?: string | null;
    childId?: string | null;
    destination?: NotificationDestination;
  } | null
  | undefined,
  fallbackChildId?: string | null
): string | null {
  const destination = data?.destination || {
    kind: data?.destinationKind,
    contentId: data?.contentId,
  };
  return resolveNotificationDestinationPath(destination, data?.childId || fallbackChildId);
}
