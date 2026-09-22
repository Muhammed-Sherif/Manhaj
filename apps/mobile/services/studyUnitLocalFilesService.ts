import * as DocumentPicker from 'expo-document-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { db } from './database';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { useAuthStore } from '../store/authStore';

const LOCAL_FILES_DIR = new Directory(Paths.document, 'studyUnit-files');

/**
 * Ensure the studyUnit-files directory exists.
 */
function ensureDir() {
  if (!LOCAL_FILES_DIR.exists) {
    LOCAL_FILES_DIR.create({ intermediates: true });
  }
}

/**
 * Allow the user to pick a file, copy it into the sandbox, and record it in SQLite.
 * Returns the inserted row or null if the user cancelled.
 */
export async function attachLocalFile(studyUnitId: string): Promise<(typeof schema.studyUnitLocalFiles.$inferSelect) | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  ensureDir();

  const ext = asset.name.includes('.') ? asset.name.split('.').pop() : '';
  const localFileName = `${Crypto.randomUUID()}${ext ? '.' + ext : ''}`;
  const destFile = new File(LOCAL_FILES_DIR, localFileName);

  new File(asset.uri).copy(destFile);

  const row: typeof schema.studyUnitLocalFiles.$inferInsert = {
    id: Crypto.randomUUID(),
    studyUnitId,
    userId: useAuthStore.getState().user?.id ?? '',
    localFilePath: destFile.uri,
    fileName: asset.name,
    fileSize: asset.size ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.studyUnitLocalFiles).values(row);
  return { ...row } as any;
}

/**
 * Open a locally stored file using the native sharing / viewer sheet.
 */
export async function openLocalFile(localFilePath: string): Promise<void> {
  const file = new File(localFilePath);
  if (!file.exists) {
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
  const [row] = await db.select().from(schema.studyUnitLocalFiles).where(eq(schema.studyUnitLocalFiles.id, fileId));
  if (!row) return;

  try {
    const file = new File(row.localFilePath);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.error('Failed to delete file bytes:', err);
  }

  await db.delete(schema.studyUnitLocalFiles).where(eq(schema.studyUnitLocalFiles.id, fileId));
}

/**
 * Get all local files for a studyUnit.
 */
export async function getLocalFiles(studyUnitId: string) {
  return db.select().from(schema.studyUnitLocalFiles).where(eq(schema.studyUnitLocalFiles.studyUnitId, studyUnitId));
}
