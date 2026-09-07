import { db } from '../config/database';
import { attempts, deviceTokens, flags, questions, choices, grades, terms, users } from '@manhaj/db';
import { eq, and } from 'drizzle-orm';

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
}
