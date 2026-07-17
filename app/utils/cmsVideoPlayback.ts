/** expo-av / MediaCodec failures that retrying the same asset over HTTPS will not fix. */
export function isHardwareDecoderPlaybackFailure(error: string | null | undefined): boolean {
  if (!error) return false;
  return /decoder init failed|decoding failed|MediaCodec|OMX\.|c2\.(?:qti|google|mtk|sec)\./i.test(
    error
  );
}
