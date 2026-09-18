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
        endpoint: process.env.NEON_STORAGE_ENDPOINT || '',
        bucket: process.env.NEON_STORAGE_BUCKET || '',
        token: process.env.NEON_STORAGE_TOKEN || '',
        publicBaseUrl: process.env.NEON_STORAGE_PUBLIC_BASE_URL,
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
