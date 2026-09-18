/**
 * Storage abstraction for user-uploaded binary assets.
 *
 * The concrete provider is deliberately kept behind this interface. Neon's Object Storage
 * is in beta and free-of-charge today, with no announced GA pricing — when that changes,
 * swapping providers should mean adding one file here and changing one env var, not
 * touching upload routes, mobile code, or the schema.
 *
 * Only the key (not the URL) is authoritative. URLs are derived on read, because a
 * provider migration invalidates every URL stored in the database but leaves the bytes
 * addressable by key.
 */

export interface PutObjectInput {
  /** Provider-relative path, e.g. `cases/<caseItemId>/<uuid>.jpg`. No leading slash. */
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  key: string;
  /** URL the mobile client can GET. Derived from the key, never the source of truth. */
  url: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  /** Provider id, surfaced in logs and the health endpoint so misconfiguration is visible. */
  readonly name: string;

  put(input: PutObjectInput): Promise<StoredObject>;

  /** Best-effort removal. Implementations should not throw when the key is already gone. */
  delete(key: string): Promise<void>;

  /** Resolve a stored key back to a fetchable URL. */
  urlFor(key: string): string;
}
