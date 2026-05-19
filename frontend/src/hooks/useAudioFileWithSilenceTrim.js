import { useCallback, useState } from 'react';
import { trimLeadingTrailingSilenceFromFile } from '../utils/audioSilenceTrim.util';

/**
 * Handles audio file pick → optional edge silence trim → data URL for the book builder.
 */
const useAudioFileWithSilenceTrim = () => {
  const [isTrimming, setIsTrimming] = useState(false);

  const processAudioFile = useCallback(async (file) => {
    if (!file) return null;
    setIsTrimming(true);
    try {
      return await trimLeadingTrailingSilenceFromFile(file);
    } finally {
      setIsTrimming(false);
    }
  }, []);

  return {
    isTrimming,
    processAudioFile,
  };
};

export default useAudioFileWithSilenceTrim;
