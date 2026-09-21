import { eq, and, isNull } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';
import { customAxios } from '@manhaj/api-client';

export interface StudentSyncData {
  reviewItems: any[];
  tasks: any[];
  nextCursor?: string;
}

// Sync student-owned items (bidirectional with tombstones)
export const syncStudentItemsFromServer = async (clientChanges?: any): Promise<StudentSyncData> => {
  console.log('[StudentSync] syncStudentItemsFromServer: starting');
  
  const cursor = await getLastStudentSyncCursor();
  console.log(`[StudentSync] using cursor: ${cursor ?? 'none (full sync)'}`);
  
  const response = await customAxios<any>(
    {
      url: '/student/sync',
      method: 'POST',
      params: cursor ? { since: cursor } : {},
      data: clientChanges || {},
    }
  );
  
  const studentData: StudentSyncData = {
    reviewItems: response.data.serverChanges?.reviewItems || [],
    tasks: response.data.serverChanges?.tasks || [],
    nextCursor: response.data.nextCursor,
  };
  
  console.log(
    `[StudentSync] fetched from server: ${studentData.reviewItems.length} review items, ${studentData.tasks.length} tasks, nextCursor: ${studentData.nextCursor ?? 'none'}`
  );
  
  await syncStudentItems(studentData);
  console.log('[StudentSync] syncStudentItemsFromServer: finished successfully');
  
  return studentData;
};

// Sync student items to local SQLite
export const syncStudentItems = async (studentData: StudentSyncData): Promise<void> => {
  await db.transaction(async (tx) => {
    // Sync review items (handle tombstones)
    for (const item of studentData.reviewItems) {
      if (item.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.reviewableItems)
          .set({ deletedAt: item.deletedAt })
          .where(eq(schema.reviewableItems.id, item.id));
      } else {
        await tx
          .insert(schema.reviewableItems)
          .values({
            id: item.id,
            userId: item.userId,
            itemType: item.itemType,
            state: item.state,
            currentStepIndex: item.currentStepIndex,
            interval: item.interval,
            easeFactor: item.easeFactor,
            repetitionCount: item.repetitionCount,
            lapses: item.lapses,
            nextReviewDate: item.nextReviewAt,
            lastReviewedAt: item.lastReviewedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            deletedAt: item.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.reviewableItems.id,
            set: {
              itemType: item.itemType,
              state: item.state,
              currentStepIndex: item.currentStepIndex,
              interval: item.interval,
              easeFactor: item.easeFactor,
              repetitionCount: item.repetitionCount,
              lapses: item.lapses,
              nextReviewDate: item.nextReviewAt,
              lastReviewedAt: item.lastReviewedAt,
              updatedAt: item.updatedAt,
              deletedAt: item.deletedAt,
            },
          });
      }
    }

    // Sync tasks (handle tombstones)
    for (const task of studentData.tasks) {
      if (task.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.tasks)
          .set({ deletedAt: task.deletedAt })
          .where(eq(schema.tasks.id, task.id));
      } else {
        await tx
          .insert(schema.tasks)
          .values({
            id: task.id,
            taskType: task.taskType,
            recurrence: task.recurrence,
            recurrenceStatus: task.recurrenceStatus,
            startTime: task.startTime,
            endTime: task.endTime,
            consumedTime: task.consumedTime,
            estimatedTime: task.estimatedTime,
            status: task.status,
            achievedFrom: task.achievedFrom,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            deletedAt: task.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.tasks.id,
            set: {
              taskType: task.taskType,
              recurrence: task.recurrence,
              recurrenceStatus: task.recurrenceStatus,
              startTime: task.startTime,
              endTime: task.endTime,
              consumedTime: task.consumedTime,
              estimatedTime: task.estimatedTime,
              status: task.status,
              achievedFrom: task.achievedFrom,
              updatedAt: task.updatedAt,
              deletedAt: task.deletedAt,
            },
          });
      }
    }

    // Store sync cursor
    if (studentData.nextCursor) {
      await tx
        .insert(schema.syncState)
        .values({
          key: 'last_student_sync_cursor',
          value: studentData.nextCursor,
        })
        .onConflictDoUpdate({
          target: schema.syncState.key,
          set: { value: studentData.nextCursor },
        });
    }
  });
};

// Get last student sync cursor
export const getLastStudentSyncCursor = async (): Promise<string | null> => {
  const result = await db
    .select()
    .from(schema.syncState)
    .where(eq(schema.syncState.key, 'last_student_sync_cursor'))
    .limit(1);
  return result[0]?.value ?? null;
};

// Get local review items (non-deleted)
export const getLocalReviewItems = async () => {
  return db.select().from(schema.reviewableItems).where(isNull(schema.reviewableItems.deletedAt));
};

// Get local tasks (non-deleted)
export const getLocalTasks = async () => {
  return db.select().from(schema.tasks).where(isNull(schema.tasks.deletedAt));
};