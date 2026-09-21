import { db } from '../config/database.js';
import {
  reviewItems, caseItems, noteItems, tasks,
  questionReviewItems
} from '@manhaj/db/schema';
import { eq, and, isNull, gt, or } from 'drizzle-orm';

export class StudentSyncService {
  /**
   * Sync student-owned items (bidirectional with tombstones)
   * @param userId - The student's user ID
   * @param since - Optional cursor for delta sync
   * @param clientChanges - Changes pushed from client (create/update/delete)
   */
  async syncStudentItems(
    userId: string,
    since?: string,
    clientChanges?: StudentSyncChanges
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    const nextCursor = new Date().toISOString();

    // 1. Process client changes if provided (push from client)
    if (clientChanges) {
      await this.processClientChanges(userId, clientChanges);
    }

    // 2. Pull server changes (delta sync from server)
    const serverChanges = await this.getServerChanges(userId, sinceDate);

    return {
      serverChanges,
      nextCursor,
    };
  }

  /**
   * Process changes pushed from the client
   */
  private async processClientChanges(userId: string, changes: StudentSyncChanges) {
    // Process review items (superclass + subclasses)
    if (changes.reviewItems) {
      await this.processReviewItems(userId, changes.reviewItems);
    }

    // Process tasks
    if (changes.tasks) {
      await this.processTasks(userId, changes.tasks);
    }
  }

  /**
   * Process review items and their subclasses
   */
  private async processReviewItems(userId: string, items: ReviewItemChange[]) {
    for (const item of items) {
      if (item.deletedAt) {
        // Client deleted this item - soft delete on server
        await this.softDeleteReviewItem(item.id, userId);
      } else if (item.reviewItem) {
        // Client created or updated this item
        await this.upsertReviewItem(userId, item);
      }
    }
  }

  /**
   * Process tasks
   */
  private async processTasks(userId: string, tasks: TaskChange[]) {
    for (const task of tasks) {
      if (task.deletedAt) {
        // Client deleted this task - soft delete on server
        await this.softDeleteTask(task.id, userId);
      } else {
        // Client created or updated this task
        await this.upsertTask(userId, task);
      }
    }
  }

  /**
   * Upsert a review item with its subclass data
   */
  private async upsertReviewItem(userId: string, item: ReviewItemChange) {
    const { reviewItem, questionReviewItem, caseItem, noteItem } = item;

    if (!reviewItem || !reviewItem.id || !reviewItem.itemType) {
      console.warn('Invalid review item data', item);
      return;
    }

    await db.transaction(async (tx) => {
      // Upsert the review item (superclass)
      const [existingReviewItem] = await tx
        .select()
        .from(reviewItems)
        .where(and(
          eq(reviewItems.id, reviewItem.id!),
          eq(reviewItems.userId, userId)
        ));

      if (existingReviewItem) {
        // Update existing item (LWW: use the more recent updatedAt)
        const newUpdatedAt = reviewItem.updatedAt ? new Date(reviewItem.updatedAt) : new Date();
        const existingUpdatedAt = existingReviewItem.updatedAt ? new Date(existingReviewItem.updatedAt) : new Date();
        
        if (newUpdatedAt > existingUpdatedAt) {
          await tx
            .update(reviewItems)
            .set({
              itemType: reviewItem.itemType!,
              state: reviewItem.state || 'new',
              currentStepIndex: reviewItem.currentStepIndex,
              interval: reviewItem.interval || 0,
              easeFactor: reviewItem.easeFactor || 250,
              repetitions: reviewItem.repetitions || 0,
              lapses: reviewItem.lapses || 0,
              nextReviewAt: reviewItem.nextReviewAt ? new Date(reviewItem.nextReviewAt) : new Date(),
              lastReviewedAt: reviewItem.lastReviewedAt ? new Date(reviewItem.lastReviewedAt) : null,
              createdAt: reviewItem.createdAt ? new Date(reviewItem.createdAt) : new Date(),
              updatedAt: new Date(),
              deletedAt: reviewItem.deletedAt ? new Date(reviewItem.deletedAt) : null,
              userId, // Ensure userId matches
            })
            .where(eq(reviewItems.id, reviewItem.id!));
        }
      } else {
        // Insert new item
        await tx.insert(reviewItems).values({
          id: reviewItem.id!,
          itemType: reviewItem.itemType!,
          state: reviewItem.state || 'new',
          currentStepIndex: reviewItem.currentStepIndex,
          interval: reviewItem.interval || 0,
          easeFactor: reviewItem.easeFactor || 250,
          repetitions: reviewItem.repetitions || 0,
          lapses: reviewItem.lapses || 0,
          nextReviewAt: reviewItem.nextReviewAt ? new Date(reviewItem.nextReviewAt) : new Date(),
          lastReviewedAt: reviewItem.lastReviewedAt ? new Date(reviewItem.lastReviewedAt) : null,
          createdAt: reviewItem.createdAt ? new Date(reviewItem.createdAt) : new Date(),
          updatedAt: new Date(),
          deletedAt: reviewItem.deletedAt ? new Date(reviewItem.deletedAt) : null,
          userId,
        });
      }

      // Upsert subclass data
      if (questionReviewItem && questionReviewItem.questionId && questionReviewItem.reviewItemId) {
        await tx.insert(questionReviewItems)
          .values({
            reviewItemId: questionReviewItem.reviewItemId,
            questionId: questionReviewItem.questionId,
          })
          .onConflictDoUpdate({
            target: [questionReviewItems.reviewItemId],
            set: {
              questionId: questionReviewItem.questionId,
            },
          });
      } else if (caseItem && caseItem.reviewItemId && caseItem.title && caseItem.content) {
        // `title` and `content` are both NOT NULL, so they are what the guard tests. The image
        // columns are not: a row syncs before its image finishes uploading, which is exactly why
        // `imageUploadStatus` travels with the row instead of the client re-syncing it later.
        await tx.insert(caseItems)
          .values({
            reviewItemId: caseItem.reviewItemId,
            studyUnitId: caseItem.studyUnitId || null,
            category: caseItem.category || 'general',
            title: caseItem.title,
            content: caseItem.content,
            answer: caseItem.answer || null,
            imageKey: caseItem.imageKey || null,
            imageUrl: caseItem.imageUrl || null,
            imageUploadStatus: caseItem.imageUploadStatus || 'none',
            updatedAt: caseItem.updatedAt ? new Date(caseItem.updatedAt) : new Date(),
            deletedAt: caseItem.deletedAt ? new Date(caseItem.deletedAt) : null,
          })
          .onConflictDoUpdate({
            target: [caseItems.reviewItemId],
            set: {
              studyUnitId: caseItem.studyUnitId || null,
              category: caseItem.category || 'general',
              title: caseItem.title,
              content: caseItem.content,
              answer: caseItem.answer || null,
              imageKey: caseItem.imageKey || null,
              imageUrl: caseItem.imageUrl || null,
              imageUploadStatus: caseItem.imageUploadStatus || 'none',
              updatedAt: caseItem.updatedAt ? new Date(caseItem.updatedAt) : new Date(),
              deletedAt: caseItem.deletedAt ? new Date(caseItem.deletedAt) : null,
            },
          });
      } else if (noteItem && noteItem.reviewItemId && noteItem.content) {
        await tx.insert(noteItems)
          .values({
            reviewItemId: noteItem.reviewItemId,
            studyUnitId: noteItem.studyUnitId || null,
            type: noteItem.type || 'general',
            content: noteItem.content,
            sourceQuestionId: noteItem.sourceQuestionId || null,
            imageKey: noteItem.imageKey || null,
            imageUrl: noteItem.imageUrl || null,
            imageUploadStatus: noteItem.imageUploadStatus || 'none',
            updatedAt: noteItem.updatedAt ? new Date(noteItem.updatedAt) : new Date(),
            deletedAt: noteItem.deletedAt ? new Date(noteItem.deletedAt) : null,
          })
          .onConflictDoUpdate({
            target: [noteItems.reviewItemId],
            set: {
              studyUnitId: noteItem.studyUnitId || null,
              type: noteItem.type || 'general',
              content: noteItem.content,
              sourceQuestionId: noteItem.sourceQuestionId || null,
              imageKey: noteItem.imageKey || null,
              imageUrl: noteItem.imageUrl || null,
              imageUploadStatus: noteItem.imageUploadStatus || 'none',
              updatedAt: noteItem.updatedAt ? new Date(noteItem.updatedAt) : new Date(),
              deletedAt: noteItem.deletedAt ? new Date(noteItem.deletedAt) : null,
            },
          });
      }
    });
  }

  /**
   * Soft delete a review item
   */
  private async softDeleteReviewItem(reviewItemId: string, userId: string) {
    await db
      .update(reviewItems)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(reviewItems.id, reviewItemId),
        eq(reviewItems.userId, userId)
      ));
  }

  /**
   * Upsert a task
   */
  private async upsertTask(userId: string, task: TaskChange) {
    if (!task.id || !task.taskType) {
      console.warn('Invalid task data', task);
      return;
    }

    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, task.id),
        eq(tasks.userId, userId)
      ));

    if (existingTask) {
      // Update existing task (LWW: use the more recent updatedAt)
      const newUpdatedAt = task.updatedAt ? new Date(task.updatedAt) : new Date();
      const existingUpdatedAt = existingTask.updatedAt ? new Date(existingTask.updatedAt) : new Date();
      
      if (newUpdatedAt > existingUpdatedAt) {
        await db
          .update(tasks)
          .set({
            taskType: task.taskType!,
            recurrence: task.recurrence || 'once',
            recurrenceStatus: task.recurrenceStatus || 'active',
            startTime: task.startTime ? new Date(task.startTime) : null,
            endTime: task.endTime ? new Date(task.endTime) : null,
            consumedTime: task.consumedTime,
            estimatedTime: task.estimatedTime,
            status: task.status || 'pending',
            achievedFrom: task.achievedFrom || null,
            createdAt: task.createdAt ? new Date(task.createdAt) : existingTask.createdAt,
            updatedAt: new Date(),
            deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
            userId, // Ensure userId matches
          })
          .where(eq(tasks.id, task.id));
      }
    } else {
      await db.insert(tasks).values({
        id: task.id,
        taskType: task.taskType!,
        recurrence: task.recurrence || 'once',
        recurrenceStatus: task.recurrenceStatus || 'active',
        startTime: task.startTime ? new Date(task.startTime) : null,
        endTime: task.endTime ? new Date(task.endTime) : null,
        consumedTime: task.consumedTime,
        estimatedTime: task.estimatedTime,
        status: task.status || 'pending',
        achievedFrom: task.achievedFrom || null,
        createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
        updatedAt: new Date(),
        deletedAt: task.deletedAt ? new Date(task.deletedAt) : null,
        userId,
      });
    }
  }

  /**
   * Soft delete a task
   */
  private async softDeleteTask(taskId: string, userId: string) {
    await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId)
      ));
  }

  /**
   * Get server changes since the cursor (delta sync)
   */
  private async getServerChanges(userId: string, since?: Date) {
    let reviewItemsData;
    let tasksData;

    if (since) {
      // Delta sync: get items updated or created since the cursor
      reviewItemsData = await db.query.reviewItems.findMany({
        where: and(
          eq(reviewItems.userId, userId),
          or(
            gt(reviewItems.updatedAt, since),
            gt(reviewItems.createdAt, since)
          )
        ),
        with: {
          questionReviewItem: {
            with: {
              question: true,
            },
          },
          caseItem: true,
          noteItem: true,
          drugItem: true,
          factItem: true,
        },
      });

      tasksData = await db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, userId),
          or(
            gt(tasks.updatedAt, since),
            gt(tasks.createdAt, since)
          )
        ),
      });
    } else {
      // Full sync: get all non-deleted items
      reviewItemsData = await db.query.reviewItems.findMany({
        where: and(
          eq(reviewItems.userId, userId),
          isNull(reviewItems.deletedAt)
        ),
        with: {
          questionReviewItem: {
            with: {
              question: true,
            },
          },
          caseItem: true,
          noteItem: true,
          drugItem: true,
          factItem: true,
        },
      });

      tasksData = await db.query.tasks.findMany({
        where: and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt)
        ),
      });
    }

    return {
      reviewItems: reviewItemsData,
      tasks: tasksData,
    };
  }
}

// Types for sync changes
export interface StudentSyncChanges {
  reviewItems?: ReviewItemChange[];
  tasks?: TaskChange[];
}

export interface ReviewItemChange {
  id: string;
  deletedAt?: string | null;
  reviewItem?: {
    id: string;
    itemType: 'question' | 'case' | 'note' | 'drug' | 'fact';
    state?: 'new' | 'learning' | 'review' | 'relearning';
    currentStepIndex?: number;
    interval?: number;
    easeFactor?: number;
    repetitions?: number;
    lapses?: number;
    nextReviewAt?: string;
    lastReviewedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
  questionReviewItem?: {
    reviewItemId: string;
    questionId: string;
  };
  caseItem?: {
    reviewItemId: string;
    studyUnitId?: string | null;
    category?: string;
    title: string;
    content: string;
    answer?: string | null;
    imageKey?: string | null;
    imageUrl?: string | null;
    imageUploadStatus?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
  noteItem?: {
    reviewItemId: string;
    studyUnitId?: string | null;
    type?: string;
    content: string;
    sourceQuestionId?: string | null;
    imageKey?: string | null;
    imageUrl?: string | null;
    imageUploadStatus?: string;
    updatedAt?: string;
    deletedAt?: string | null;
  };
}

export interface TaskChange {
  id: string;
  taskType: 'zekr' | 'wird' | 'work' | 'study';
  recurrence?: 'once' | 'daily' | 'weekly';
  recurrenceStatus?: 'active' | 'stopped';
  startTime?: string;
  endTime?: string;
  consumedTime?: number;
  estimatedTime?: number;
  status?: 'pending' | 'in_progress' | 'done' | 'missed';
  achievedFrom?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}