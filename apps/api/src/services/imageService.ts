import crypto from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { caseItems, noteItems, reviewItems } from '@manhaj/db/schema';
import { getStorage } from './storage/index.js';

/** Images are attached to exactly these two user-authored card types. */
export type ImageOwnerKind = 'case' | 'note';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Accepted types mapped to the extension we store them under.
 *
 * The extension comes from this table, never from the client-supplied filename — that's
 * what keeps a `.html` upload from being served back as markup from `/uploads`.
 */
const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/heic', '.heic'],
]);

export class ImageUploadError extends Error {
  constructor(message: string, readonly statusCode: number = 400) {
    super(message);
  }
}

type OwnerTable = typeof caseItems | typeof noteItems;

const OWNER_TABLES: Record<ImageOwnerKind, OwnerTable> = {
  case: caseItems,
  note: noteItems,
};

export class ImageService {
  /**
   * Resolve the owning row for a card, scoped to the caller.
   *
   * Ownership lives on `review_items.user_id` — neither `case_items` nor `note_items`
   * carries a `user_id` of its own, because both hang off the shared review superclass.
   * Everything that touches these tables has to go through this join.
   */
  async assertOwnership(userId: string, ownerKind: ImageOwnerKind, ownerId: string) {
    const table = OWNER_TABLES[ownerKind];

    const [owned] = await db
      .select({ reviewItemId: table.reviewItemId })
      .from(table)
      .innerJoin(reviewItems, eq(table.reviewItemId, reviewItems.id))
      .where(and(eq(table.reviewItemId, ownerId), eq(reviewItems.userId, userId)));

    if (!owned) {
      throw new ImageUploadError('Review item not found', 404);
    }

    return owned;
  }

  async uploadImage(params: {
    userId: string;
    ownerKind: ImageOwnerKind;
    ownerId: string;
    contentType: string;
    body: Buffer;
  }) {
    const { userId, ownerKind, ownerId, contentType, body } = params;

    const extension = ALLOWED_IMAGE_TYPES.get(contentType?.split(';')[0].trim().toLowerCase() ?? '');
    if (!extension) {
      throw new ImageUploadError(
        `Unsupported image type "${contentType}". Allowed: ${[...ALLOWED_IMAGE_TYPES.keys()].join(', ')}`
      );
    }

    if (!body?.byteLength) {
      throw new ImageUploadError('Empty image body');
    }

    if (body.byteLength > MAX_IMAGE_BYTES) {
      throw new ImageUploadError(
        `Image exceeds the ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB limit`
      );
    }

    // Ownership is checked before anything is written, so a rejected upload never leaves
    // an orphaned object behind in the bucket.
    await this.assertOwnership(userId, ownerKind, ownerId);

    // userId is part of the key so one account can never address another account's
    // objects by guessing an ownerId.
    const key = `${ownerKind}s/${userId}/${ownerId}/${crypto.randomUUID()}${extension}`;

    const stored = await getStorage().put({ key, body, contentType });

    const table = OWNER_TABLES[ownerKind];
    await db
      .update(table)
      .set({
        imageKey: stored.key,
        imageUrl: stored.url,
        imageUploadStatus: 'synced',
      })
      .where(eq(table.reviewItemId, ownerId));

    return stored;
  }

  /** Drop the bytes behind a card's image, then clear the columns that referenced them. */
  async deleteImage(userId: string, ownerKind: ImageOwnerKind, ownerId: string) {
    await this.assertOwnership(userId, ownerKind, ownerId);

    const table = OWNER_TABLES[ownerKind];
    const [row] = await db
      .select({ imageKey: table.imageKey })
      .from(table)
      .where(eq(table.reviewItemId, ownerId));

    if (row?.imageKey) {
      await getStorage().delete(row.imageKey);
    }

    await db
      .update(table)
      .set({ imageKey: null, imageUrl: null, imageUploadStatus: 'none' })
      .where(eq(table.reviewItemId, ownerId));
  }
}

export const imageService = new ImageService();
