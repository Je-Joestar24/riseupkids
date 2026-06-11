import { useCallback, useState } from 'react';
import { trimLeadingTrailingSilenceFromFile } from '../utils/audioSilenceTrim.util';

const dataUrlToAudioFile = async (dataUrl, originalName) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type === 'audio/wav' ? 'wav' : (originalName?.split('.').pop() || 'wav');
  const baseName = (originalName || 'audio').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.${ext}`, { type: blob.type || 'audio/wav' });
};

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

  const processAudioFileForUpload = useCallback(async (file) => {
    if (!file) return null;
    setIsTrimming(true);
    try {
      const trimmed = await trimLeadingTrailingSilenceFromFile(file);
      let uploadFile = file;
      if (trimmed.trimMeta?.applied && trimmed.audioUrl?.startsWith('data:')) {
        uploadFile = await dataUrlToAudioFile(trimmed.audioUrl, file.name);
      }
      return {
        file: uploadFile,
        previewUrl: trimmed.trimMeta?.applied ? trimmed.audioUrl : URL.createObjectURL(uploadFile),
        durationSec: trimmed.durationSec,
        trimMeta: trimmed.trimMeta,
      };
    } finally {
      setIsTrimming(false);
    }
  }, []);

  return {
    isTrimming,
    processAudioFile,
    processAudioFileForUpload,
  };
};

export default useAudioFileWithSilenceTrim;
