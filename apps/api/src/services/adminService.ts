import { db } from '../config/database';
import {
  questions,
  choices,
  attempts,
  flags,
  lectures,
  lectureVideos,
  lectureFiles,
  subjects,
  modules,
  terms,
  grades,
} from '@manhaj/db';
import { eq, inArray, isNull, sql } from 'drizzle-orm';
import { notifyContentUpdated } from './pushService';

export class AdminConflictError extends Error {
  statusCode = 409;
}

export class AdminService {
  async createGrade(data: { name: string; description: string }) {
    const [grade] = await db.insert(grades).values(data).returning();
    return grade;
  }

  async updateGrade(id: string, updates: { name?: string; description?: string }) {
    const [grade] = await db
      .update(grades)
      .set(updates)
      .where(eq(grades.id, id))
      .returning();
    return grade;
  }

  async createTerm(data: { gradeId: string; name: string; description: string }) {
    const [term] = await db.insert(terms).values(data).returning();
    return term;
  }

  async updateTerm(id: string, updates: { gradeId?: string; name?: string; description?: string }) {
    const [term] = await db
      .update(terms)
      .set(updates)
      .where(eq(terms.id, id))
      .returning();
    return term;
  }

  async createModule(data: { termId: string; name: string; description: string }) {
    const [module] = await db.insert(modules).values(data).returning();
    return module;
  }

  async updateModule(id: string, updates: { termId?: string; name?: string; description?: string }) {
    const [module] = await db
      .update(modules)
      .set(updates)
      .where(eq(modules.id, id))
      .returning();
    return module;
  }

  async createSubject(data: { moduleId: string; name: string }) {
    const [subject] = await db.insert(subjects).values(data).returning();
    return subject;
  }

  async updateSubject(id: string, updates: { moduleId?: string; name?: string }) {
    const [subject] = await db
      .update(subjects)
      .set(updates)
      .where(eq(subjects.id, id))
      .returning();
    return subject;
  }

  // Questions
  async createQuestion(questionData: any) {
    const { choices: questionChoices, ...questionFields } = questionData;

    const [question] = await db
      .insert(questions)
      .values({
        ...questionFields,
        createdBy: questionFields.createdBy || null,
        lectureId: questionFields.lectureId || null,
      })
      .returning();

    // Insert choices
    if (questionChoices && questionChoices.length > 0) {
      await db.insert(choices).values(
        questionChoices.map((choice: any) => ({
          ...choice,
          questionId: question.id,
        }))
      );
    }

    return question;
  }

  async getQuestions(lectureId?: string) {
    let query = db.query.questions.findMany({
      with: {
        choices: true,
      },
    });

    if (lectureId === 'null') {
      // Get unclassified questions
      query = db.query.questions.findMany({
        where: isNull(questions.lectureId),
        with: {
          choices: true,
        },
      });
    } else if (lectureId) {
      query = db.query.questions.findMany({
        where: eq(questions.lectureId, lectureId),
        with: {
          choices: true,
        },
      });
    }

    return query;
  }

  async bulkAssignLecture(questionIds: string[], lectureId: string) {
    if (questionIds.length === 0) {
      throw new Error('At least one question ID is required');
    }

    const result = await db.transaction(async (transaction) => {
      const updatedQuestions = await transaction
        .update(questions)
        .set({ lectureId })
        .where(inArray(questions.id, questionIds))
        .returning({ id: questions.id });

      if (updatedQuestions.length !== questionIds.length) {
        throw new Error('One or more question IDs were not found');
      }

      return { success: true, assignedCount: updatedQuestions.length };
    });

    const [target] = await db
      .select({ termId: terms.id })
      .from(lectures)
      .innerJoin(subjects, eq(lectures.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .innerJoin(terms, eq(modules.termId, terms.id))
      .where(eq(lectures.id, lectureId));

    if (target) {
      void notifyContentUpdated(target.termId).catch(() => undefined);
    }
    return result;
  }

  async updateQuestion(id: string, updates: any) {
    const [question] = await db
      .update(questions)
      .set(updates)
      .where(eq(questions.id, id))
      .returning();

    return question;
  }

  async deleteQuestion(id: string) {
    const [choiceDependencies, attemptDependencies, flagDependencies] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(choices)
        .where(eq(choices.questionId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(attempts)
        .where(eq(attempts.questionId, id)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(flags)
        .where(eq(flags.questionId, id)),
    ]);

    const dependencyCount = [
      choiceDependencies,
      attemptDependencies,
      flagDependencies,
    ].reduce((total, rows) => total + Number(rows[0]?.count ?? 0), 0);

    if (dependencyCount > 0) {
      throw new AdminConflictError('Cannot delete a question with dependent records');
    }

    await db.delete(questions).where(eq(questions.id, id));
  }

  // Lectures
  async createLecture(lectureData: any) {
    const [lecture] = await db.insert(lectures).values(lectureData).returning();
    return lecture;
  }

  async updateLecture(id: string, updates: { subjectId?: string; name?: string; description?: string }) {
    const [lecture] = await db
      .update(lectures)
      .set(updates)
      .where(eq(lectures.id, id))
      .returning();
    return lecture;
  }

  async getLectures(subjectId?: string) {
    if (subjectId) {
      return db.query.lectures.findMany({
        where: eq(lectures.subjectId, subjectId),
        with: {
          lectureVideos: true,
          lectureFiles: true,
        },
      });
    }
    return db.query.lectures.findMany({
      with: {
        lectureVideos: true,
        lectureFiles: true,
      },
    });
  }

  async addLectureVideo(lectureId: string, videoData: any) {
    const [video] = await db
      .insert(lectureVideos)
      .values({ ...videoData, lectureId })
      .returning();
    return video;
  }

  async addLectureFile(lectureId: string, fileData: any) {
    const [file] = await db
      .insert(lectureFiles)
      .values({ ...fileData, lectureId })
      .returning();
    return file;
  }
}
