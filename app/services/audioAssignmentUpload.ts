/**
 * Audio assignment recording upload.
 * Native builds often fail with axios/fetch FormData for file uploads;
 * expo-file-system uploadAsync is reliable (same pattern as kidsWallUpload).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/config';
import { getAuthToken } from '@/services/tokenBridge';

import { api } from './api';
import type { ApiResponse, AudioAssignmentProgress } from './audioAssignmentService';

export interface SubmitAudioRecordingInput {
  recordUri: string;
  timeSpent: number;
  metadata?: Record<string, unknown>;
}

const UPLOAD_TIMEOUT_MS = 120_000;

function recordingMimeAndExt(): { mime: string; ext: string } {
  if (Platform.OS === 'ios') {
    return { mime: 'audio/x-caf', ext: 'caf' };
  }
  return { mime: 'audio/mp4', ext: 'm4a' };
}

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Upload took too long. Please check your connection and try again.'));
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

function parseApiError(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

/** Ensure the recorded file URI exists and is readable on native builds. */
export async function resolveRecordingUri(uri: string): Promise<string> {
  const trimmed = String(uri || '').trim();
  if (!trimmed) {
    throw new Error('No recording found. Please record again before submitting.');
  }

  if (Platform.OS === 'web') return trimmed;

  let normalized = trimmed;
  if (!normalized.startsWith('file://') && !normalized.startsWith('content://')) {
    normalized = `file://${normalized}`;
  }

  if (normalized.startsWith('content://')) {
    const { ext } = recordingMimeAndExt();
    const dest = `${FileSystem.cacheDirectory}audio-assignment-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: normalized, to: dest });
    return dest;
  }

  const info = await FileSystem.getInfoAsync(normalized);
  if (!info.exists) {
    throw new Error('Could not read your recording. Please record again.');
  }

  return normalized;
}

async function uploadWithFileSystem(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
  timeSpent: number,
  metadata: Record<string, unknown>,
  token: string | null
): Promise<ApiResponse<AudioAssignmentProgress>> {
  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'recordedAudio',
    mimeType,
    parameters: {
      timeSpent: String(timeSpent),
      metadata: JSON.stringify(metadata),
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      parseApiError(result.body ?? '', 'Failed to submit recording. Please try again.')
    );
  }

  const parsed = JSON.parse(result.body) as ApiResponse<AudioAssignmentProgress>;
  if (!parsed?.success) {
    throw new Error(parsed?.message || 'Failed to submit recording. Please try again.');
  }

  return parsed;
}

async function uploadWithFormData(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
  fileName: string,
  timeSpent: number,
  metadata: Record<string, unknown>,
  token: string | null
): Promise<ApiResponse<AudioAssignmentProgress>> {
  const formData = new FormData();
  const blob = await fetch(fileUri).then((r) => r.blob());
  formData.append('recordedAudio', blob, fileName);
  formData.append('timeSpent', String(timeSpent));
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(parseApiError(body, 'Failed to submit recording. Please try again.'));
  }

  const parsed = JSON.parse(body) as ApiResponse<AudioAssignmentProgress>;
  if (!parsed?.success) {
    throw new Error(parsed?.message || 'Failed to submit recording. Please try again.');
  }

  return parsed;
}

export async function submitAudioAssignmentRecording(
  audioAssignmentId: string,
  childId: string,
  input: SubmitAudioRecordingInput
): Promise<ApiResponse<AudioAssignmentProgress>> {
  const { mime, ext } = recordingMimeAndExt();
  const fileUri = await resolveRecordingUri(input.recordUri);
  const fileName = `audio-assignment-${audioAssignmentId}-${childId}-${Date.now()}.${ext}`;
  const metadata = input.metadata ?? {};
  const uploadPath = `/audio-assignments/${encodeURIComponent(audioAssignmentId)}/child/${encodeURIComponent(childId)}/submit`;
  const token = getAuthToken();

  if (Platform.OS === 'web') {
    const uploadUrl = `${API_BASE_URL}${uploadPath}`;
    return withTimeout(
      uploadWithFormData(
        uploadUrl,
        fileUri,
        mime,
        fileName,
        input.timeSpent,
        metadata,
        token
      ),
      UPLOAD_TIMEOUT_MS
    );
  }

  const uploadUrl = `${API_BASE_URL}${uploadPath}`;
  return withTimeout(
    uploadWithFileSystem(uploadUrl, fileUri, mime, input.timeSpent, metadata, token),
    UPLOAD_TIMEOUT_MS
  );
}

/** Legacy axios FormData path — prefer submitAudioAssignmentRecording on native. */
export async function submitAudioAssignmentFormData(
  audioAssignmentId: string,
  childId: string,
  formData: FormData
): Promise<ApiResponse<AudioAssignmentProgress>> {
  const res = await api.post<ApiResponse<AudioAssignmentProgress>>(
    `/audio-assignments/${audioAssignmentId}/child/${childId}/submit`,
    formData
  );
  return res as ApiResponse<AudioAssignmentProgress>;
}
