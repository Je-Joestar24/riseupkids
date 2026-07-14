/**
 * Admin-facing account status labels.
 * Distinguishes self-service deletion from admin archive.
 */
export function getAdminAccountDisplayStatus(user) {
  const deletionRequest = user?.deletionRequest;

  if (deletionRequest) {
    if (deletionRequest.status === 'pending' || deletionRequest.status === 'processing') {
      return {
        label: 'Deletion pending',
        muiColor: 'warning',
        canRestore: false,
        canArchive: false,
        deletionRequest,
      };
    }

    if (deletionRequest.status === 'completed') {
      return {
        label: 'Deleted',
        muiColor: 'error',
        canRestore: false,
        canArchive: false,
        deletionRequest,
      };
    }

    if (deletionRequest.status === 'failed') {
      return {
        label: 'Deletion failed',
        muiColor: 'error',
        canRestore: false,
        canArchive: false,
        deletionRequest,
      };
    }
  }

  if (user?.isActive) {
    return {
      label: 'Active',
      muiColor: 'success',
      canRestore: false,
      canArchive: true,
      deletionRequest: null,
    };
  }

  return {
    label: 'Archived',
    muiColor: 'default',
    canRestore: true,
    canArchive: false,
    deletionRequest: null,
  };
}

export function formatDeletionScheduleDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  return new Date(dateValue).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
