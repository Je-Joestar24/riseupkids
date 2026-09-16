import { useCallback, useRef, useState } from 'react';
import StepUpDialog from '../components/auth/StepUpDialog';

/**
 * Chunk 10: promise-based step-up re-authentication. Call `requestStepUp()` before a sensitive
 * action — it renders a dialog asking for a fresh code and resolves with the short-lived
 * step-up token (or null if the user cancels). Attach the token as `X-Step-Up-Token` on the
 * actual sensitive request.
 *
 * @example
 * const { requestStepUp, StepUpModal } = useStepUp();
 * const handleDelete = async () => {
 *   const stepUpToken = await requestStepUp();
 *   if (!stepUpToken) return; // user cancelled
 *   await api.post('/admin/...', {}, { headers: { 'X-Step-Up-Token': stepUpToken } });
 * };
 * return <>{...}<StepUpModal /></>;
 */
export function useStepUp() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(null);

  const requestStepUp = useCallback(() => {
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleVerified = useCallback((token) => {
    setOpen(false);
    resolverRef.current?.(token);
    resolverRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  const StepUpModal = useCallback(
    () => <StepUpDialog open={open} onVerified={handleVerified} onCancel={handleCancel} />,
    [open, handleVerified, handleCancel]
  );

  return { requestStepUp, StepUpModal };
}

export default useStepUp;
