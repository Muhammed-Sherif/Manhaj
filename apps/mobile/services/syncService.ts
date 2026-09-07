import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from './database';
import { useAuthStore } from '../store/authStore';
import { syncContentFromServer } from './contentSyncService';
import { postStudentAttemptsSync, postStudentFlags, deleteStudentFlagsQuestionId, postContentVideoProgress } from '@manhaj/api-client';

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

// Store answer locally first (per sequence diagram)
export const storeAnswer = async (
  attempt: Attempt
): Promise<{ isCorrect: boolean; explanation: string }> => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // First, get the question data to determine if answer is correct
  const question = await db.getFirstAsync<any>(`
    SELECT q.*, c.is_correct, c.choice_text
    FROM questions q
    JOIN choices c ON c.id = ?
    WHERE q.id = ?
  `, [attempt.choiceId, attempt.questionId]);

  if (!question) {
    throw new Error('Question not found locally');
  }

  const isCorrect = question.is_correct === 1;
  const explanation = question.explanation;

  // Store attempt in SQLite (Step 1 in sequence diagram)
  await db.runAsync(`
    INSERT OR IGNORE INTO attempts (id, user_id, question_id, choice_id, is_correct, synced, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `, [attempt.id, userId, attempt.questionId, attempt.choiceId, isCorrect ? 1 : 0, attempt.createdAt]);

  // Return immediate response from SQLite (Step 2-3 in sequence diagram)
  return { isCorrect, explanation };
};

// Sync pending attempts to API (Step 5 in sequence diagram - optional if internet available)
export const syncAttempts = async (): Promise<SyncResult> => {
  const db = await getDatabase();
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
  const pendingAttempts = await db.getAllAsync(`
    SELECT * FROM attempts 
    WHERE user_id = ? AND synced = 0
  `, [userId]);

  if (pendingAttempts.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const response = await postStudentAttemptsSync({
    attempts: pendingAttempts.map((attempt: any) => ({
      id: attempt.id,
      questionId: attempt.question_id,
      choiceId: attempt.choice_id,
      isCorrect: attempt.is_correct === 1,
      createdAt: attempt.created_at,
    })),
  });
  const syncedIds = response.data.results
    .filter((result) => result.synced || result.reason === 'already_exists')
    .map((result) => result.id);

  // Update sync status in SQLite (Step 6 in sequence diagram)
  for (const id of syncedIds) {
    await db.runAsync(`
      UPDATE attempts SET synced = 1 WHERE id = ?
    `, [id]);
  }

  return {
    success: true,
    synced: syncedIds.length,
    failed: pendingAttempts.length - syncedIds.length,
  };
};

// Store flag locally
export const storeFlag = async (questionId: string): Promise<void> => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const id = `flag-${userId}-${questionId}-${Date.now()}`;

  await db.runAsync(`
    INSERT OR REPLACE INTO flags (id, user_id, question_id, synced, operation, created_at)
    VALUES (?, ?, ?, 0, 'add', ?)
  `, [id, userId, questionId, new Date().toISOString()]);
};

export const removeFlag = async (questionId: string): Promise<void> => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM flags WHERE user_id = ? AND question_id = ?',
    [userId, questionId]
  );
  const id = existing?.id || `flag-${userId}-${questionId}`;

  await db.runAsync(`
    INSERT OR REPLACE INTO flags (id, user_id, question_id, synced, operation, created_at)
    VALUES (?, ?, ?, 0, 'remove', ?)
  `, [id, userId, questionId, new Date().toISOString()]);
};

// Sync pending flags
export const syncFlags = async (): Promise<SyncResult> => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, synced: 0, failed: 0 };
  }

  const pendingFlags = await db.getAllAsync(`
    SELECT * FROM flags 
    WHERE user_id = ? AND synced = 0
  `, [userId]);

  if (pendingFlags.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const syncedIds: string[] = [];
  for (const flag of pendingFlags as any[]) {
    if (flag.operation === 'remove') {
      await deleteStudentFlagsQuestionId(flag.question_id);
    } else {
      await postStudentFlags({
        questionId: flag.question_id,
      });
    }
    syncedIds.push(flag.id);
    await db.runAsync('UPDATE flags SET synced = 1 WHERE id = ?', [flag.id]);
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
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const id = `progress-${userId}-${lectureVideoId}`;

  await db.runAsync(`
    INSERT OR REPLACE INTO video_progress (id, user_id, lecture_video_id, position_seconds, updated_at, synced)
    VALUES (?, ?, ?, ?, ?, 0)
  `, [id, userId, lectureVideoId, positionSeconds, new Date().toISOString()]);
};

// Sync video progress
export const syncVideoProgress = async (): Promise<SyncResult> => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, synced: 0, failed: 0 };
  }

  const pendingProgress = await db.getAllAsync(`
    SELECT * FROM video_progress 
    WHERE user_id = ? AND synced = 0
  `, [userId]);

  if (pendingProgress.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const syncedIds: string[] = [];
  for (const progress of pendingProgress as any[]) {
    await postContentVideoProgress({
      lectureVideoId: progress.lecture_video_id,
      positionSeconds: progress.position_seconds,
    });
    syncedIds.push(progress.id);
    await db.runAsync('UPDATE video_progress SET synced = 1 WHERE id = ?', [progress.id]);
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
  return {
    success: results.every((result) => result.success),
    synced: results.reduce((total, result) => total + result.synced, 0),
    failed: results.reduce((total, result) => total + result.failed, 0),
  };
};

// Get wrong or flagged questions for review
export const getWrongOrFlaggedQuestions = async () => {
  const db = await getDatabase();
  const userId = useAuthStore.getState().user?.id;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const wrongQuestions = await db.getAllAsync(`
    SELECT q.*, 'wrong' as reason
    FROM questions q
    JOIN attempts a ON q.id = a.question_id
    WHERE a.user_id = ? AND a.is_correct = 0
  `, [userId]);

  const flaggedQuestions = await db.getAllAsync(`
    SELECT q.*, 'flagged' as reason
    FROM questions q
    JOIN flags f ON q.id = f.question_id
    WHERE f.user_id = ?
  `, [userId]);

  // Combine and deduplicate
  const questionMap = new Map();

  wrongQuestions.forEach((q: any) => {
    questionMap.set(q.id, { ...q, reason: 'wrong' });
  });

  flaggedQuestions.forEach((q: any) => {
    questionMap.set(q.id, { ...q, reason: 'flagged' });
  });

  return Array.from(questionMap.values());
};
