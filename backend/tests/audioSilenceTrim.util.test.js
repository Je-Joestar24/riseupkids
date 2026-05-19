const { trimLeadingTrailingSilence, readTrimConfig } = require('../utils/audioSilenceTrim.util');

function createWavWithSilenceEdges({
  sampleRate = 44100,
  leadingSilenceSec = 1,
  toneSec = 0.5,
  trailingSilenceSec = 1,
  toneAmplitude = 8000,
} = {}) {
  const leadingSamples = Math.floor(leadingSilenceSec * sampleRate);
  const toneSamples = Math.floor(toneSec * sampleRate);
  const trailingSamples = Math.floor(trailingSilenceSec * sampleRate);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = (leadingSamples + toneSamples + trailingSamples) * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < leadingSamples; i += 1) {
    buffer.writeInt16LE(0, offset);
    offset += 2;
  }

  for (let i = 0; i < toneSamples; i += 1) {
    const t = i / sampleRate;
    const sample = Math.round(toneAmplitude * Math.sin(2 * Math.PI * 440 * t));
    buffer.writeInt16LE(sample, offset);
    offset += 2;
  }

  for (let i = 0; i < trailingSamples; i += 1) {
    buffer.writeInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}

describe('audioSilenceTrim.util', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUDIO_SILENCE_TRIM_ENABLED = 'true';
    process.env.AUDIO_SILENCE_TRIM_THRESHOLD_DB = '-40';
    process.env.AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC = '0.1';
    process.env.AUDIO_SILENCE_TRIM_PAD_MS = '80';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exposes trim config defaults', () => {
    const config = readTrimConfig();
    expect(config.enabled).toBe(true);
    expect(config.thresholdDb).toBe(-40);
    expect(config.minSilenceSec).toBe(0.1);
    expect(config.padMs).toBe(80);
  });

  it('trims leading and trailing silence from a wav buffer', async () => {
    const wavBuffer = createWavWithSilenceEdges();
    const originalDuration = 2.5;

    const result = await trimLeadingTrailingSilence({
      buffer: wavBuffer,
      mimetype: 'audio/wav',
      originalname: 'sample.wav',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.trimMeta.applied).toBe(true);
    expect(result.trimMeta.originalDurationSec).toBeGreaterThan(originalDuration - 0.2);
    expect(result.trimMeta.trimmedDurationSec).toBeLessThan(result.trimMeta.originalDurationSec);
    expect(result.durationSec).toBe(result.trimMeta.trimmedDurationSec);
    expect(result.trimMeta.trimmedStartSec).toBeGreaterThan(0);
  }, 30000);

  it('fail-open returns original buffer when trim is disabled', async () => {
    process.env.AUDIO_SILENCE_TRIM_ENABLED = 'false';
    const wavBuffer = createWavWithSilenceEdges();

    const result = await trimLeadingTrailingSilence({
      buffer: wavBuffer,
      mimetype: 'audio/wav',
      originalname: 'sample.wav',
    });

    expect(result.trimMeta.applied).toBe(false);
    expect(result.buffer).toBe(wavBuffer);
  }, 15000);
});
