import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { db } from './database';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { useAuthStore } from '../store/authStore';

const LOCAL_FILES_DIR = FileSystem.documentDirectory + 'lecture-files/';

/**
 * Ensure the lecture-files directory exists.
 */
async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LOCAL_FILES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_FILES_DIR, { intermediates: true });
  }
}

/**
 * Allow the user to pick a file, copy it into the sandbox, and record it in SQLite.
 * Returns the inserted row or null if the user cancelled.
 */
export async function attachLocalFile(lectureId: string): Promise<(typeof schema.lectureLocalFiles.$inferSelect) | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  await ensureDir();

  const ext = asset.name.includes('.') ? asset.name.split('.').pop() : '';
  const localFileName = `${Crypto.randomUUID()}${ext ? '.' + ext : ''}`;
  const destPath = LOCAL_FILES_DIR + localFileName;

  await FileSystem.copyAsync({ from: asset.uri, to: destPath });

  const row: typeof schema.lectureLocalFiles.$inferInsert = {
    id: Crypto.randomUUID(),
    lectureId,
    userId: useAuthStore.getState().user?.id ?? '',
    localFilePath: destPath,
    fileName: asset.name,
    fileSize: asset.size ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.lectureLocalFiles).values(row);
  return { ...row } as any;
}

/**
 * Open a locally stored file using the native sharing / viewer sheet.
 */
export async function openLocalFile(localFilePath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(localFilePath);
  if (!info.exists) {
    throw new Error('File no longer exists at: ' + localFilePath);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(localFilePath);
}

/**
 * Delete a local file record and its bytes from storage.
 */
export async function deleteLocalFile(fileId: string): Promise<void> {
  const [row] = await db.select().from(schema.lectureLocalFiles).where(eq(schema.lectureLocalFiles.id, fileId));
  if (!row) return;

  try {
    await FileSystem.deleteAsync(row.localFilePath, { idempotent: true });
  } catch (err) {
    console.error('Failed to delete file bytes:', err);
  }

  await db.delete(schema.lectureLocalFiles).where(eq(schema.lectureLocalFiles.id, fileId));
}

/**
 * Get all local files for a lecture.
 */
export async function getLocalFiles(lectureId: string) {
  return db.select().from(schema.lectureLocalFiles).where(eq(schema.lectureLocalFiles.lectureId, lectureId));
}
