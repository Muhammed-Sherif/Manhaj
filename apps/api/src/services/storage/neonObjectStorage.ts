import type { PutObjectInput, StorageProvider, StoredObject } from './types.js';

export interface NeonStorageConfig {
  /** Root endpoint of the bucket, e.g. `https://<bucket>.<region>.storage.neon.tech`. */
  endpoint: string;
  bucket: string;
  token: string;
  /** Public/CDN base for reads. Falls back to the endpoint when the bucket is public. */
  publicBaseUrl?: string;
}

/**
 * Neon Object Storage adapter.
 *
 * ⚠️  Neon's object storage is in beta and its REST surface has NOT been verified against
 * the live service from this environment. `send()` below is the ONE place that encodes a
 * wire format, and it is deliberately left unexercised.
 *
 * Before enabling this provider (`STORAGE_PROVIDER=neon`), confirm the request shape in
 * Neon's beta docs and adjust `send()` alone. Until then the default `local` provider is
 * what runs, and misconfiguring this one fails loudly rather than silently half-working.
 */
export class NeonObjectStorage implements StorageProvider {
  readonly name = 'neon';

  constructor(private readonly config: NeonStorageConfig) {
    if (!config.endpoint || !config.bucket || !config.token) {
      throw new Error(
        'Neon Object Storage requires NEON_STORAGE_ENDPOINT, NEON_STORAGE_BUCKET and NEON_STORAGE_TOKEN'
      );
    }
  }

  /** The only provider-specific call. Everything else here is provider-agnostic. */
  private async send(method: 'PUT' | 'DELETE', key: string, body?: Buffer, contentType?: string) {
    const url = `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${key}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        ...(contentType ? { 'Content-Type': contentType } : {}),
      },
      body: body ? new Uint8Array(body) : undefined,
    });

    if (!response.ok && response.status !== 404) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Neon Object Storage ${method} ${key} failed (${response.status}): ${detail}`);
    }
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<StoredObject> {
    await this.send('PUT', key, body, contentType);

    return {
      key,
      url: this.urlFor(key),
      size: body.byteLength,
      contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.send('DELETE', key);
  }

  urlFor(key: string): string {
    const base = (this.config.publicBaseUrl || `${this.config.endpoint}/${this.config.bucket}`)
      .replace(/\/+$/, '');
    return `${base}/${key.replace(/^\/+/, '')}`;
  }
}
