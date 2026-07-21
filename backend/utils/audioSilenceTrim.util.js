const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

const EXT_BY_MIME = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
};

const ANALYSIS_SAMPLE_RATE = 44100;

function readTrimConfig() {
  const thresholdRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_THRESHOLD_DB);
  const trailingThresholdRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_TRAILING_THRESHOLD_DB);
  const minSilenceRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC);
  const minTrailingSilenceRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_MIN_TRAILING_SILENCE_SEC);
  const padRaw = Number.parseInt(process.env.AUDIO_SILENCE_TRIM_PAD_MS, 10);
  const trailingPadRaw = Number.parseInt(process.env.AUDIO_SILENCE_TRIM_TRAILING_PAD_MS, 10);
  const highpassRaw = Number.parseInt(process.env.AUDIO_SILENCE_TRIM_HIGHPASS_HZ, 10);

  const padMs = Number.isFinite(padRaw) && padRaw >= 0 ? padRaw : 200;
  const trailingPadMs = Number.isFinite(trailingPadRaw) && trailingPadRaw >= 0 ? trailingPadRaw : 400;

  return {
    enabled: process.env.AUDIO_SILENCE_TRIM_ENABLED !== 'false',
    /** Below this counts as silence; anything above is treated as audio/speech. */
    thresholdDb: Number.isFinite(thresholdRaw) ? thresholdRaw : -36,
    /**
     * Trailing edge only — more lenient than thresholdDb so quiet word endings
     * (e.g. "book" in "notebook") are not treated as silence.
     */
    trailingThresholdDb: Number.isFinite(trailingThresholdRaw) ? trailingThresholdRaw : -42,
    minSilenceSec: Number.isFinite(minSilenceRaw) ? minSilenceRaw : 0.12,
    /** Minimum sustained silence required at the file end before trimming. */
    minTrailingSilenceSec: Number.isFinite(minTrailingSilenceRaw) ? minTrailingSilenceRaw : 0.25,
    /** Padding kept before speech after a leading trim. */
    padMs,
    /** Extra padding kept after speech when trimming trailing silence. */
    trailingPadMs,
    /** High-pass cutoff (Hz) for speech detection — ignores low-frequency hum. */
    highpassHz: Number.isFinite(highpassRaw) && highpassRaw > 0 ? highpassRaw : 400,
    windowSec: 0.01,
  };
}

const dbToLinear = (db) => 10 ** (db / 20);

function extensionFromFile(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const ext = path.extname(String(file?.originalname || '')).replace('.', '').toLowerCase();
  if (ext) return ext;
  return 'mp3';
}

function mimeFromExtension(ext) {
  const map = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  };
  return map[ext] || 'audio/mpeg';
}

function runProcess(binary, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(stderr || `${path.basename(binary)} exited with code ${code}`);
        err.stderr = stderr;
        err.stdout = stdout;
        reject(err);
      }
    });
  });
}

function runProcessBuffer(binary, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { windowsHide: true });
    const chunks = [];

    proc.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    proc.stderr.on('data', () => {});

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`${path.basename(binary)} exited with code ${code}`));
      }
    });
  });
}

async function probeDurationSec(filePath) {
  const { stdout } = await runProcess(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const duration = Number.parseFloat(String(stdout).trim());
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function getWindowPeak(samples, start, end) {
  let peak = 0;
  for (let i = start; i < end; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return peak;
}

/**
 * Leading edge only: trim silence at the very start of the file.
 * If audio begins with speech (no leading silence), returns 0.
 * Internal pauses are never treated as a trim point.
 */
function findLeadingTrimSample(samples, sampleRate, config) {
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minSilentWindows = Math.max(1, Math.ceil(config.minSilenceSec / config.windowSec));
  const silenceThreshold = dbToLinear(config.thresholdDb);
  const audioThreshold = dbToLinear(config.trailingThresholdDb ?? config.thresholdDb);

  let silentRun = 0;
  let pastLeadingSilence = false;

  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    const peak = getWindowPeak(samples, start, end);

    if (!pastLeadingSilence) {
      if (peak < silenceThreshold) {
        silentRun += 1;
        if (silentRun >= minSilentWindows) {
          pastLeadingSilence = true;
        }
        continue;
      }

      return 0;
    }

    if (peak >= audioThreshold) {
      return Math.max(0, start);
    }
  }

  return 0;
}

/**
 * Trailing edge only: remove sustained silence at the very end.
 * Uses a lenient threshold and never walks backward through speech — quiet
 * syllables and volume dips at the end of a phrase are preserved.
 */
function findTrailingTrimSample(samples, sampleRate, config) {
  const windowSize = Math.max(1, Math.floor(sampleRate * config.windowSec));
  const minTrailingSilenceSec = config.minTrailingSilenceSec ?? config.minSilenceSec;
  const minSilentWindows = Math.max(1, Math.ceil(minTrailingSilenceSec / config.windowSec));
  const trailingThreshold = dbToLinear(config.trailingThresholdDb ?? config.thresholdDb);

  let silentRun = 0;

  for (let end = samples.length; end > 0; end -= windowSize) {
    const start = Math.max(0, end - windowSize);
    const peak = getWindowPeak(samples, start, end);

    if (peak < trailingThreshold) {
      silentRun += 1;
      continue;
    }

    break;
  }

  if (silentRun >= minSilentWindows) {
    return Math.max(0, samples.length - silentRun * windowSize);
  }

  return samples.length;
}

function findSpeechBounds(samples, sampleRate, config) {
  const startSample = findLeadingTrimSample(samples, sampleRate, config);
  const endSample = findTrailingTrimSample(samples, sampleRate, config);

  return { startSample, endSample };
}

async function decodeMonoPcmForAnalysis(filePath, config) {
  const highpassHz = config.highpassHz || 400;
  const pcmBuffer = await runProcessBuffer(ffmpegPath, [
    '-hide_banner',
    '-i',
    filePath,
    '-af',
    `highpass=f=${highpassHz}`,
    '-ac',
    '1',
    '-ar',
    String(ANALYSIS_SAMPLE_RATE),
    '-f',
    'f32le',
    'pipe:1',
  ]);

  if (!pcmBuffer || pcmBuffer.length < 4) {
    return null;
  }

  return new Float32Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
}

async function detectEdgeSilence(filePath, config, totalDurationSec) {
  try {
    const samples = await decodeMonoPcmForAnalysis(filePath, config);
    if (!samples || samples.length === 0) {
      return { trimmedStartSec: 0, trimmedEndSec: 0 };
    }

    const { startSample, endSample } = findSpeechBounds(samples, ANALYSIS_SAMPLE_RATE, config);
    const analysisDurationSec = samples.length / ANALYSIS_SAMPLE_RATE;
    const trimmedStartSec = startSample / ANALYSIS_SAMPLE_RATE;
    const trimmedEndSec = Math.max(0, analysisDurationSec - endSample / ANALYSIS_SAMPLE_RATE);

    if (Number.isFinite(totalDurationSec) && totalDurationSec > 0) {
      const scale = totalDurationSec / analysisDurationSec;
      return {
        trimmedStartSec: trimmedStartSec * scale,
        trimmedEndSec: trimmedEndSec * scale,
      };
    }

    return { trimmedStartSec, trimmedEndSec };
  } catch (_error) {
    return { trimmedStartSec: 0, trimmedEndSec: 0 };
  }
}

function buildAtrimFilter(config, edgeEstimate, totalDurationSec) {
  const padStartSec = config.padMs / 1000;
  const padEndSec = (config.trailingPadMs ?? config.padMs) / 1000;
  const total = Number(totalDurationSec);
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }

  const speechStart = Math.max(0, Number(edgeEstimate.trimmedStartSec) || 0);
  const trailingSilence = Math.max(0, Number(edgeEstimate.trimmedEndSec) || 0);
  const trimStart = Math.max(0, speechStart - padStartSec);
  const trimEnd = Math.min(total, total - trailingSilence + padEndSec);

  if (trimEnd <= trimStart + 0.05) {
    return null;
  }

  return `atrim=start=${trimStart.toFixed(3)}:end=${trimEnd.toFixed(3)},asetpts=PTS-STARTPTS`;
}

async function probeDurationFromBuffer(buffer, ext = 'mp3') {
  let tempDir = null;
  try {
    const { dir, inputPath } = await writeTempFile(buffer, ext);
    tempDir = dir;
    return probeDurationSec(inputPath);
  } catch {
    return null;
  } finally {
    await cleanupTemp(tempDir);
  }
}

async function writeTempFile(buffer, ext) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruk-audio-trim-'));
  const inputPath = path.join(dir, `input.${ext}`);
  const outputPath = path.join(dir, `output.${ext}`);
  await fs.writeFile(inputPath, buffer);
  return { dir, inputPath, outputPath };
}

async function cleanupTemp(dir) {
  if (!dir) return;
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

/**
 * Trim leading/trailing silence from an audio file buffer (string-trim analog).
 * Fail-open: returns original file on errors or when trim is disabled.
 *
 * @param {{ buffer: Buffer, mimetype?: string, originalname?: string }} file
 * @returns {Promise<{
 *   buffer: Buffer,
 *   mimetype: string,
 *   size: number,
 *   durationSec: number|null,
 *   trimMeta: {
 *     applied: boolean,
 *     originalDurationSec: number|null,
 *     trimmedDurationSec: number|null,
 *     trimmedStartSec: number,
 *     trimmedEndSec: number,
 *   }
 * }>}
 */
async function trimLeadingTrailingSilence(file, { preTrimmed = false } = {}) {
  const buffer = file?.buffer;
  const originalMimetype = file?.mimetype || 'audio/mpeg';
  const ext = extensionFromFile(file);

  const baseTrimMeta = {
    applied: false,
    originalDurationSec: null,
    trimmedDurationSec: null,
    trimmedStartSec: 0,
    trimmedEndSec: 0,
    preTrimmed: Boolean(preTrimmed),
  };

  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      buffer,
      mimetype: originalMimetype,
      size: buffer?.length || 0,
      durationSec: null,
      trimMeta: baseTrimMeta,
    };
  }

  const config = readTrimConfig();
  let tempDir = null;

  try {
    if (preTrimmed) {
      const durationSec = await probeDurationFromBuffer(buffer, ext);
      return {
        buffer,
        mimetype: originalMimetype,
        size: buffer.length,
        durationSec,
        trimMeta: {
          applied: true,
          originalDurationSec: durationSec,
          trimmedDurationSec: durationSec,
          trimmedStartSec: 0,
          trimmedEndSec: 0,
          preTrimmed: true,
        },
      };
    }

    const { dir, inputPath, outputPath } = await writeTempFile(buffer, ext);
    tempDir = dir;

    const originalDurationSec = await probeDurationSec(inputPath);
    baseTrimMeta.originalDurationSec = originalDurationSec;

    if (!config.enabled) {
      return {
        buffer,
        mimetype: originalMimetype,
        size: buffer.length,
        durationSec: originalDurationSec,
        trimMeta: baseTrimMeta,
      };
    }

    const edgeEstimate = await detectEdgeSilence(inputPath, config, originalDurationSec);
    const atrimFilter = buildAtrimFilter(config, edgeEstimate, originalDurationSec);

    if (!atrimFilter) {
      return {
        buffer,
        mimetype: originalMimetype,
        size: buffer.length,
        durationSec: originalDurationSec,
        trimMeta: baseTrimMeta,
      };
    }

    await runProcess(ffmpegPath, [
      '-hide_banner',
      '-y',
      '-i',
      inputPath,
      '-af',
      atrimFilter,
      outputPath,
    ]);

    const trimmedBuffer = await fs.readFile(outputPath);
    const trimmedDurationSec = await probeDurationSec(outputPath);

    const padStartSec = config.padMs / 1000;
    const padEndSec = (config.trailingPadMs ?? config.padMs) / 1000;
    const trimmedStartSec = Math.max(0, (Number(edgeEstimate.trimmedStartSec) || 0) - padStartSec);
    const trimmedEndSec = Number.isFinite(originalDurationSec) && Number.isFinite(trimmedDurationSec)
      ? Math.max(0, originalDurationSec - trimmedDurationSec - trimmedStartSec)
      : Math.max(0, Number(edgeEstimate.trimmedEndSec) || 0) - padEndSec;

    const removedTotal = Number.isFinite(originalDurationSec) && Number.isFinite(trimmedDurationSec)
      ? originalDurationSec - trimmedDurationSec
      : 0;

    const applied = removedTotal > 0.05;

    return {
      buffer: applied ? trimmedBuffer : buffer,
      mimetype: mimeFromExtension(ext),
      size: applied ? trimmedBuffer.length : buffer.length,
      durationSec: applied ? trimmedDurationSec : originalDurationSec,
      trimMeta: {
        applied,
        originalDurationSec,
        trimmedDurationSec: applied ? trimmedDurationSec : originalDurationSec,
        trimmedStartSec: applied ? trimmedStartSec : 0,
        trimmedEndSec: applied ? trimmedEndSec : 0,
        preTrimmed: false,
      },
    };
  } catch (error) {
    console.warn('[audioSilenceTrim] Trim failed, uploading original file:', error.message);
    return {
      buffer,
      mimetype: originalMimetype,
      size: buffer.length,
      durationSec: baseTrimMeta.originalDurationSec,
      trimMeta: baseTrimMeta,
    };
  } finally {
    await cleanupTemp(tempDir);
  }
}

module.exports = {
  readTrimConfig,
  trimLeadingTrailingSilence,
  extensionFromFile,
  probeDurationFromBuffer,
};
