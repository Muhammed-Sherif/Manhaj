import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { apiClient } from '@manhaj/api-client';
import { db } from './database';
import * as schema from '../db/schema';

/**
 * Image attachment pipeline for user-authored cards.
 *
 * Bytes live on the device (`documentDirectory/images/`); SQLite holds only the local
 * path plus an upload status. Uploads go to the dedicated binary endpoint, deliberately
 * not the row-sync endpoint, because image payloads are orders of magnitude larger than
 * a row and shouldn't ride the sync batch.
 *
 * Uploads are triggered twice — opportunistically from a background task, and again on
 * foreground/network regain — because Android and iOS both defer or skip background work
 * when it suits them, and a pending image must not depend on that firing.
 */

export type ImageOwnerKind = 'case' | 'note';

const IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

/** An upload is retryable from these states; 'synced' and 'none' are terminal. */
const PENDING_STATUSES = ['pending', 'failed'];

async function ensureImagesDir() {
  const info = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'jpg';
  }
}

/**
 * Copy a picked image into app-owned storage and mark the card as awaiting upload.
 *
 * The picker hands back a URI in a cache directory that the OS may reclaim, so the file
 * is copied somewhere durable before its path is written to the database.
 */
export async function attachImage(params: {
  ownerKind: ImageOwnerKind;
  ownerId: string;
  sourceUri: string;
  mimeType?: string | null;
}): Promise<string> {
  const { ownerKind, ownerId, sourceUri } = params;
  const mimeType = params.mimeType || 'image/jpeg';

  await ensureImagesDir();

  const localPath = `${IMAGES_DIR}${ownerId}.${extensionFor(mimeType)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: localPath });

  if (ownerKind === 'case') {
    await db
      .update(schema.caseItems)
      .set({ imageLocalPath: localPath, imageUploadStatus: 'pending' })
      .where(eq(schema.caseItems.id, ownerId));
  } else {
    await db
      .update(schema.noteItems)
      .set({ imageLocalPath: localPath, imageUploadStatus: 'pending' })
      .where(eq(schema.noteItems.id, ownerId));
  }

  // Opportunistic immediate attempt; the background/foreground triggers cover failure.
  void uploadPendingImages().catch((error) => {
    console.warn('Immediate image upload failed, will retry', error);
  });

  return localPath;
}

async function uploadOne(params: {
  ownerKind: ImageOwnerKind;
  ownerId: string;
  localPath: string;
}) {
  const { ownerKind, ownerId, localPath } = params;

  const info = await FileSystem.getInfoAsync(localPath);
  if (!info.exists) {
    // The file is gone — a reinstall or OS cleanup. Nothing to upload; the card keeps its
    // status so a later foreground pass can re-evaluate.
    throw new Error(`Local image missing: ${localPath}`);
  }

  const extension = localPath.split('.').pop()?.toLowerCase();
  const mimeType =
    extension === 'png' ? 'image/png'
    : extension === 'webp' ? 'image/webp'
    : extension === 'heic' ? 'image/heic'
    : 'image/jpeg';

  const baseUrl = apiClient.defaults.baseURL || '';
  const token = await SecureStore.getItemAsync('accessToken');

  // Uploaded straight from the file URI rather than through axios: this streams the bytes
  // off disk instead of materialising the whole image in JS memory.
  const result = await FileSystem.uploadAsync(
    `${baseUrl}/student/images/${ownerKind}/${ownerId}`,
    localPath,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': mimeType,
        ...(token ? { 'x-auth-token': token, Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Image upload failed (${result.status}): ${result.body}`);
  }

  const stored = JSON.parse(result.body) as { key: string; url: string };

  if (ownerKind === 'case') {
    await db
      .update(schema.caseItems)
      .set({ imageUrl: stored.url, imageUploadStatus: 'synced' })
      .where(eq(schema.caseItems.id, ownerId));
  } else {
    await db
      .update(schema.noteItems)
      .set({ imageUrl: stored.url, imageUploadStatus: 'synced' })
      .where(eq(schema.noteItems.id, ownerId));
  }
}

/** Push every card whose image hasn't reached the server yet. Safe to call repeatedly. */
export async function uploadPendingImages(): Promise<void> {
  const pendingCases = await db
    .select()
    .from(schema.caseItems)
    .where(
      and(
        isNotNull(schema.caseItems.imageLocalPath),
        inArray(schema.caseItems.imageUploadStatus, PENDING_STATUSES)
      )
    );

  const pendingNotes = await db
    .select()
    .from(schema.noteItems)
    .where(
      and(
        isNotNull(schema.noteItems.imageLocalPath),
        inArray(schema.noteItems.imageUploadStatus, PENDING_STATUSES)
      )
    );

  for (const row of pendingCases) {
    try {
      await uploadOne({ ownerKind: 'case', ownerId: row.id, localPath: row.imageLocalPath! });
    } catch (error) {
      console.warn(`Image upload failed for case ${row.id}`, error);
      await db
        .update(schema.caseItems)
        .set({ imageUploadStatus: 'failed' })
        .where(eq(schema.caseItems.id, row.id));
    }
  }

  for (const row of pendingNotes) {
    try {
      await uploadOne({ ownerKind: 'note', ownerId: row.id, localPath: row.imageLocalPath! });
    } catch (error) {
      console.warn(`Image upload failed for note ${row.id}`, error);
      await db
        .update(schema.noteItems)
        .set({ imageUploadStatus: 'failed' })
        .where(eq(schema.noteItems.id, row.id));
    }
  }
}

/**
 * Storage providers hand back a root-relative URL (`/uploads/images/...`) — that is
 * correct on the server and meaningless on a device, where a bare path resolves to
 * nothing. Anything already absolute (a CDN host, once Neon storage is switched on) is
 * passed through untouched.
 */
function toAbsoluteUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url;

  const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Pick the URI to render for a card's image.
 *
 * Local first, remote as fallback: the device that attached the image has the file, and
 * any other device (or the same one after a reinstall) fetches it from the server. Same
 * shape as the lecture-video download service.
 */
export async function resolveImageUri(
  localPath: string | null,
  remoteUrl: string | null
): Promise<string | null> {
  if (localPath) {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) return localPath;
  }

  return remoteUrl ? toAbsoluteUrl(remoteUrl) : null;
}
