/**
 * Kids Wall image upload.
 * Native release APKs often fail with axios/fetch FormData on Android; expo-file-system uploadAsync is reliable.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/config';
import { getAuthToken } from '@/services/tokenBridge';

import { api } from './api';
import type { CreatePostInput, KidsWallApiResponse, KidsWallPost } from './kidswallService';

export interface KidsWallUploadImage {
  uri: string;
  name?: string;
  type?: string;
}

const UPLOAD_TIMEOUT_MS = 60_000;

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

/** Ensure the picked image URI exists and is readable on native builds. */
export async function resolveKidsWallImageUri(uri: string): Promise<string> {
  const trimmed = String(uri || '').trim();
  if (!trimmed) {
    throw new Error('Please add a photo before sharing.');
  }

  if (Platform.OS === 'web') return trimmed;

  let normalized = trimmed;
  if (!normalized.startsWith('file://') && !normalized.startsWith('content://')) {
    normalized = `file://${normalized}`;
  }

  if (normalized.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}kids-wall-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: normalized, to: dest });
    return dest;
  }

  const info = await FileSystem.getInfoAsync(normalized);
  if (!info.exists) {
    throw new Error('Could not read the selected photo. Please try again.');
  }

  return normalized;
}

function parseApiError(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
}

async function uploadWithFileSystem(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
  postData: CreatePostInput,
  token: string | null
): Promise<KidsWallApiResponse<KidsWallPost>> {
  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'image',
    mimeType,
    parameters: {
      title: postData.title.trim(),
      content: postData.content.trim(),
    },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(parseApiError(result.body ?? '', 'Failed to share your work. Please try again.'));
  }

  const parsed = JSON.parse(result.body) as KidsWallApiResponse<KidsWallPost>;
  if (!parsed?.success) {
    throw new Error(parsed?.message || 'Failed to share your work. Please try again.');
  }

  return parsed;
}

async function uploadWithFormData(
  childId: string,
  postData: CreatePostInput,
  imageFile: KidsWallUploadImage
): Promise<KidsWallApiResponse<KidsWallPost>> {
  const formData = new FormData();
  formData.append('title', postData.title.trim());
  formData.append('content', postData.content.trim());

  if (Platform.OS === 'web') {
    const blob = await fetch(imageFile.uri).then((r) => r.blob());
    formData.append('image', blob, imageFile.name ?? 'image.jpg');
  } else {
    formData.append('image', {
      uri: imageFile.uri,
      name: imageFile.name ?? 'image.jpg',
      type: imageFile.type ?? 'image/jpeg',
    } as never);
  }

  const res = await api.post<KidsWallApiResponse<KidsWallPost>>(
    `/kids-wall/child/${encodeURIComponent(childId)}`,
    formData
  );

  if (!res?.success) {
    throw new Error(res?.message || 'Failed to share your work. Please try again.');
  }

  return res;
}

export async function createKidsWallPostWithImage(
  childId: string,
  postData: CreatePostInput,
  imageFile: KidsWallUploadImage
): Promise<KidsWallApiResponse<KidsWallPost>> {
  const safeType = imageFile.type || 'image/jpeg';
  const fileUri = await resolveKidsWallImageUri(imageFile.uri);

  if (Platform.OS === 'web') {
    return uploadWithFormData(childId, postData, { ...imageFile, uri: fileUri });
  }

  const uploadUrl = `${API_BASE_URL}/kids-wall/child/${encodeURIComponent(childId)}`;
  const token = getAuthToken();

  return withTimeout(
    uploadWithFileSystem(uploadUrl, fileUri, safeType, postData, token),
    UPLOAD_TIMEOUT_MS
  );
}
