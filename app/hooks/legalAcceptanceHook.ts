import { useCallback, useEffect, useState } from 'react';

import { legalAcceptanceService } from '@/services/legalAcceptanceService';

export function useLegalAcceptance() {
  const [isReady, setIsReady] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const refresh = useCallback(async () => {
    const accepted = await legalAcceptanceService.hasAcceptedCurrentTerms();
    setHasAccepted(accepted);
    setIsReady(true);
    return accepted;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(async () => {
    await legalAcceptanceService.recordAcceptance();
    setHasAccepted(true);
  }, []);

  return {
    isReady,
    hasAccepted,
    accept,
    refresh,
  };
}
