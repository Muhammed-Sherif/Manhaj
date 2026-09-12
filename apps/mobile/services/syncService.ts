import NetInfo from '@react-native-community/netinfo';
import { eq, and } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';
import { useAuthStore } from '../store/authStore';
import { syncContentFromServer } from './contentSyncService';
import {
  postStudentAttemptsSync,
  postStudentFlags,
  deleteStudentFlagsQuestionId,
  postContentVideoProgress,
} from '@manhaj/api-client';

export interface Attempt {
  id: string;
  questionId: string;
  choiceId: string;
  isCorrect: boolean;
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
}

export interface SyncableTask {
  id: string;
  taskType: 'zekr' | 'wird';
  recurrence: 'once' | 'daily' | 'weekly';
  startTime?: string | null;
  endTime?: string | null;
  consumedTime?: number | null;
  estimatedTime?: number | null;
  status: 'pending' | 'in_progress' | 'done' | 'missed';
  achievedFrom?: string | null;
  createdAt: string;
  zekrTasks?: {
    id: string;
    zekrId?: string | null;
    customZekrText?: string | null;
    zekrCount?: number | null;
    zekrAchievedCount?: number | null;
  }[];
  wirdTask?: {
    wirdMode: string;
    startAya?: number | null;
    endAya?: number | null;
    pageCount?: number | null;
  };
}

export interface SyncableCase {
  id: string;
  lectureId: string;
  category: string;
  title: string;
  content: string;
  answer?: string | null;
  createdAt: string;
}

export interface SyncableNote {
  id: string;
  lectureId: string;
  type: string;
  content: string;
  sourceQuestionId?: string | null;
  createdAt: string;
}

export interface SyncableReviewable {
  id: string;
  itemType: string;
  interval: number;
  easeFactor: number;
  repetitionCount: number;
  nextReviewDate: string;
  lastReviewedAt?: string | null;
}

// Store answer locally first using Drizzle ORM
export const storeAnswer = async (
  attempt: Attempt
): Promise<{ isCorrect: boolean; explanation: string }> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get question with choice
  const choice = await db.query.choices.findFirst({
    where: and(
      eq(schema.choices.id, attempt.choiceId),
      eq(schema.choices.questionId, attempt.questionId)
    ),
    with: {
      question: true,
    },
  });

  if (!choice || !choice.question) {
    throw new Error('Question or choice not found locally');
  }

  const isCorrect = choice.isCorrect === 1;
  const explanation = choice.question.explanation;

  // Store attempt in SQLite
  await db
    .insert(schema.attempts)
    .values({
      id: attempt.id,
      userId,
      questionId: attempt.questionId,
      choiceId: attempt.choiceId,
      isCorrect: isCorrect ? 1 : 0,
      synced: 0,
      createdAt: attempt.createdAt,
    })
    .onConflictDoNothing();

  return { isCorrect, explanation };
};

// Sync pending attempts to API
export const syncAttempts = async (): Promise<SyncResult> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Check internet connectivity
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, synced: 0, failed: 0 };
  }

  // Get pending (not synced) attempts
  const pendingAttempts = await db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.synced, 0)));

  if (pendingAttempts.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const response = await postStudentAttemptsSync({
    attempts: pendingAttempts.map((attempt) => ({
      id: attempt.id,
      questionId: attempt.questionId,
      choiceId: attempt.choiceId,
      isCorrect: attempt.isCorrect === 1,
      createdAt: attempt.createdAt,
    })),
  });

  const syncedIds = (response.data.results ?? [])
    .filter((result) => result.synced || result.reason === 'already_exists')
    .map((result) => result.id)
    .filter((id): id is string => Boolean(id));

  // Update sync status in SQLite via Drizzle
  for (const id of syncedIds) {
    await db
      .update(schema.attempts)
      .set({ synced: 1 })
      .where(eq(schema.attempts.id, id));
  }

  return {
    success: true,
    synced: syncedIds.length,
    failed: pendingAttempts.length - syncedIds.length,
  };
};

// Store flag locally
export const storeFlag = async (questionId: string): Promise<void> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const id = `flag-${userId}-${questionId}-${Date.now()}`;

  await db
    .insert(schema.flags)
    .values({
      id,
      userId,
      questionId,
      synced: 0,
      operation: 'add',
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [schema.flags.userId, schema.flags.questionId],
      set: {
        id,
        synced: 0,
        operation: 'add',
        createdAt: new Date().toISOString(),
      },
    });
};

export const removeFlag = async (questionId: string): Promise<void> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const id = `flag-${userId}-${questionId}-${Date.now()}`;

  await db
    .insert(schema.flags)
    .values({
      id,
      userId,
      questionId,
      synced: 0,
      operation: 'remove',
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [schema.flags.userId, schema.flags.questionId],
      set: {
        id,
        synced: 0,
        operation: 'remove',
        createdAt: new Date().toISOString(),
      },
    });
};

// Check if a question is currently flagged
export const isQuestionFlagged = async (questionId: string): Promise<boolean> => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return false;

  try {
    const res = await db
      .select({ operation: schema.flags.operation })
      .from(schema.flags)
      .where(and(eq(schema.flags.userId, userId), eq(schema.flags.questionId, questionId)))
      .limit(1);

    return res.length > 0 && res[0].operation === 'add';
  } catch (error) {
    console.warn('isQuestionFlagged check failed:', error);
    return false;
  }
};

// Sync pending flags
export const syncFlags = async (): Promise<SyncResult> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, synced: 0, failed: 0 };
  }

  const pendingFlags = await db
    .select()
    .from(schema.flags)
    .where(and(eq(schema.flags.userId, userId), eq(schema.flags.synced, 0)));

  if (pendingFlags.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const syncedIds: string[] = [];
  for (const flag of pendingFlags) {
    if (flag.operation === 'remove') {
      await deleteStudentFlagsQuestionId(flag.questionId);
    } else {
      await postStudentFlags({
        questionId: flag.questionId,
      });
    }
    syncedIds.push(flag.id);
    await db.update(schema.flags).set({ synced: 1 }).where(eq(schema.flags.id, flag.id));
  }

  return {
    success: true,
    synced: syncedIds.length,
    failed: pendingFlags.length - syncedIds.length,
  };
};

// Store video progress locally
export const storeVideoProgress = async (
  lectureVideoId: string,
  positionSeconds: number
): Promise<void> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const id = `progress-${userId}-${lectureVideoId}`;

  await db
    .insert(schema.videoProgress)
    .values({
      id,
      userId,
      lectureVideoId,
      positionSeconds,
      updatedAt: new Date().toISOString(),
      synced: 0,
    })
    .onConflictDoUpdate({
      target: [schema.videoProgress.userId, schema.videoProgress.lectureVideoId],
      set: {
        positionSeconds,
        updatedAt: new Date().toISOString(),
        synced: 0,
      },
    });
};

// Sync video progress
export const syncVideoProgress = async (): Promise<SyncResult> => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, synced: 0, failed: 0 };
  }

  const pendingProgress = await db
    .select()
    .from(schema.videoProgress)
    .where(and(eq(schema.videoProgress.userId, userId), eq(schema.videoProgress.synced, 0)));

  if (pendingProgress.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const syncedIds: string[] = [];
  for (const progress of pendingProgress) {
    await postContentVideoProgress({
      lectureVideoId: progress.lectureVideoId,
      positionSeconds: progress.positionSeconds,
    });
    syncedIds.push(progress.id);
    await db
      .update(schema.videoProgress)
      .set({ synced: 1 })
      .where(eq(schema.videoProgress.id, progress.id));
  }

  return {
    success: true,
    synced: syncedIds.length,
    failed: pendingProgress.length - syncedIds.length,
  };
};

export const syncPendingChanges = async (): Promise<SyncResult> => {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return { success: false, synced: 0, failed: 0 };

  const results = await Promise.all([syncAttempts(), syncFlags(), syncVideoProgress()]);
  await syncContentFromServer();
  try {
    const { syncZekrCatalog } = await import('./contentSyncService');
    await syncZekrCatalog();
  } catch (err) {
    console.error('Failed to sync zekr catalog', err);
  }
  return {
    success: results.every((result) => result.success),
    synced: results.reduce((total, result) => total + result.synced, 0),
    failed: results.reduce((total, result) => total + result.failed, 0),
  };
};

// Get wrong or flagged questions for review via Drizzle ORM
export const getWrongOrFlaggedQuestions = async () => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const wrongQuestions = await db
    .select({
      question: schema.questions,
      attempt: schema.attempts,
      lectureName: schema.lectures.name,
      subjectName: schema.subjects.name,
    })
    .from(schema.questions)
    .innerJoin(schema.attempts, eq(schema.questions.id, schema.attempts.questionId))
    .leftJoin(schema.lectures, eq(schema.questions.lectureId, schema.lectures.id))
    .leftJoin(schema.subjects, eq(schema.lectures.subjectId, schema.subjects.id))
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.isCorrect, 0)));

  const flaggedQuestions = await db
    .select({
      question: schema.questions,
      attempt: schema.attempts,
      lectureName: schema.lectures.name,
      subjectName: schema.subjects.name,
    })
    .from(schema.questions)
    .innerJoin(schema.flags, eq(schema.questions.id, schema.flags.questionId))
    .leftJoin(
      schema.attempts,
      and(
        eq(schema.attempts.questionId, schema.questions.id),
        eq(schema.attempts.userId, userId)
      )
    )
    .leftJoin(schema.lectures, eq(schema.questions.lectureId, schema.lectures.id))
    .leftJoin(schema.subjects, eq(schema.lectures.subjectId, schema.subjects.id))
    .where(and(eq(schema.flags.userId, userId), eq(schema.flags.operation, 'add')));

  // Combine and deduplicate
  const questionMap = new Map<string, any>();

  wrongQuestions.forEach((row) => {
    questionMap.set(row.question.id, {
      ...row.question,
      lectureName: row.lectureName || 'General Practice',
      subjectName: row.subjectName || 'General',
      reason: 'wrong',
      attempt: row.attempt,
    });
  });

  flaggedQuestions.forEach((row) => {
    questionMap.set(row.question.id, {
      ...row.question,
      lectureName: row.lectureName || 'General Practice',
      subjectName: row.subjectName || 'General',
      reason: 'flagged',
      attempt: row.attempt,
    });
  });

  return Array.from(questionMap.values());
};

// Get solved question IDs for the current user
export const getSolvedQuestionIds = async (): Promise<Set<string>> => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    return new Set<string>();
  }

  const solvedQuestionIds = await db
    .select({ questionId: schema.attempts.questionId })
    .from(schema.attempts)
    .where(eq(schema.attempts.userId, userId));
  return new Set<string>(solvedQuestionIds.map((row) => row.questionId));
};

// Get unsolved questions for a lecture
export const getUnsolvedQuestions = async (lectureId: string) => {
  const allQuestions = await db.query.questions.findMany({
    where: eq(schema.questions.lectureId, lectureId),
    with: {
      choices: true,
      lecture: {
        with: {
          subject: true,
        },
      },
    },
  });

  const solvedIds = await getSolvedQuestionIds();
  // Filter out solved questions
  return allQuestions.filter((question) => !solvedIds.has(question.id));
};

// Reset all attempts for a lecture (retest/retake)
export const resetLectureAttempts = async (lectureId: string) => {
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get all question IDs for the lecture
  const lectureQuestions = await db
    .select({ id: schema.questions.id })
    .from(schema.questions)
    .where(eq(schema.questions.lectureId, lectureId));

  const questionIds = lectureQuestions.map((q) => q.id);

  // Delete all attempts for these questions by the user
  // Delete attempts for each question individually
  for (const questionId of questionIds) {
    await db
      .delete(schema.attempts)
      .where(
        and(
          eq(schema.attempts.userId, userId),
          eq(schema.attempts.questionId, questionId)
        )
      );
  }
};
