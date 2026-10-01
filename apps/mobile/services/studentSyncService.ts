import { eq, and, isNull } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';
import { customAxios } from '@manhaj/api-client';

export interface StudentSyncData {
  reviewItems: any[];
  tasks: any[];
  attempts?: any[];
  flags?: any[];
  videoProgress?: any[];
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
    attempts: response.data.serverChanges?.attempts || [],
    flags: response.data.serverChanges?.flags || [],
    videoProgress: response.data.serverChanges?.videoProgress || [],
    nextCursor: response.data.nextCursor,
  };

  console.log(
    `[StudentSync] fetched from server: ${studentData.reviewItems.length} review items, ${studentData.tasks.length} tasks, ${studentData.attempts?.length ?? 0} attempts, ${studentData.flags?.length ?? 0} flags, ${studentData.videoProgress?.length ?? 0} video progress, nextCursor: ${studentData.nextCursor ?? 'none'}`
  );
  if (!studentData.attempts || studentData.attempts.length === 0) {
    console.log('[StudentSync] Debug: No attempts returned. Cursor used:', cursor);
    console.log('[StudentSync] Debug: serverChanges attempts array:', response.data.serverChanges?.attempts);
  }

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

        // Sync question subclass
        if (item.questionReviewItem) {
          await tx
            .insert(schema.questionReviewable)
            .values({
              reviewableId: item.id,
              questionId: item.questionReviewItem.questionId,
            })
            .onConflictDoNothing();
        }

        // Sync case subclass
        if (item.caseItem) {
          const caseId = item.caseItem.id || item.caseItem.reviewItemId || item.id;
          await tx
            .insert(schema.caseItems)
            .values({
              id: caseId,
              studyUnitId: item.caseItem.studyUnitId || '',
              category: item.caseItem.category || 'general',
              title: item.caseItem.title || '',
              content: item.caseItem.content || '',
              answer: item.caseItem.answer,
              imageUploadStatus: item.caseItem.imageUploadStatus || 'none',
              createdAt: item.caseItem.createdAt || new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: schema.caseItems.id,
              set: {
                studyUnitId: item.caseItem.studyUnitId || '',
                category: item.caseItem.category || 'general',
                title: item.caseItem.title || '',
                content: item.caseItem.content || '',
                answer: item.caseItem.answer,
                imageUploadStatus: item.caseItem.imageUploadStatus || 'none',
              },
            });

          await tx
            .insert(schema.caseReviewable)
            .values({
              reviewableId: item.id,
              caseId: caseId,
            })
            .onConflictDoNothing();
        }

        // Sync note subclass
        if (item.noteItem) {
          const noteId = item.noteItem.id || item.noteItem.reviewItemId || item.id;
          await tx
            .insert(schema.noteItems)
            .values({
              id: noteId,
              studyUnitId: item.noteItem.studyUnitId || '',
              type: item.noteItem.type || 'general',
              content: item.noteItem.content || '',
              sourceQuestionId: item.noteItem.sourceQuestionId,
              imageUploadStatus: item.noteItem.imageUploadStatus || 'none',
              createdAt: item.noteItem.createdAt || new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: schema.noteItems.id,
              set: {
                studyUnitId: item.noteItem.studyUnitId || '',
                type: item.noteItem.type || 'general',
                content: item.noteItem.content || '',
                sourceQuestionId: item.noteItem.sourceQuestionId,
                imageUploadStatus: item.noteItem.imageUploadStatus || 'none',
              },
            });

          await tx
            .insert(schema.noteReviewable)
            .values({
              reviewableId: item.id,
              noteId: noteId,
            })
            .onConflictDoNothing();
        }
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
            synced: 1, // Set to 1 because we just got it from the server
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
              synced: 1, // Set to 1 because we just got it from the server
            },
          });

        // Handle subclasses
        if (task.taskType === 'wird' && task.wirdTask) {
          await tx.insert(schema.wirdTasks).values({
            taskId: task.id,
            wirdMode: task.wirdTask.wirdMode,
            startVerseId: task.wirdTask.startVerseId || null,
            endVerseId: task.wirdTask.endVerseId || null,
            startPage: task.wirdTask.startPage || null,
            endPage: task.wirdTask.endPage || null,
            lastAchievedPage: task.wirdTask.lastAchievedPage || null,
          }).onConflictDoUpdate({
            target: schema.wirdTasks.taskId,
            set: {
              wirdMode: task.wirdTask.wirdMode,
              startVerseId: task.wirdTask.startVerseId || null,
              endVerseId: task.wirdTask.endVerseId || null,
              startPage: task.wirdTask.startPage || null,
              endPage: task.wirdTask.endPage || null,
              lastAchievedPage: task.wirdTask.lastAchievedPage || null,
            }
          });
        } else if (task.taskType === 'zekr' && task.zekrTasks) {
          await tx.delete(schema.zekrTasks).where(eq(schema.zekrTasks.taskId, task.id));
          if (task.zekrTasks.length > 0) {
            await tx.insert(schema.zekrTasks).values(
              task.zekrTasks.map((zt: any) => ({
                taskId: task.id,
                categoryId: zt.categoryId || null,
                zekrId: zt.zekrId || null,
                customZekrText: zt.customZekrText || null,
                zekrCount: zt.zekrCount,
                zekrAchievedCount: zt.zekrAchievedCount,
              }))
            );
          }
        } else if (task.taskType === 'study' && task.studyTask) {
          await tx.insert(schema.studyTasks).values({
            taskId: task.id,
            studyUnitId: task.studyTask.studyUnitId,
            activityType: task.studyTask.activityType,
          }).onConflictDoUpdate({
            target: schema.studyTasks.taskId,
            set: {
              studyUnitId: task.studyTask.studyUnitId,
              activityType: task.studyTask.activityType,
            }
          });
        } else if (task.taskType === 'work' && task.workTask) {
          await tx.insert(schema.workTasks).values({
            taskId: task.id,
            category: task.workTask.category,
            projectName: task.workTask.projectName,
            description: task.workTask.description || null,
            link: task.workTask.link || null,
            cost: task.workTask.cost,
          }).onConflictDoUpdate({
            target: schema.workTasks.taskId,
            set: {
              category: task.workTask.category,
              projectName: task.workTask.projectName,
              description: task.workTask.description || null,
              link: task.workTask.link || null,
              cost: task.workTask.cost,
            }
          });
        }
      }
    }

    // Sync attempts
    if (studentData.attempts) {
      for (const attempt of studentData.attempts) {
        await tx
          .insert(schema.attempts)
          .values({
            id: attempt.id,
            userId: attempt.userId,
            questionId: attempt.questionId,
            choiceId: attempt.choiceId,
            isCorrect: attempt.isCorrect ? 1 : 0,
            synced: 1, // already synced
            createdAt: new Date().toISOString(), // Server doesn't send this, we generate
          })
          .onConflictDoNothing(); // Immutable
      }
    }

    // Sync flags
    if (studentData.flags) {
      for (const flag of studentData.flags) {
        await tx
          .insert(schema.flags)
          .values({
            id: flag.id,
            userId: flag.userId,
            questionId: flag.questionId,
            synced: 1,
            operation: 'add',
            createdAt: new Date().toISOString(),
          })
          .onConflictDoNothing();
      }
    }

    // Sync video progress
    if (studentData.videoProgress) {
      for (const vp of studentData.videoProgress) {
        await tx
          .insert(schema.videoProgress)
          .values({
            id: vp.id,
            userId: vp.userId,
            studyUnitVideoId: vp.lectureVideoId, // Note: server uses lectureVideoId
            positionSeconds: vp.positionSeconds,
            updatedAt: vp.updatedAt || new Date().toISOString(),
            synced: 1,
          })
          .onConflictDoUpdate({
            target: schema.videoProgress.id,
            set: {
              positionSeconds: vp.positionSeconds,
              updatedAt: vp.updatedAt || new Date().toISOString(),
              synced: 1,
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