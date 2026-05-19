const DEFAULT_CONFIG = {
  enabled: import.meta.env.VITE_AUDIO_SILENCE_TRIM_ENABLED !== 'false',
  thresholdDb: -40,
  minSilenceSec: 0.1,
  padMs: 80,
  windowSec: 0.01,
};

const dbToLinear = (db) => 10 ** (db / 20);

const readConfig = () => {
  const thresholdRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_THRESHOLD_DB);
  const minSilenceRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC);
  const padRaw = Number.parseInt(import.meta.env.VITE_AUDIO_SILENCE_TRIM_PAD_MS, 10);

  return {
    enabled: DEFAULT_CONFIG.enabled,
    thresholdDb: Number.isFinite(thresholdRaw) ? thresholdRaw : DEFAULT_CONFIG.thresholdDb,
    minSilenceSec: Number.isFinite(minSilenceRaw) ? minSilenceRaw : DEFAULT_CONFIG.minSilenceSec,
    padMs: Number.isFinite(padRaw) && padRaw >= 0 ? padRaw : DEFAULT_CONFIG.padMs,
    windowSec: DEFAULT_CONFIG.windowSec,
  };
};

const getChannelPeak = (buffer, channel, start, end) => {
  const data = buffer.getChannelData(channel);
  let peak = 0;
  for (let i = start; i < end; i += 1) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
};

const getWindowPeak = (buffer, start, end) => {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    peak = Math.max(peak, getChannelPeak(buffer, channel, start, end));
  }
  return peak;
};

const findSpeechStartSample = (buffer, config) => {
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minWindows = Math.max(1, Math.ceil(config.minSilenceSec / config.windowSec));
  const threshold = dbToLinear(config.thresholdDb);
  const padSamples = Math.floor((sampleRate * config.padMs) / 1000);

  let silentRun = 0;
  for (let start = 0; start < buffer.length; start += windowSize) {
    const end = Math.min(buffer.length, start + windowSize);
    const peak = getWindowPeak(buffer, start, end);
    if (peak < threshold) {
      silentRun += 1;
      continue;
    }
    if (silentRun >= minWindows || start === 0) {
      return Math.max(0, start - padSamples);
    }
    silentRun = 0;
  }
  return 0;
};

const findSpeechEndSample = (buffer, config) => {
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minWindows = Math.max(1, Math.ceil(config.minSilenceSec / config.windowSec));
  const threshold = dbToLinear(config.thresholdDb);
  const padSamples = Math.floor((sampleRate * config.padMs) / 1000);

  let silentRun = 0;
  for (let end = buffer.length; end > 0; end -= windowSize) {
    const start = Math.max(0, end - windowSize);
    const peak = getWindowPeak(buffer, start, end);
    if (peak < threshold) {
      silentRun += 1;
      continue;
    }
    if (silentRun >= minWindows || end >= buffer.length) {
      return Math.min(buffer.length, end + padSamples);
    }
    silentRun = 0;
  }
  return buffer.length;
};

const sliceAudioBuffer = (audioContext, source, startSample, endSample) => {
  const length = Math.max(1, endSample - startSample);
  const sliced = audioContext.createBuffer(
    source.numberOfChannels,
    length,
    source.sampleRate
  );

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const input = source.getChannelData(channel);
    const output = sliced.getChannelData(channel);
    output.set(input.subarray(startSample, endSample));
  }

  return sliced;
};

const encodeWavBlob = (buffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = buffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read trimmed audio'));
    reader.readAsDataURL(blob);
  });

/**
 * Trim leading/trailing silence from an audio File using the Web Audio API.
 * Fail-open: returns the original file as a data URL when trim is disabled or fails.
 */
export const trimLeadingTrailingSilenceFromFile = async (file) => {
  const config = readConfig();
  const originalDurationSec = await new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.src = objectUrl;
    audioEl.onloadedmetadata = () => {
      const duration = Number.isFinite(audioEl.duration) && audioEl.duration > 0
        ? Number(audioEl.duration.toFixed(3))
        : null;
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    audioEl.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
  });

  const failOpen = async () => {
    const dataUrl = await blobToDataUrl(file);
    return {
      audioUrl: dataUrl,
      durationSec: originalDurationSec,
      trimMeta: {
        applied: false,
        originalDurationSec,
        trimmedDurationSec: originalDurationSec,
        trimmedStartSec: 0,
        trimmedEndSec: 0,
      },
    };
  };

  if (!config.enabled || typeof window === 'undefined') {
    return failOpen();
  }

  let audioContext = null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return failOpen();

    audioContext = new AudioCtx();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    const startSample = findSpeechStartSample(decoded, config);
    const endSample = findSpeechEndSample(decoded, config);

    if (endSample <= startSample + Math.floor(decoded.sampleRate * 0.05)) {
      return failOpen();
    }

    const trimmedBuffer = sliceAudioBuffer(audioContext, decoded, startSample, endSample);
    const trimmedDurationSec = Number((trimmedBuffer.length / trimmedBuffer.sampleRate).toFixed(3));
    const trimmedStartSec = Number((startSample / decoded.sampleRate).toFixed(3));
    const trimmedEndSec = Number.isFinite(originalDurationSec)
      ? Number(Math.max(0, originalDurationSec - trimmedDurationSec - trimmedStartSec).toFixed(3))
      : 0;

    const removedTotal = Number.isFinite(originalDurationSec)
      ? originalDurationSec - trimmedDurationSec
      : 0;

    if (removedTotal <= 0.05) {
      return failOpen();
    }

    const wavBlob = encodeWavBlob(trimmedBuffer);
    const audioUrl = await blobToDataUrl(wavBlob);

    return {
      audioUrl,
      durationSec: trimmedDurationSec,
      trimMeta: {
        applied: true,
        originalDurationSec,
        trimmedDurationSec,
        trimmedStartSec,
        trimmedEndSec,
      },
    };
  } catch (error) {
    console.warn('[audioSilenceTrim] Frontend trim failed, using original audio:', error);
    return failOpen();
  } finally {
    if (audioContext) {
      await audioContext.close().catch(() => {});
    }
  }
};

export { readConfig as readAudioSilenceTrimConfig };
