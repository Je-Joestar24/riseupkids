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

function createWavWithInternalPause({
  sampleRate = 44100,
  firstToneSec = 0.6,
  pauseSec = 1.2,
  secondToneSec = 0.6,
  toneAmplitude = 8000,
} = {}) {
  const firstSamples = Math.floor(firstToneSec * sampleRate);
  const pauseSamples = Math.floor(pauseSec * sampleRate);
  const secondSamples = Math.floor(secondToneSec * sampleRate);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = (firstSamples + pauseSamples + secondSamples) * bytesPerSample;
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
  const writeTone = (count, phaseOffset = 0) => {
    for (let i = 0; i < count; i += 1) {
      const t = (i + phaseOffset) / sampleRate;
      const sample = Math.round(toneAmplitude * Math.sin(2 * Math.PI * 440 * t));
      buffer.writeInt16LE(sample, offset);
      offset += 2;
    }
  };
  const writeSilence = (count) => {
    for (let i = 0; i < count; i += 1) {
      buffer.writeInt16LE(0, offset);
      offset += 2;
    }
  };

  writeTone(firstSamples);
  writeSilence(pauseSamples);
  writeTone(secondSamples, firstSamples + pauseSamples);

  return buffer;
}

function createWavWithQuietEnding({
  sampleRate = 44100,
  loudToneSec = 1,
  quietToneSec = 0.35,
  trailingSilenceSec = 0.6,
  loudAmplitude = 8000,
  quietAmplitude = 500,
} = {}) {
  const loudSamples = Math.floor(loudToneSec * sampleRate);
  const quietSamples = Math.floor(quietToneSec * sampleRate);
  const trailingSamples = Math.floor(trailingSilenceSec * sampleRate);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = (loudSamples + quietSamples + trailingSamples) * bytesPerSample;
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
  const writeTone = (count, amplitude, phaseOffset = 0) => {
    for (let i = 0; i < count; i += 1) {
      const t = (i + phaseOffset) / sampleRate;
      const sample = Math.round(amplitude * Math.sin(2 * Math.PI * 440 * t));
      buffer.writeInt16LE(sample, offset);
      offset += 2;
    }
  };
  const writeSilence = (count) => {
    for (let i = 0; i < count; i += 1) {
      buffer.writeInt16LE(0, offset);
      offset += 2;
    }
  };

  writeTone(loudSamples, loudAmplitude);
  writeTone(quietSamples, quietAmplitude, loudSamples);
  writeSilence(trailingSamples);

  return buffer;
}

function createWavWithQuietLeading({
  sampleRate = 44100,
  leadingSilenceSec = 0.5,
  quietToneSec = 0.25,
  loudToneSec = 0.8,
  quietAmplitude = 500,
  loudAmplitude = 8000,
} = {}) {
  const leadingSamples = Math.floor(leadingSilenceSec * sampleRate);
  const quietSamples = Math.floor(quietToneSec * sampleRate);
  const loudSamples = Math.floor(loudToneSec * sampleRate);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = (leadingSamples + quietSamples + loudSamples) * bytesPerSample;
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
  const writeSilence = (count) => {
    for (let i = 0; i < count; i += 1) {
      buffer.writeInt16LE(0, offset);
      offset += 2;
    }
  };
  const writeTone = (count, amplitude, phaseOffset = 0) => {
    for (let i = 0; i < count; i += 1) {
      const t = (i + phaseOffset) / sampleRate;
      const sample = Math.round(amplitude * Math.sin(2 * Math.PI * 440 * t));
      buffer.writeInt16LE(sample, offset);
      offset += 2;
    }
  };

  writeSilence(leadingSamples);
  writeTone(quietSamples, quietAmplitude);
  writeTone(loudSamples, loudAmplitude, quietSamples);

  return buffer;
}

describe('audioSilenceTrim.util', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUDIO_SILENCE_TRIM_ENABLED = 'true';
    process.env.AUDIO_SILENCE_TRIM_THRESHOLD_DB = '-96';
    process.env.AUDIO_SILENCE_TRIM_TRAILING_THRESHOLD_DB = '-96';
    process.env.AUDIO_SILENCE_TRIM_MIN_SILENCE_SEC = '0.12';
    process.env.AUDIO_SILENCE_TRIM_MIN_TRAILING_SILENCE_SEC = '0.25';
    process.env.AUDIO_SILENCE_TRIM_PAD_MS = '200';
    process.env.AUDIO_SILENCE_TRIM_TRAILING_PAD_MS = '400';
    process.env.AUDIO_SILENCE_TRIM_HIGHPASS_HZ = '0';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exposes trim config defaults', () => {
    const config = readTrimConfig();
    expect(config.enabled).toBe(true);
    expect(config.thresholdDb).toBe(-96);
    expect(config.trailingThresholdDb).toBe(-96);
    expect(config.minSilenceSec).toBe(0.12);
    expect(config.minTrailingSilenceSec).toBe(0.25);
    expect(config.padMs).toBe(200);
    expect(config.trailingPadMs).toBe(400);
    expect(config.highpassHz).toBe(0);
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

  it('does not trim internal pauses when speech starts immediately', async () => {
    const wavBuffer = createWavWithInternalPause();
    const expectedDuration = 2.4;

    const result = await trimLeadingTrailingSilence({
      buffer: wavBuffer,
      mimetype: 'audio/wav',
      originalname: 'speech-pause-speech.wav',
    });

    expect(result.trimMeta.applied).toBe(false);
    expect(result.buffer).toBe(wavBuffer);
    expect(result.trimMeta.trimmedStartSec).toBe(0);
    expect(result.trimMeta.trimmedEndSec).toBe(0);
    expect(result.durationSec).toBeGreaterThan(expectedDuration - 0.2);
    expect(result.durationSec).toBeLessThan(expectedDuration + 0.2);
  }, 30000);

  it('preserves quiet ending syllables before trailing silence', async () => {
    const wavBuffer = createWavWithQuietEnding();
    const expectedDuration = 1.95;
    const loudPlusQuietSec = 1.35;

    const result = await trimLeadingTrailingSilence({
      buffer: wavBuffer,
      mimetype: 'audio/wav',
      originalname: 'quiet-ending.wav',
    });

    expect(result.trimMeta.applied).toBe(true);
    expect(result.durationSec).toBeGreaterThan(loudPlusQuietSec - 0.15);
    expect(result.durationSec).toBeLessThan(expectedDuration + 0.1);
    expect(result.trimMeta.trimmedDurationSec).toBeGreaterThan(loudPlusQuietSec - 0.15);
  }, 30000);

  it('preserves quiet leading syllables after leading silence', async () => {
    const wavBuffer = createWavWithQuietLeading();
    const quietPlusLoudSec = 1.05;

    const result = await trimLeadingTrailingSilence({
      buffer: wavBuffer,
      mimetype: 'audio/wav',
      originalname: 'quiet-leading.wav',
    });

    expect(result.trimMeta.applied).toBe(true);
    expect(result.trimMeta.trimmedStartSec).toBeGreaterThan(0.25);
    expect(result.trimMeta.trimmedStartSec).toBeLessThan(0.35);
    expect(result.durationSec).toBeGreaterThan(quietPlusLoudSec - 0.15);
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
