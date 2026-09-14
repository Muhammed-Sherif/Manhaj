import * as FileSystem from 'expo-file-system/legacy';
import { eq } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://manhaj-api-five.vercel.app';

const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

// Keep track of active downloads for cancellation/pause support
const activeDownloads = new Map<string, FileSystem.DownloadResumable>();

export function resolveVideoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }
  // If relative path like /uploads/videos/xyz.mp4
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

async function ensureVideosDirectoryExists() {
  const dirInfo = await FileSystem.getInfoAsync(VIDEOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
  }
}

export async function verifyLocalVideoExists(localFilePath?: string | null): Promise<boolean> {
  if (!localFilePath) return false;
  try {
    const info = await FileSystem.getInfoAsync(localFilePath);
    return info.exists && (info.size ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function downloadLectureVideo(
  videoId: string,
  remoteUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  await ensureVideosDirectoryExists();

  const fullUrl = resolveVideoUrl(remoteUrl);
  // Extract extension or default to .mp4
  const extMatch = remoteUrl.match(/\.([a-zA-Z0-9]+)(\?|$)/);
  const ext = extMatch ? `.${extMatch[1]}` : '.mp4';
  const localFilePath = `${VIDEOS_DIR}${videoId}${ext}`;

  // If already active, cancel previous one
  if (activeDownloads.has(videoId)) {
    try {
      await activeDownloads.get(videoId)?.cancelAsync();
    } catch {}
    activeDownloads.delete(videoId);
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    fullUrl,
    localFilePath,
    {},
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress =
          downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress?.(Math.min(Math.round(progress * 100), 99));
      }
    }
  );

  activeDownloads.set(videoId, downloadResumable);

  try {
    const result = await downloadResumable.downloadAsync();
    activeDownloads.delete(videoId);

    if (!result || !result.uri) {
      throw new Error('Download failed: No local URI returned');
    }

    // Verify downloaded file on disk
    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists || (info.size ?? 0) === 0) {
      throw new Error('Downloaded video file is missing or empty');
    }

    // Update SQLite record with localFilePath
    await db
      .update(schema.lectureVideos)
      .set({ localFilePath: result.uri })
      .where(eq(schema.lectureVideos.id, videoId));

    onProgress?.(100);
    return result.uri;
  } catch (error) {
    activeDownloads.delete(videoId);
    // Cleanup any partial file
    await FileSystem.deleteAsync(localFilePath, { idempotent: true }).catch(() => {});
    throw error;
  }
}

export async function cancelVideoDownload(videoId: string) {
  const download = activeDownloads.get(videoId);
  if (download) {
    try {
      await download.cancelAsync();
    } catch {}
    activeDownloads.delete(videoId);
  }
}

export function isVideoDownloading(videoId: string): boolean {
  return activeDownloads.has(videoId);
}

export async function deleteDownloadedVideo(videoId: string, localFilePath?: string | null) {
  await cancelVideoDownload(videoId);

  if (localFilePath) {
    try {
      await FileSystem.deleteAsync(localFilePath, { idempotent: true });
    } catch {}
  }

  // Clear localFilePath in SQLite
  await db
    .update(schema.lectureVideos)
    .set({ localFilePath: null })
    .where(eq(schema.lectureVideos.id, videoId));
}
