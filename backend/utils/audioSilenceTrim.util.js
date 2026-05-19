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

function readTrimConfig() {
  const thresholdRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_THRESHOLD_DB);
  const minSilenceRaw = Number.parseFloat(process.env.AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC);
  const padRaw = Number.parseInt(process.env.AUDIO_SILENCE_TRIM_PAD_MS, 10);

  return {
    enabled: process.env.AUDIO_SILENCE_TRIM_ENABLED !== 'false',
    thresholdDb: Number.isFinite(thresholdRaw) ? thresholdRaw : -40,
    minSilenceSec: Number.isFinite(minSilenceRaw) ? minSilenceRaw : 0.1,
    padMs: Number.isFinite(padRaw) && padRaw >= 0 ? padRaw : 80,
  };
}

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

function parseSilenceDetect(stderr, totalDurationSec) {
  const starts = [];
  const ends = [];
  const startRegex = /silence_start:\s*([\d.]+)/g;
  const endRegex = /silence_end:\s*([\d.]+)/g;

  let match = startRegex.exec(stderr);
  while (match) {
    starts.push(Number.parseFloat(match[1]));
    match = startRegex.exec(stderr);
  }

  match = endRegex.exec(stderr);
  while (match) {
    ends.push(Number.parseFloat(match[1]));
    match = endRegex.exec(stderr);
  }

  let trimmedStartSec = 0;
  if (starts.length && starts[0] <= 0.05 && ends.length) {
    trimmedStartSec = Math.max(0, ends[0]);
  }

  let trimmedEndSec = 0;
  if (starts.length) {
    const lastStart = starts[starts.length - 1];
    const lastEnd = ends.length ? ends[ends.length - 1] : null;
    const total = Number(totalDurationSec);
    if (Number.isFinite(total) && lastStart < total - 0.05) {
      if (lastEnd == null || lastEnd < lastStart + 0.01) {
        trimmedEndSec = Math.max(0, total - lastStart);
      } else if (lastEnd >= total - 0.05) {
        trimmedEndSec = Math.max(0, total - lastStart);
      }
    }
  }

  return { trimmedStartSec, trimmedEndSec };
}

async function detectEdgeSilence(filePath, config, totalDurationSec) {
  const threshold = `${config.thresholdDb}dB`;
  const minSilence = String(config.minSilenceSec);

  try {
    const { stderr } = await runProcess(ffmpegPath, [
      '-hide_banner',
      '-i',
      filePath,
      '-af',
      `silencedetect=noise=${threshold}:d=${minSilence}`,
      '-f',
      'null',
      '-',
    ]);
    return parseSilenceDetect(stderr, totalDurationSec);
  } catch (_error) {
    return { trimmedStartSec: 0, trimmedEndSec: 0 };
  }
}

function buildSilenceRemoveFilter(config) {
  const threshold = `${config.thresholdDb}dB`;
  const minSilence = String(config.minSilenceSec);
  const startFilter = `silenceremove=start_periods=1:start_duration=${minSilence}:start_threshold=${threshold}`;
  const padDelay = config.padMs > 0 ? `,adelay=${config.padMs}|${config.padMs}` : '';
  return `${startFilter},areverse,${startFilter},areverse${padDelay}`;
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
async function trimLeadingTrailingSilence(file) {
  const buffer = file?.buffer;
  const originalMimetype = file?.mimetype || 'audio/mpeg';
  const ext = extensionFromFile(file);

  const baseTrimMeta = {
    applied: false,
    originalDurationSec: null,
    trimmedDurationSec: null,
    trimmedStartSec: 0,
    trimmedEndSec: 0,
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
    const filter = buildSilenceRemoveFilter(config);

    await runProcess(ffmpegPath, [
      '-hide_banner',
      '-y',
      '-i',
      inputPath,
      '-af',
      filter,
      outputPath,
    ]);

    const trimmedBuffer = await fs.readFile(outputPath);
    const trimmedDurationSec = await probeDurationSec(outputPath);

    const trimmedStartSec = Number.isFinite(originalDurationSec) && Number.isFinite(trimmedDurationSec)
      ? Math.max(0, edgeEstimate.trimmedStartSec)
      : edgeEstimate.trimmedStartSec;

    const trimmedEndSec = Number.isFinite(originalDurationSec) && Number.isFinite(trimmedDurationSec)
      ? Math.max(0, originalDurationSec - trimmedDurationSec - trimmedStartSec)
      : edgeEstimate.trimmedEndSec;

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
};
