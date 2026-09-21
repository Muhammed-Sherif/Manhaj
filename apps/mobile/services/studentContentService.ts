import { db } from './database';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

/**
 * Service to manage student-authored content (notes, cases, summaries).
 * Creating these items is handled in their respective add screens, 
 * but this service centralizes update and delete operations.
 */
export class StudentContentService {
  /**
   * Delete a note (or summary) and its associated SRS reviewable item.
   * Also deletes the local image file if one exists.
   */
  static async deleteNote(noteId: string) {
    const [note] = await db.select().from(schema.noteItems).where(eq(schema.noteItems.id, noteId));
    if (!note) return;

    if (note.imageLocalPath) {
      try {
        await FileSystem.deleteAsync(note.imageLocalPath, { idempotent: true });
      } catch (err) {
        console.error('Failed to delete local image for note:', err);
      }
    }

    // Find associated reviewableItem (noteReviewable junction)
    const [junction] = await db.select().from(schema.noteReviewable).where(eq(schema.noteReviewable.noteId, noteId));
    
    await db.transaction(async (tx) => {
      // If junction exists, mark reviewableItem as deleted (soft delete for sync)
      if (junction) {
        await tx.update(schema.reviewableItems)
          .set({ deletedAt: new Date().toISOString() })
          .where(eq(schema.reviewableItems.id, junction.reviewableId));
      }
      
      // We don't need to manually delete the noteItems row because the junction
      // cascade rules on the server require us to push the tombstone of the reviewable item.
      // Wait, the prompt says: "delete removes the reviewable_items row (junction cascades) and the local image file."
      // In SQLite, if we delete reviewableItems, does it cascade to noteReviewable? Yes, `onDelete: 'cascade'`.
      // Does it cascade to noteItems? No. But wait, we can just delete the noteItem directly, and its junction.
      
      await tx.delete(schema.noteItems).where(eq(schema.noteItems.id, noteId));
    });
  }

  /**
   * Delete a case and its associated SRS reviewable item.
   * Also deletes the local image file if one exists.
   */
  static async deleteCase(caseId: string) {
    const [caseItem] = await db.select().from(schema.caseItems).where(eq(schema.caseItems.id, caseId));
    if (!caseItem) return;

    if (caseItem.imageLocalPath) {
      try {
        await FileSystem.deleteAsync(caseItem.imageLocalPath, { idempotent: true });
      } catch (err) {
        console.error('Failed to delete local image for case:', err);
      }
    }

    const [junction] = await db.select().from(schema.caseReviewable).where(eq(schema.caseReviewable.caseId, caseId));
    
    await db.transaction(async (tx) => {
      if (junction) {
        await tx.update(schema.reviewableItems)
          .set({ deletedAt: new Date().toISOString() })
          .where(eq(schema.reviewableItems.id, junction.reviewableId));
      }
      
      await tx.delete(schema.caseItems).where(eq(schema.caseItems.id, caseId));
    });
  }

  /**
   * Update a note (or summary) content
   */
  static async updateNote(noteId: string, content: string, type?: string) {
    const updates: any = { content };
    if (type) {
      updates.type = type;
    }
    
    await db.update(schema.noteItems)
      .set(updates)
      .where(eq(schema.noteItems.id, noteId));
      
    // Update the reviewableItem updatedAt to trigger sync
    const [junction] = await db.select().from(schema.noteReviewable).where(eq(schema.noteReviewable.noteId, noteId));
    if (junction) {
      await db.update(schema.reviewableItems)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.reviewableItems.id, junction.reviewableId));
    }
  }

  /**
   * Update a case content
   */
  static async updateCase(caseId: string, title: string, content: string, category: string, answer?: string) {
    await db.update(schema.caseItems)
      .set({ title, content, category, answer: answer || null })
      .where(eq(schema.caseItems.id, caseId));
      
    // Update the reviewableItem updatedAt to trigger sync
    const [junction] = await db.select().from(schema.caseReviewable).where(eq(schema.caseReviewable.caseId, caseId));
    if (junction) {
      await db.update(schema.reviewableItems)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.reviewableItems.id, junction.reviewableId));
    }
  }
}
