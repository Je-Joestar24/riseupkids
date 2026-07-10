import { useCallback, useState } from 'react';
import { trimTransparentPaddingFromFile } from '../utils/imageTransparentTrim.util';

/**
 * Handles image file pick → optional transparent-padding crop → data URL for the book builder.
 */
const useImageFileWithTransparentTrim = () => {
  const [isTrimming, setIsTrimming] = useState(false);

  const processImageFile = useCallback(async (file) => {
    if (!file) return null;
    setIsTrimming(true);
    try {
      return await trimTransparentPaddingFromFile(file);
    } finally {
      setIsTrimming(false);
    }
  }, []);

  return {
    isTrimming,
    processImageFile,
  };
};

export default useImageFileWithTransparentTrim;
