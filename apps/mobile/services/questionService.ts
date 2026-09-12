import { getContentLecturesId, getStudentQuestionsUnsolved } from '@manhaj/api-client';
import { getUnsolvedQuestions } from './syncService';
import { getQuestionsByLecture, saveLectureDetailsToSqlite } from './contentSyncService';
import { db } from './database';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { useAuthStore } from '../store/authStore';
import type { Question } from '../store/solveStore';

/**
 * Fetch unsolved questions for a lecture with offline-first approach
 * @param lectureId - The lecture ID to fetch questions for
 * @returns Array of unsolved questions
 */
export const fetchUnsolvedQuestions = async (lectureId: string): Promise<Question[]> => {
  try {
    // 1. Try local SQLite first (offline first)
    let list: Question[] = await getUnsolvedQuestions(lectureId) || [];
    
    if (list.length > 0) {
      return list;
    }

    // 2. If SQLite is empty, fetch from API and cache
    const apiRes = await getStudentQuestionsUnsolved({ lectureId });
    if (apiRes?.data) {
      // Save questions to SQLite for offline use
      for (const question of apiRes.data) {
        await saveLectureDetailsToSqlite({
          questions: [question],
          lectures: [],
          subjects: [],
          modules: [],
          terms: [],
          grades: []
        });
      }
      return apiRes.data as Question[];
    }

    return [];
  } catch (error) {
    console.warn('[fetchUnsolvedQuestions] Error:', error);
    return [];
  }
};

/**
 * Fetch all questions for a lecture with offline-first approach
 * @param lectureId - The lecture ID to fetch questions for
 * @returns Array of all questions for the lecture
 */
export const fetchAllQuestions = async (lectureId: string): Promise<Question[]> => {
  try {
    // 1. Try local SQLite first (offline first)
    let list: Question[] = await getQuestionsByLecture(lectureId) || [];
    
    if (list.length > 0) {
      return list;
    }

    // 2. If SQLite is empty, fetch from API and cache
    const apiRes = await getContentLecturesId(lectureId);
    if (apiRes?.data) {
      await saveLectureDetailsToSqlite(apiRes.data);
      list = await getQuestionsByLecture(lectureId) || [];
      return list;
    }

    return [];
  } catch (error) {
    console.warn('[fetchAllQuestions] Error:', error);
    return [];
  }
};

/**
 * Get the user's choice for a specific question (for review mode)
 * @param questionId - The question ID to get the user's choice for
 * @returns The choice ID if an attempt exists, null otherwise
 */
export const getUserChoiceForQuestion = async (questionId: string): Promise<string | null> => {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    return null;
  }

  try {
    const attempt = await db
      .select()
      .from(schema.attempts)
      .where(and(
        eq(schema.attempts.questionId, questionId),
        eq(schema.attempts.userId, userId)
      ))
      .limit(1);
    
    return attempt.length > 0 ? attempt[0].choiceId : null;
  } catch (error) {
    console.warn('Failed to get user choice for question:', error);
    return null;
  }
};