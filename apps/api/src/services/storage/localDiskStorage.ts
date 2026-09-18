import fs from 'fs';
import path from 'path';
import type { PutObjectInput, StorageProvider, StoredObject } from './types.js';

/**
 * Local-disk provider. This is the default and the only provider that works with zero
 * configuration, which keeps `pnpm dev` and the test suite runnable without credentials.
 *
 * It mirrors the layout the video uploader already uses (`uploads/` served statically,
 * URLs stored as root-relative paths), so it slots into the existing static-file mount.
 */
export class LocalDiskStorage implements StorageProvider {
  readonly name = 'local';

  private readonly rootDir: string;
  private readonly publicPrefix: string;

  constructor(options?: { rootDir?: string; publicPrefix?: string }) {
    this.rootDir = options?.rootDir ?? path.join(process.cwd(), 'uploads', 'images');
    this.publicPrefix = options?.publicPrefix ?? '/uploads/images';

    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Keys are caller-supplied, so they get the same traversal treatment the video service
   * applies to upload IDs before anything touches disk.
   */
  private resolvePath(key: string): string {
    const safeKey = path
      .normalize(key)
      .replace(/^([/\\]|\.\.([/\\]|$))+/, '')
      .replace(/[/\\]+/g, path.sep);

    const fullPath = path.join(this.rootDir, safeKey);
    const root = path.resolve(this.rootDir);

    if (!path.resolve(fullPath).startsWith(root + path.sep)) {
      throw new Error(`Refusing to write outside the storage root: ${key}`);
    }

    return fullPath;
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<StoredObject> {
    const filePath = this.resolvePath(key);

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, body);

    return {
      key,
      url: this.urlFor(key),
      size: body.byteLength,
      contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await fs.promises.unlink(this.resolvePath(key)).catch(() => {
      // Already gone — delete is best-effort by contract.
    });
  }

  urlFor(key: string): string {
    const safeKey = key.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${this.publicPrefix}/${safeKey}`;
  }
}
