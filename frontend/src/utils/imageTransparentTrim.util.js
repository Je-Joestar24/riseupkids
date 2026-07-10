const DEFAULT_CONFIG = {
  enabled: import.meta.env.VITE_IMAGE_TRANSPARENT_TRIM_ENABLED !== 'false',
  /** Pixels with alpha <= threshold are treated as empty. */
  alphaThreshold: 8,
  /** Padding kept around detected content after crop. */
  padPx: 2,
  /** Skip crop when content already fills at least this fraction of the canvas. */
  minTrimRatio: 0.02,
};

const readConfig = () => {
  const alphaRaw = Number.parseInt(import.meta.env.VITE_IMAGE_TRANSPARENT_TRIM_ALPHA_THRESHOLD, 10);
  const padRaw = Number.parseInt(import.meta.env.VITE_IMAGE_TRANSPARENT_TRIM_PAD_PX, 10);
  const minTrimRaw = Number.parseFloat(import.meta.env.VITE_IMAGE_TRANSPARENT_TRIM_MIN_RATIO);

  return {
    enabled: DEFAULT_CONFIG.enabled,
    alphaThreshold: Number.isFinite(alphaRaw) && alphaRaw >= 0 ? alphaRaw : DEFAULT_CONFIG.alphaThreshold,
    padPx: Number.isFinite(padRaw) && padRaw >= 0 ? padRaw : DEFAULT_CONFIG.padPx,
    minTrimRatio: Number.isFinite(minTrimRaw) && minTrimRaw >= 0
      ? minTrimRaw
      : DEFAULT_CONFIG.minTrimRatio,
  };
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('Failed to read image file'));
  };
  reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
  reader.readAsDataURL(file);
});

const loadImage = (source) => new Promise((resolve, reject) => {
  const img = new Image();
  let objectUrl = '';

  img.onload = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    resolve(img);
  };
  img.onerror = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    reject(new Error('Failed to decode image'));
  };

  if (source instanceof File || source instanceof Blob) {
    objectUrl = URL.createObjectURL(source);
    img.src = objectUrl;
    return;
  }

  img.src = String(source || '');
});

const findOpaqueBounds = (imageData, width, height, alphaThreshold) => {
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[((y * width) + x) * 4 + 3];
      if (alpha <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

const canvasToDataUrl = (canvas, mimeType) => {
  if (mimeType === 'image/jpeg') return canvas.toDataURL('image/jpeg', 0.92);
  return canvas.toDataURL('image/png');
};

/**
 * Detects non-transparent pixels and crops empty padding from PNG/WebP-style assets.
 */
export const trimTransparentPaddingFromImageSource = async (source, options = {}) => {
  const config = { ...readConfig(), ...options };
  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!width || !height) {
    throw new Error('Image has no dimensions');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable');

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const bounds = findOpaqueBounds(imageData, width, height, config.alphaThreshold);
  const outputMime = source instanceof File && source.type.startsWith('image/')
    ? source.type
    : 'image/png';

  if (!bounds) {
    return {
      imageUrl: canvasToDataUrl(canvas, outputMime),
      trimMeta: {
        applied: false,
        reason: 'fully_transparent',
        originalWidth: width,
        originalHeight: height,
      },
    };
  }

  const trimmedAreaRatio = 1 - ((bounds.width * bounds.height) / (width * height));
  if (trimmedAreaRatio < config.minTrimRatio) {
    return {
      imageUrl: canvasToDataUrl(canvas, outputMime),
      trimMeta: {
        applied: false,
        reason: 'no_significant_padding',
        originalWidth: width,
        originalHeight: height,
        trimmedAreaRatio,
      },
    };
  }

  const cropX = Math.max(0, bounds.minX - config.padPx);
  const cropY = Math.max(0, bounds.minY - config.padPx);
  const cropW = Math.min(width - cropX, bounds.width + (config.padPx * 2));
  const cropH = Math.min(height - cropY, bounds.height + (config.padPx * 2));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW;
  outCanvas.height = cropH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas is unavailable');

  outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return {
    imageUrl: canvasToDataUrl(outCanvas, 'image/png'),
    trimMeta: {
      applied: true,
      originalWidth: width,
      originalHeight: height,
      croppedWidth: cropW,
      croppedHeight: cropH,
      cropX,
      cropY,
      trimmedAreaRatio,
    },
  };
};

/**
 * File pick helper for the book builder — trims transparent padding when enabled.
 */
export const trimTransparentPaddingFromFile = async (file, options = {}) => {
  if (!file) return null;

  const config = { ...readConfig(), ...options };
  const fallback = async () => ({
    imageUrl: await fileToDataUrl(file),
    trimMeta: { applied: false, reason: 'fallback' },
  });

  if (!config.enabled || !String(file.type || '').startsWith('image/')) {
    return fallback();
  }

  try {
    return await trimTransparentPaddingFromImageSource(file, config);
  } catch {
    return fallback();
  }
};
