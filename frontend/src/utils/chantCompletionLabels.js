/**
 * Context-aware completion labels for chant modals.
 * Chants may include reference audio only, or instruction video plus audio.
 */
export function getChantCompletionLabels({ hasInstructionVideo, hasReferenceAudio }) {
  if (hasReferenceAudio) {
    return {
      finishLabel: 'I finished singing',
      keepGoingLabel: hasInstructionVideo ? 'Keep going' : 'Keep listening',
      closeConfirmMessage:
        'Do you want to close this chant? Tap "I finished singing" when you are done to save your progress.',
    };
  }

  if (hasInstructionVideo) {
    return {
      finishLabel: 'I finished watching',
      keepGoingLabel: 'Keep watching',
      closeConfirmMessage:
        'Do you want to close this chant? Tap "I finished watching" when you are done to save your progress.',
    };
  }

  return {
    finishLabel: 'I finished',
    keepGoingLabel: 'Keep going',
    closeConfirmMessage:
      'Do you want to close this chant? Tap "I finished" when you are done to save your progress.',
  };
}
