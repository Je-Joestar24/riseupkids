import goodJobAudioUrl from '../../../../assets/audio/Good_Job_REAL.mp3';
import tryAgainAudioUrl from '../../../../assets/audio/Try_Again_REAL.mp3';

export const CMS_INTERACTIVE_GOOD_JOB_AUDIO_URL = goodJobAudioUrl;
export const CMS_INTERACTIVE_TRY_AGAIN_AUDIO_URL = tryAgainAudioUrl;

/** Bundled SFX for CMS drag-and-drop feedback (correct vs retry). */
export const resolveCmsInteractiveFeedbackAudioUrl = (result = '') => {
  if (result === 'correct') return CMS_INTERACTIVE_GOOD_JOB_AUDIO_URL;
  if (result === 'wrong') return CMS_INTERACTIVE_TRY_AGAIN_AUDIO_URL;
  return '';
};
