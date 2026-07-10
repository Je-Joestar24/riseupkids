const DEFAULT_CONFIG = {
  enabled: import.meta.env.VITE_AUDIO_SILENCE_TRIM_ENABLED !== 'false',
  thresholdDb: -36,
  speechThresholdDb: -28,
  minSilenceSec: 0.12,
  minSpeechSec: 0.15,
  /** Edge padding kept after trim (0.2s). */
  padMs: 200,
  /** High-pass cutoff (Hz) — ignore low-frequency hum/rumble during speech detection. */
  highpassHz: 400,
  windowSec: 0.01,
};

const dbToLinear = (db) => 10 ** (db / 20);

const readConfig = () => {
  const thresholdRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_THRESHOLD_DB);
  const speechThresholdRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_SPEECH_THRESHOLD_DB);
  const minSilenceRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC);
  const minSpeechRaw = Number.parseFloat(import.meta.env.VITE_AUDIO_SILENCE_TRIM_MIN_SPEECH_SEC);
  const padRaw = Number.parseInt(import.meta.env.VITE_AUDIO_SILENCE_TRIM_PAD_MS, 10);
  const highpassRaw = Number.parseInt(import.meta.env.VITE_AUDIO_SILENCE_TRIM_HIGHPASS_HZ, 10);

  return {
    enabled: DEFAULT_CONFIG.enabled,
    thresholdDb: Number.isFinite(thresholdRaw) ? thresholdRaw : DEFAULT_CONFIG.thresholdDb,
    speechThresholdDb: Number.isFinite(speechThresholdRaw) ? speechThresholdRaw : DEFAULT_CONFIG.speechThresholdDb,
    minSilenceSec: Number.isFinite(minSilenceRaw) ? minSilenceRaw : DEFAULT_CONFIG.minSilenceSec,
    minSpeechSec: Number.isFinite(minSpeechRaw) ? minSpeechRaw : DEFAULT_CONFIG.minSpeechSec,
    padMs: Number.isFinite(padRaw) && padRaw >= 0 ? padRaw : DEFAULT_CONFIG.padMs,
    highpassHz: Number.isFinite(highpassRaw) && highpassRaw > 0 ? highpassRaw : DEFAULT_CONFIG.highpassHz,
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

/**
 * High-pass filter for analysis only — speech band, not rumble/hum (slice uses original buffer).
 */
const applyHighpassForAnalysis = async (buffer, cutoffHz) => {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineCtx) return buffer;

  const offline = new OfflineCtx(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  const highpass = offline.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = cutoffHz;
  highpass.Q.value = 0.707;
  source.connect(highpass);
  highpass.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
};

/** Leading edge only — returns 0 when audio starts with speech (internal pauses ignored). */
const findSpeechStartSample = (analysisBuffer, config) => {
  const sampleRate = analysisBuffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minSilentWindows = Math.max(1, Math.ceil(config.minSilenceSec / config.windowSec));
  const minSpeechWindows = Math.max(1, Math.ceil(config.minSpeechSec / config.windowSec));
  const silenceThreshold = dbToLinear(config.thresholdDb);
  const speechThreshold = dbToLinear(config.speechThresholdDb);

  let silentRun = 0;

  for (let start = 0; start < analysisBuffer.length; start += windowSize) {
    const end = Math.min(analysisBuffer.length, start + windowSize);
    const peak = getWindowPeak(analysisBuffer, start, end);

    if (peak < silenceThreshold) {
      silentRun += 1;
      continue;
    }

    if (silentRun < minSilentWindows) {
      return 0;
    }

    let speechRun = 0;
    for (let s = start; s < analysisBuffer.length; s += windowSize) {
      const e = Math.min(analysisBuffer.length, s + windowSize);
      const pk = getWindowPeak(analysisBuffer, s, e);

      if (pk >= speechThreshold) {
        speechRun += 1;
        if (speechRun >= minSpeechWindows) {
          return Math.max(0, s - (minSpeechWindows - 1) * windowSize);
        }
      } else if (pk < silenceThreshold) {
        speechRun = 0;
      } else {
        speechRun = 0;
      }
    }

    return Math.min(analysisBuffer.length, silentRun * windowSize);
  }

  return 0;
};

/** Trailing edge only — returns full length when audio ends with speech. */
const findSpeechEndSample = (analysisBuffer, config) => {
  const sampleRate = analysisBuffer.sampleRate;
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minSilentWindows = Math.max(1, Math.ceil(config.minSilenceSec / config.windowSec));
  const minSpeechWindows = Math.max(1, Math.ceil(config.minSpeechSec / config.windowSec));
  const silenceThreshold = dbToLinear(config.thresholdDb);
  const speechThreshold = dbToLinear(config.speechThresholdDb);

  let silentRun = 0;

  for (let end = analysisBuffer.length; end > 0; end -= windowSize) {
    const start = Math.max(0, end - windowSize);
    const peak = getWindowPeak(analysisBuffer, start, end);

    if (peak < silenceThreshold) {
      silentRun += 1;
      continue;
    }

    if (silentRun < minSilentWindows) {
      return analysisBuffer.length;
    }

    let speechRun = 0;
    for (let e = end; e > 0; e -= windowSize) {
      const s = Math.max(0, e - windowSize);
      const pk = getWindowPeak(analysisBuffer, s, e);

      if (pk >= speechThreshold) {
        speechRun += 1;
        if (speechRun >= minSpeechWindows) {
          return Math.min(analysisBuffer.length, e + (minSpeechWindows - 1) * windowSize);
        }
      } else if (pk < silenceThreshold) {
        speechRun = 0;
      } else {
        speechRun = 0;
      }
    }

    return Math.max(0, analysisBuffer.length - silentRun * windowSize);
  }

  return analysisBuffer.length;
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
 * Speech detection runs on a high-pass filtered copy; the cut is applied to the original audio.
 */
export const trimLeadingTrailingSilenceFromFile = async (file) => {
  const config = readConfig();

  const failOpen = async () => {
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
        preTrimmed: false,
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
    const originalDurationSec = Number((decoded.length / decoded.sampleRate).toFixed(3));

    const analysisBuffer = await applyHighpassForAnalysis(decoded, config.highpassHz);
    const speechStartSample = findSpeechStartSample(analysisBuffer, config);
    const speechEndSample = findSpeechEndSample(analysisBuffer, config);
    const padSamples = Math.floor((decoded.sampleRate * config.padMs) / 1000);
    const startSample = Math.max(0, speechStartSample - padSamples);
    const endSample = Math.min(decoded.length, speechEndSample + padSamples);

    if (endSample <= startSample + Math.floor(decoded.sampleRate * 0.05)) {
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
          preTrimmed: false,
        },
      };
    }

    const trimmedBuffer = sliceAudioBuffer(audioContext, decoded, startSample, endSample);
    const trimmedDurationSec = Number((trimmedBuffer.length / trimmedBuffer.sampleRate).toFixed(3));
    const trimmedStartSec = Number((startSample / decoded.sampleRate).toFixed(3));
    const trimmedEndSec = Number(
      Math.max(0, originalDurationSec - trimmedDurationSec - trimmedStartSec).toFixed(3)
    );

    const removedTotal = originalDurationSec - trimmedDurationSec;

    if (removedTotal <= 0.05) {
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
          preTrimmed: false,
        },
      };
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
        preTrimmed: true,
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
