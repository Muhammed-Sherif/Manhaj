import { LocalDiskStorage } from './localDiskStorage.js';
import { NeonObjectStorage } from './neonObjectStorage.js';
import type { StorageProvider } from './types.js';

export type { StorageProvider, PutObjectInput, StoredObject } from './types.js';
export { LocalDiskStorage } from './localDiskStorage.js';
export { NeonObjectStorage } from './neonObjectStorage.js';

let instance: StorageProvider | null = null;

/**
 * Resolve the configured storage provider.
 *
 * Selection is by `STORAGE_PROVIDER` (default `local`). Adding a provider means adding a
 * case here plus one adapter file — no call site changes, because everything downstream
 * depends only on the `StorageProvider` interface.
 */
export function createStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  switch (provider) {
    case 'local':
      return new LocalDiskStorage();
    case 'neon':
      return new NeonObjectStorage({
        endpoint: process.env.AWS_ENDPOINT_URL_S3 || '',
        bucket: process.env.AWS_S3_BUCKET || 'manhaj',
        region: process.env.AWS_REGION || 'eu-central-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      });
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${provider}". Supported: local, neon.`
      );
  }
}

/** Lazily-built singleton, so importing this module never requires credentials. */
export function getStorage(): StorageProvider {
  if (!instance) {
    instance = createStorageProvider();
  }
  return instance;
}
