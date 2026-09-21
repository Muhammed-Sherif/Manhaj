import { db } from '../config/database.js';
import { attempts, deviceTokens, flags, questions, choices, grades, terms, users, studyUnits, caseItems, noteItems, tasks,  zekrCategories,
  zekrCatalog,
  zekrTasks, wirdTasks, workTasks, studyTasks, reviewItems, reviewLogs, questionReviewItems,
  quranChapters,
  quranVerses,
  betterAuthUser,
  betterAuthAccount,
  betterAuthSession,
  refreshTokens } from '@manhaj/db/schema';
import { eq, and, not, inArray, lt, isNull, sql } from 'drizzle-orm';

export class StudentService {
  async getProfile(userId: string) {
    const [profile] = await db
      .select({ id: users.id, name: users.name, email: users.email, termId: users.termId })
      .from(users)
      .where(eq(users.id, userId));

    return profile;
  }

  async updateProfile(userId: string, termId: string | null) {
    if (termId) {
      const [term] = await db.select({ id: terms.id }).from(terms).where(eq(terms.id, termId));
      if (!term) throw new Error('Term not found');
    }

    const [profile] = await db
      .update(users)
      .set({ termId })
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email, termId: users.termId });

    return profile;
  }

  async getGradesWithTerms() {
    const results = await db.query.grades.findMany({
      with: { terms: true },
    });

    return results.map((grade) => ({
      id: grade.id,
      name: grade.name,
      terms: grade.terms.map((term) => ({ id: term.id, name: term.name })),
    }));
  }

  async syncAttempts(userId: string, attemptsData: any[]) {
    const results = [];

    for (const attemptData of attemptsData) {
      const { questionId, choiceId, isCorrect } = attemptData;

      // Use ON CONFLICT DO NOTHING for idempotent writes
      try {
        const [attempt] = await db
          .insert(attempts)
          .values({
            userId,
            questionId,
            choiceId,
            isCorrect,
          })
          .onConflictDoNothing({
            target: [attempts.userId, attempts.questionId],
          })
          .returning();

        if (attempt) {
          results.push({ ...attemptData, synced: true });
        } else {
          results.push({ ...attemptData, synced: false, reason: 'already_exists' });
        }
      } catch (error) {
        results.push({ ...attemptData, synced: false, reason: 'error' });
      }
    }

    return { results };
  }

  async getWrongOrFlagged(userId: string) {
    // Get questions where user got them wrong OR flagged them
    const wrongAttempts = await db.query.attempts.findMany({
      where: and(eq(attempts.userId, userId), eq(attempts.isCorrect, false)),
      with: {
        question: {
          with: {
            choices: true,
          },
        },
      },
    });

    const userFlags = await db.query.flags.findMany({
      where: eq(flags.userId, userId),
      with: {
        question: {
          with: {
            choices: true,
          },
        },
      },
    });

    // Combine and deduplicate
    const questionMap = new Map();

    wrongAttempts.forEach((attempt) => {
      if (attempt.question) {
        questionMap.set(attempt.question.id, {
          ...attempt.question,
          reason: 'wrong',
        });
      }
    });

    userFlags.forEach((flag) => {
      if (flag.question) {
        questionMap.set(flag.question.id, {
          ...flag.question,
          reason: 'flagged',
        });
      }
    });

    return Array.from(questionMap.values());
  }

  async getUnsolvedQuestions(userId: string, studyUnitId: string) {
    // Get all questions for the study unit
    const studyUnitQuestions = await db.query.questions.findMany({
      where: eq(questions.studyUnitId, studyUnitId),
      with: {
        choices: true,
      },
    });

    if (studyUnitQuestions.length === 0) {
      return [];
    }

    // Get all question IDs for this study unit
    const studyUnitQuestionIds = studyUnitQuestions.map((q) => q.id);

    // Get user's attempts for questions in this study unit
    const userAttempts = await db
      .select({ questionId: attempts.questionId })
      .from(attempts)
      .where(and(
        eq(attempts.userId, userId),
        inArray(attempts.questionId, studyUnitQuestionIds)
      ));

    const attemptedQuestionIds = new Set(userAttempts.map((attempt) => attempt.questionId));

    // Filter out attempted questions
    const unsolvedQuestions = studyUnitQuestions.filter(
      (question) => !attemptedQuestionIds.has(question.id)
    );

    return unsolvedQuestions;
  }

  async createFlag(userId: string, questionId: string) {
    try {
      const [flag] = await db
        .insert(flags)
        .values({ userId, questionId })
        .onConflictDoNothing({
          target: [flags.userId, flags.questionId],
        })
        .returning();

      return flag;
    } catch (error) {
      throw new Error('Failed to create flag');
    }
  }

  async deleteFlag(userId: string, questionId: string) {
    await db
      .delete(flags)
      .where(and(eq(flags.userId, userId), eq(flags.questionId, questionId)));
  }

  async registerDeviceToken(userId: string, pushToken: string, platform: string) {
    const [deviceToken] = await db
      .insert(deviceTokens)
      .values({ userId, pushToken, platform, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: deviceTokens.pushToken,
        set: { userId, platform, updatedAt: new Date() },
      })
      .returning();

    return deviceToken;
  }

  async unregisterDeviceToken(userId: string, pushToken: string) {
    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.pushToken, pushToken)));
  }
  // --- Cases ---
  
  async getCases(userId: string) {
    const results = await db.select({
      reviewItem: reviewItems,
      caseItem: caseItems,
    }).from(caseItems)
      .innerJoin(reviewItems, eq(caseItems.reviewItemId, reviewItems.id))
      .where(eq(reviewItems.userId, userId));
    
    return results.map(r => ({ ...r.reviewItem, ...r.caseItem, id: r.reviewItem.id }));
  }

  async createCase(userId: string, data: any) {
    return await db.transaction(async (tx) => {
      const [reviewItem] = await tx.insert(reviewItems).values({
        userId,
        itemType: 'case',
      }).returning();

      const [newItem] = await tx.insert(caseItems).values({
        ...data,
        reviewItemId: reviewItem.id,
      }).returning();
      
      return { ...reviewItem, ...newItem, id: reviewItem.id };
    });
  }

  async updateCase(userId: string, id: string, data: any) {
    const [reviewItem] = await db.select().from(reviewItems).where(and(eq(reviewItems.id, id), eq(reviewItems.userId, userId)));
    if (!reviewItem) throw new Error("Not found");

    const [updated] = await db
      .update(caseItems)
      .set(data)
      .where(eq(caseItems.reviewItemId, id))
      .returning();
      
    return { ...reviewItem, ...updated, id: reviewItem.id };
  }

  async deleteCase(userId: string, id: string) {
    const [reviewItem] = await db.select().from(reviewItems).where(and(eq(reviewItems.id, id), eq(reviewItems.userId, userId)));
    if (!reviewItem) throw new Error("Not found");

    await db.delete(reviewItems).where(eq(reviewItems.id, id));
    return { success: true, id };
  }

  // --- Notes ---

  async getNotes(userId: string) {
    const results = await db.select({
      reviewItem: reviewItems,
      noteItem: noteItems,
    }).from(noteItems)
      .innerJoin(reviewItems, eq(noteItems.reviewItemId, reviewItems.id))
      .where(eq(reviewItems.userId, userId));
    
    return results.map(r => ({ ...r.reviewItem, ...r.noteItem, id: r.reviewItem.id }));
  }

  async createNote(userId: string, data: any) {
    return await db.transaction(async (tx) => {
      const [reviewItem] = await tx.insert(reviewItems).values({
        userId,
        itemType: 'note',
      }).returning();

      const [newItem] = await tx.insert(noteItems).values({
        ...data,
        reviewItemId: reviewItem.id,
      }).returning();
      
      return { ...reviewItem, ...newItem, id: reviewItem.id };
    });
  }

  async updateNote(userId: string, id: string, data: any) {
    const [reviewItem] = await db.select().from(reviewItems).where(and(eq(reviewItems.id, id), eq(reviewItems.userId, userId)));
    if (!reviewItem) throw new Error("Not found");

    const [updated] = await db
      .update(noteItems)
      .set(data)
      .where(eq(noteItems.reviewItemId, id))
      .returning();
      
    return { ...reviewItem, ...updated, id: reviewItem.id };
  }

  async deleteNote(userId: string, id: string) {
    const [reviewItem] = await db.select().from(reviewItems).where(and(eq(reviewItems.id, id), eq(reviewItems.userId, userId)));
    if (!reviewItem) throw new Error("Not found");

    await db.delete(reviewItems).where(eq(reviewItems.id, id));
    return { success: true, id };
  }

  // --- Zekr Catalog ---
  async getZekrCatalog() {
    const categories = await db.select().from(zekrCategories);
    const catalog = await db.select().from(zekrCatalog);
    return { categories, catalog };
  }

  // --- Quran Data ---
  async getQuranData() {
    const chapters = await db.select().from(quranChapters);
    const verses = await db.select().from(quranVerses);
    return { chapters, verses };
  }

  // --- Tasks ---

  async getTasks(userId: string) {
    // Return all non-deleted tasks with their specific subclass data
    const userTasks = await db.select().from(tasks).where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));
    const zTasks = await db.select().from(zekrTasks).where(inArray(zekrTasks.taskId, userTasks.map(t => t.id).concat(['00000000-0000-0000-0000-000000000000'])));
    const wTasks = await db.select().from(wirdTasks).where(inArray(wirdTasks.taskId, userTasks.map(t => t.id).concat(['00000000-0000-0000-0000-000000000000'])));
    const woTasks = await db.select().from(workTasks).where(inArray(workTasks.taskId, userTasks.map(t => t.id).concat(['00000000-0000-0000-0000-000000000000'])));
    const sTasks = await db.select().from(studyTasks).where(inArray(studyTasks.taskId, userTasks.map(t => t.id).concat(['00000000-0000-0000-0000-000000000000'])));

    return userTasks.map(task => {
      if (task.taskType === 'zekr') {
        return { ...task, zekrTasks: zTasks.filter(z => z.taskId === task.id) };
      }
      if (task.taskType === 'wird') {
        return { ...task, wirdTask: wTasks.find(w => w.taskId === task.id) };
      }
      if (task.taskType === 'work') {
        return { ...task, workTask: woTasks.find(w => w.taskId === task.id) };
      }
      if (task.taskType === 'study') {
        return { ...task, studyTask: sTasks.find(s => s.taskId === task.id) };
      }
      return task;
    });
  }

  async createTask(userId: string, data: any) {
    const { taskType, zekrTasks: zekrTasksData, zekrTask, wirdTask, workTask, studyTask, ...taskData } = data;
    const [newTask] = await db.insert(tasks).values({ ...taskData, taskType, userId }).returning();
    
    if (taskType === 'zekr') {
      const tasksToInsert = zekrTasksData || (zekrTask ? [zekrTask] : []);
      if (tasksToInsert.length > 0) {
        await db.insert(zekrTasks).values(tasksToInsert.map((z: any) => ({ ...z, taskId: newTask.id })));
      }
    } else if (taskType === 'wird' && wirdTask) {
      await db.insert(wirdTasks).values({ ...wirdTask, taskId: newTask.id });
    } else if (taskType === 'work' && workTask) {
      await db.insert(workTasks).values({ ...workTask, taskId: newTask.id });
    } else if (taskType === 'study' && studyTask) {
      await db.insert(studyTasks).values({ ...studyTask, taskId: newTask.id });
    }

    return newTask;
  }

  async updateTask(userId: string, id: string, data: any) {
    const { zekrTasks: zekrTasksData, zekrTask, wirdTask, workTask, studyTask, ...taskData } = data;
    if (Object.keys(taskData).length > 0) {
      await db
      .update(tasks)
      .set(taskData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    }

    if (zekrTasksData) {
      // 1-to-many: typically we'd just update achievedCount.
      // We assume zekrTasksData contains { id, zekrAchievedCount }
      for (const z of zekrTasksData) {
        if (z.id) {
          await db.update(zekrTasks).set(z).where(eq(zekrTasks.id, z.id));
        }
      }
    } else if (zekrTask && zekrTask.id) {
      await db.update(zekrTasks).set(zekrTask).where(eq(zekrTasks.id, zekrTask.id));
    }
    if (wirdTask) {
      await db.update(wirdTasks).set(wirdTask).where(eq(wirdTasks.taskId, id));
    }
    if (workTask) {
      await db.update(workTasks).set(workTask).where(eq(workTasks.taskId, id));
    }
    if (studyTask) {
      await db.update(studyTasks).set(studyTask).where(eq(studyTasks.taskId, id));
    }
    
    return this.getTasks(userId).then(t => t.find(x => x.id === id));
  }

  async deleteTask(userId: string, id: string) {
    // Use soft delete for offline-first sync
    await db.update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return { success: true };
  }

  async completeStudyTasks(userId: string, studyUnitId: string, activityType: 'watch' | 'solve' | 'revision') {
    const tasksToComplete = await db.select({ id: tasks.id })
      .from(tasks)
      .innerJoin(studyTasks, eq(tasks.id, studyTasks.taskId))
      .where(and(
        eq(tasks.userId, userId),
        eq(studyTasks.studyUnitId, studyUnitId),
        eq(studyTasks.activityType, activityType),
        not(eq(tasks.status, 'done'))
      ));

    if (tasksToComplete.length > 0) {
      const taskIds = tasksToComplete.map(t => t.id);
      await db.update(tasks)
        .set({ status: 'done', endTime: new Date() })
        .where(inArray(tasks.id, taskIds));
    }

    return { completedCount: tasksToComplete.length };
  }

  // --- Reviewable Items (SRS) ---

  async getDueReviewables(userId: string) {
    // Get reviewable items where nextReviewAt <= now
    // Exclude items whose source questions have been soft-deleted
    const now = new Date();

    const allDueItems = await db.select().from(reviewItems).where(
      and(
        eq(reviewItems.userId, userId),
        lt(reviewItems.nextReviewAt, now),
        isNull(reviewItems.deletedAt)
      )
    );

    // Filter out question review items whose questions have been deleted
    const questionReviewItemIds = allDueItems
      .filter(item => item.itemType === 'question')
      .map(item => item.id);

    if (questionReviewItemIds.length > 0) {
      // Get question review items whose questions are NOT deleted
      const validQuestionReviewItems = await db
        .select({ reviewItemId: questionReviewItems.reviewItemId })
        .from(questionReviewItems)
        .innerJoin(questions, eq(questionReviewItems.questionId, questions.id))
        .where(
          and(
            inArray(questionReviewItems.reviewItemId, questionReviewItemIds),
            isNull(questions.deletedAt)
          )
        );

      const validQuestionReviewItemIds = new Set(
        validQuestionReviewItems.map(q => q.reviewItemId)
      );

      return allDueItems.filter(item => {
        if (item.itemType === 'question') {
          return validQuestionReviewItemIds.has(item.id);
        }
        return true; // Non-question items are always valid
      });
    }

    return allDueItems;
  }

  async syncReviewables(userId: string, items: any[]) {
    // Conservative merge sync logic
    const results = [];
    for (const item of items) {
      const { id, itemType, ...data } = item;
      
      const [existing] = await db.select().from(reviewItems).where(and(eq(reviewItems.id, id), eq(reviewItems.userId, userId)));
      if (existing) {
        // If local update is newer or interval is smaller, we might want to update it.
        // For conservative merge: take smaller interval.
        const mergedData = { ...data };
        if (existing.interval < data.interval) {
          mergedData.interval = existing.interval;
          mergedData.nextReviewAt = existing.nextReviewAt;
        }
        await db.update(reviewItems).set(mergedData).where(eq(reviewItems.id, id));
        results.push({ id, status: 'updated' });
      } else {
        await db.insert(reviewItems).values({ ...data, id, itemType, userId });
        results.push({ id, status: 'inserted' });
      }
    }
    return results;
  }

  async deleteAccount(userId: string) {
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(betterAuthUser)
      .where(eq(betterAuthUser.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Prevent deletion of admin users (they should use admin endpoint)
    if (existingUser.role === 'admin') {
      throw new Error('Admin users cannot delete their own account through this endpoint');
    }

    // Delete in transaction to ensure data consistency
    await db.transaction(async (transaction) => {
      // Delete better-auth related data
      await transaction
        .delete(betterAuthSession)
        .where(eq(betterAuthSession.userId, userId))
        .catch(() => undefined);

      await transaction
        .delete(betterAuthAccount)
        .where(eq(betterAuthAccount.userId, userId))
        .catch(() => undefined);

      // Delete legacy user data
      await transaction
        .delete(users)
        .where(eq(users.id, userId))
        .catch(() => undefined);

      // Delete device tokens
      await transaction
        .delete(deviceTokens)
        .where(eq(deviceTokens.userId, userId))
        .catch(() => undefined);

      // Delete refresh tokens
      await transaction
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId))
        .catch(() => undefined);

      // Finally delete the user
      await transaction
        .delete(betterAuthUser)
        .where(eq(betterAuthUser.id, userId));
    });

    return { success: true, message: 'Account deleted successfully' };
  }
}
