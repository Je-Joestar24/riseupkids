/**
 * Star Cam detect-object image upload.
 * Native release APKs often fail with fetch/FormData on Android; expo-file-system uploadAsync is reliable.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/config';
import { getAuthToken } from '@/services/tokenBridge';

import { StarCamDetectObjectError } from './starCamDetectErrors';

export const DETECT_UPLOAD_TIMEOUT_MS = 45000;

export interface StarCamDetectUploadImage {
  uri: string;
  name?: string;
  type?: string;
}

/** Ensure the capture URI exists and is readable on native builds. */
export async function resolveDetectImageUri(uri: string): Promise<string> {
  const trimmed = String(uri || '').trim();
  if (!trimmed) {
    throw new StarCamDetectObjectError('The camera did not send a photo. Please try again.', {
      code: 'STARCAM_IMAGE_REQUIRED',
    });
  }

  if (Platform.OS === 'web') return trimmed;

  let normalized = trimmed;
  if (!normalized.startsWith('file://') && !normalized.startsWith('content://')) {
    normalized = `file://${normalized}`;
  }

  try {
    const info = await FileSystem.getInfoAsync(normalized);
    if (!info.exists) {
      throw new StarCamDetectObjectError('The camera did not send a photo. Please try again.', {
        code: 'STARCAM_IMAGE_REQUIRED',
      });
    }
  } catch (err) {
    if (err instanceof StarCamDetectObjectError) throw err;
    throw new StarCamDetectObjectError('Could not read the captured photo. Please try again.', {
      code: 'STARCAM_IMAGE_REQUIRED',
    });
  }

  return normalized;
}

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new StarCamDetectObjectError(
        'The scan took too long. Please check your connection and try again.',
        { statusCode: 408, code: 'STARCAM_UPLOAD_TIMEOUT' }
      );
      reject(err);
    }, ms);

    task
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function uploadDetectImageWithFileSystem(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
  token: string | null
): Promise<FileSystem.FileSystemUploadResult> {
  return FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'image',
    mimeType,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function uploadDetectImageWithFetch(
  uploadUrl: string,
  fileUri: string,
  safeName: string,
  safeType: string,
  token: string | null
): Promise<Response> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(fileUri).then((r) => r.blob());
    formData.append('image', blob, safeName);
  } else {
    formData.append('image', {
      uri: fileUri,
      name: safeName,
      type: safeType,
    } as never);
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DETECT_UPLOAD_TIMEOUT_MS);
  try {
    return await fetch(uploadUrl, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function postDetectObjectImage(
  endpointPath: string,
  image: StarCamDetectUploadImage
): Promise<{ status: number; body: string }> {
  const safeName = image.name || `star-cam-${Date.now()}.jpg`;
  const safeType = image.type || 'image/jpeg';
  const fileUri = await resolveDetectImageUri(image.uri);
  const uploadUrl = `${API_BASE_URL}${endpointPath}`;
  const token = getAuthToken();

  if (__DEV__) {
    console.log('[StarCamDetectDebug][app] upload-request', {
      uploadUrl,
      platform: Platform.OS,
      hasToken: Boolean(token),
      transport: Platform.OS === 'web' ? 'fetch' : 'expo-file-system',
      imageName: safeName,
      imageType: safeType,
      uriPreview: fileUri.slice(0, 80),
    });
  }

  try {
    if (Platform.OS === 'web') {
      const response = await uploadDetectImageWithFetch(uploadUrl, fileUri, safeName, safeType, token);
      const body = await response.text();
      return { status: response.status, body };
    }

    const result = await withTimeout(
      uploadDetectImageWithFileSystem(uploadUrl, fileUri, safeType, token),
      DETECT_UPLOAD_TIMEOUT_MS
    );

    if (__DEV__) {
      console.log('[StarCamDetectDebug][app] upload-response', {
        status: result.status,
        bodyLength: result.body?.length ?? 0,
      });
    }

    return { status: result.status, body: result.body ?? '' };
  } catch (err) {
    if (__DEV__) {
      console.log('[StarCamDetectDebug][app] upload-error', {
        errorName: err instanceof Error ? err.name : null,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }

    if (err instanceof StarCamDetectObjectError) throw err;

    throw new StarCamDetectObjectError(
      'The scan could not reach the server. Please check your connection and try again.',
      { code: 'STARCAM_NETWORK_ERROR' }
    );
  }
}
