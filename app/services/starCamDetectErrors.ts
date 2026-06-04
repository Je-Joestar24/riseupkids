export type StarCamDetectErrorCode =
  | 'STARCAM_UPLOAD_TIMEOUT'
  | 'STARCAM_NETWORK_ERROR'
  | 'STARCAM_IMAGE_REQUIRED'
  | 'STARCAM_VISION_TIMEOUT'
  | 'STARCAM_VISION_UNAVAILABLE'
  | 'STARCAM_INVALID_STEP'
  | 'STARCAM_DETECT_FAILED';

export class StarCamDetectObjectError extends Error {
  statusCode?: number;
  code: StarCamDetectErrorCode;
  details?: unknown;

  constructor(
    message: string,
    options: { statusCode?: number; code?: StarCamDetectErrorCode; details?: unknown } = {}
  ) {
    super(message);
    this.name = 'StarCamDetectObjectError';
    this.statusCode = options.statusCode;
    this.code = options.code ?? 'STARCAM_DETECT_FAILED';
    this.details = options.details;
  }
}

export function mapDetectErrorCode(status: number, message?: string): StarCamDetectErrorCode {
  const safeMessage = String(message || '').toLowerCase();
  if (status === 400 && safeMessage.includes('image file is required')) return 'STARCAM_IMAGE_REQUIRED';
  if (status === 400 && safeMessage.includes('invalid hunt step')) return 'STARCAM_INVALID_STEP';
  if (status === 503 || status === 504) {
    if (safeMessage.includes('timed out') || safeMessage.includes('timeout')) return 'STARCAM_VISION_TIMEOUT';
    if (safeMessage.includes('not available') || safeMessage.includes('not enabled')) return 'STARCAM_VISION_UNAVAILABLE';
  }
  return 'STARCAM_DETECT_FAILED';
}
