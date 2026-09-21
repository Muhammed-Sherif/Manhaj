import { getContentStudyUnitsId, getStudentQuestionsUnsolved } from '@manhaj/api-client';
import { getUnsolvedQuestions } from './syncService';
import { getQuestionsByStudyUnit, saveStudyUnitDetailsToSqlite } from './contentSyncService';
import { db } from './database';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { useAuthStore } from '../store/authStore';
import type { Question } from '../store/solveStore';

/**
 * Fetch unsolved questions for a studyUnit with offline-first approach
 * @param studyUnitId - The studyUnit ID to fetch questions for
 * @returns Array of unsolved questions
 */
export const fetchUnsolvedQuestions = async (studyUnitId: string): Promise<Question[]> => {
  try {
    // 1. Try local SQLite first (offline first)
    let list: Question[] = await getUnsolvedQuestions(studyUnitId) || [];
    
    if (list.length > 0) {
      return list;
    }

    // 2. If SQLite is empty, fetch from API and cache
    const apiRes = await getStudentQuestionsUnsolved({ studyUnitId });
    if (apiRes?.data) {
      // Save questions to SQLite for offline use
      for (const question of apiRes.data) {
        await saveStudyUnitDetailsToSqlite({
          questions: [question],
          studyUnits: [],
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
 * Fetch all questions for a studyUnit with offline-first approach
 * @param studyUnitId - The studyUnit ID to fetch questions for
 * @returns Array of all questions for the studyUnit
 */
export const fetchAllQuestions = async (studyUnitId: string): Promise<Question[]> => {
  try {
    // 1. Try local SQLite first (offline first)
    let list: Question[] = await getQuestionsByStudyUnit(studyUnitId) || [];
    
    if (list.length > 0) {
      return list;
    }

    // 2. If SQLite is empty, fetch from API and cache
    const apiRes = await getContentStudyUnitsId(studyUnitId);
    if (apiRes?.data) {
      await saveStudyUnitDetailsToSqlite(apiRes.data);
      list = await getQuestionsByStudyUnit(studyUnitId) || [];
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