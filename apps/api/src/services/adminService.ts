import bcrypt from 'bcryptjs';
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
  users,
  betterAuthUser,
  betterAuthAccount,
} from '@manhaj/db';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { notifyContentUpdated } from './pushService';

export class AdminConflictError extends Error {
  statusCode = 409;
}

export class AdminService {
  async getGrades() {
    return db.select().from(grades);
  }

  async createGrade(data: { name: string; description: string }) {
    const [grade] = await db.insert(grades).values(data).returning();
    // Notify all users - grade changes affect everyone
    const allTerms = await db.select({ id: terms.id }).from(terms);
    for (const term of allTerms) {
      void notifyContentUpdated(term.id).catch(() => undefined);
    }
    return grade;
  }

  async updateGrade(id: string, updates: { name?: string; description?: string }) {
    const [grade] = await db
      .update(grades)
      .set(updates)
      .where(eq(grades.id, id))
      .returning();
    // Notify all users - grade changes affect everyone
    const allTerms = await db.select({ id: terms.id }).from(terms);
    for (const term of allTerms) {
      void notifyContentUpdated(term.id).catch(() => undefined);
    }
    return grade;
  }

  async getTerms(gradeId?: string) {
    if (gradeId) return db.select().from(terms).where(eq(terms.gradeId, gradeId));
    return db.select().from(terms);
  }

  async createTerm(data: { gradeId: string; name: string; description: string }) {
    const [term] = await db.insert(terms).values(data).returning();
    void notifyContentUpdated(term.id).catch(() => undefined);
    return term;
  }

  async updateTerm(id: string, updates: { gradeId?: string; name?: string; description?: string }) {
    const [term] = await db
      .update(terms)
      .set(updates)
      .where(eq(terms.id, id))
      .returning();
    void notifyContentUpdated(term.id).catch(() => undefined);
    return term;
  }

  async getModules(termId?: string) {
    if (termId) return db.select().from(modules).where(eq(modules.termId, termId));
    return db.select().from(modules);
  }

  async createModule(data: { termId: string; name: string; description: string }) {
    const [module] = await db.insert(modules).values(data).returning();
    void notifyContentUpdated(data.termId).catch(() => undefined);
    return module;
  }

  async updateModule(id: string, updates: { termId?: string; name?: string; description?: string }) {
    const [currentModule] = await db.select().from(modules).where(eq(modules.id, id));
    const [module] = await db
      .update(modules)
      .set(updates)
      .where(eq(modules.id, id))
      .returning();
    const termId = updates.termId || currentModule?.termId;
    if (termId) {
      void notifyContentUpdated(termId).catch(() => undefined);
    }
    return module;
  }

  async getSubjects(moduleId?: string) {
    if (moduleId) return db.select().from(subjects).where(eq(subjects.moduleId, moduleId));
    return db.select().from(subjects);
  }

  async createSubject(data: { moduleId: string; name: string }) {
    const [subject] = await db.insert(subjects).values(data).returning();
    // Get the module to find the termId
    const [module] = await db.select({ termId: modules.termId }).from(modules).where(eq(modules.id, data.moduleId));
    if (module?.termId) {
      void notifyContentUpdated(module.termId).catch(() => undefined);
    }
    return subject;
  }

  async updateSubject(id: string, updates: { moduleId?: string; name?: string }) {
    const [currentSubject] = await db.select().from(subjects).where(eq(subjects.id, id));
    const [subject] = await db
      .update(subjects)
      .set(updates)
      .where(eq(subjects.id, id))
      .returning();
    const moduleId = updates.moduleId || currentSubject?.moduleId;
    if (moduleId) {
      const [module] = await db.select({ termId: modules.termId }).from(modules).where(eq(modules.id, moduleId));
      if (module?.termId) {
        void notifyContentUpdated(module.termId).catch(() => undefined);
      }
    }
    return subject;
  }

  async deleteGrade(id: string) {
    const [termDependencies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(terms)
      .where(eq(terms.gradeId, id));

    if (Number(termDependencies?.count ?? 0) > 0) {
      throw new AdminConflictError('Cannot delete a grade with dependent terms');
    }

    await db.delete(grades).where(eq(grades.id, id));
  }

  async deleteTerm(id: string) {
    const [moduleDependencies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(modules)
      .where(eq(modules.termId, id));

    if (Number(moduleDependencies?.count ?? 0) > 0) {
      throw new AdminConflictError('Cannot delete a term with dependent modules');
    }

    await db.delete(terms).where(eq(terms.id, id));
    void notifyContentUpdated(id).catch(() => undefined);
  }

  async deleteModule(id: string) {
    const [module] = await db.select({ termId: modules.termId }).from(modules).where(eq(modules.id, id));
    const [subjectDependencies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(eq(subjects.moduleId, id));

    if (Number(subjectDependencies?.count ?? 0) > 0) {
      throw new AdminConflictError('Cannot delete a module with dependent subjects');
    }

    await db.delete(modules).where(eq(modules.id, id));
    if (module?.termId) {
      void notifyContentUpdated(module.termId).catch(() => undefined);
    }
  }

  async deleteSubject(id: string) {
    const [subject] = await db.select({ moduleId: subjects.moduleId }).from(subjects).where(eq(subjects.id, id));
    const [lectureDependencies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lectures)
      .where(eq(lectures.subjectId, id));

    if (Number(lectureDependencies?.count ?? 0) > 0) {
      throw new AdminConflictError('Cannot delete a subject with dependent lectures');
    }

    await db.delete(subjects).where(eq(subjects.id, id));
    if (subject?.moduleId) {
      const [module] = await db.select({ termId: modules.termId }).from(modules).where(eq(modules.id, subject.moduleId));
      if (module?.termId) {
        void notifyContentUpdated(module.termId).catch(() => undefined);
      }
    }
  }

  async deleteLecture(id: string) {
    // Get the termId for notification before deleting
    const [target] = await db
      .select({ termId: terms.id })
      .from(lectures)
      .innerJoin(subjects, eq(lectures.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .innerJoin(terms, eq(modules.termId, terms.id))
      .where(eq(lectures.id, id));

    const [questionDependencies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(eq(questions.lectureId, id));

    if (Number(questionDependencies?.count ?? 0) > 0) {
      throw new AdminConflictError('Cannot delete a lecture with dependent questions');
    }

    await db.delete(lectureVideos).where(eq(lectureVideos.lectureId, id));
    await db.delete(lectureFiles).where(eq(lectureFiles.lectureId, id));
    await db.delete(lectures).where(eq(lectures.id, id));

    if (target) {
      void notifyContentUpdated(target.termId).catch(() => undefined);
    }
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
      where: isNull(questions.deletedAt),
      with: {
        choices: true,
      },
    });

    if (lectureId === 'null') {
      // Get unclassified questions
      query = db.query.questions.findMany({
        where: and(isNull(questions.lectureId), isNull(questions.deletedAt)),
        with: {
          choices: true,
        },
      });
    } else if (lectureId) {
      query = db.query.questions.findMany({
        where: and(eq(questions.lectureId, lectureId), isNull(questions.deletedAt)),
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
    await db.update(questions).set({ deletedAt: new Date() }).where(eq(questions.id, id));
  }

  // Lectures
  async createLecture(lectureData: any) {
    const [lecture] = await db.insert(lectures).values(lectureData).returning();
    // Get the termId for notification
    const [target] = await db
      .select({ termId: terms.id })
      .from(lectures)
      .innerJoin(subjects, eq(lectures.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .innerJoin(terms, eq(modules.termId, terms.id))
      .where(eq(lectures.id, lecture.id));

    if (target) {
      void notifyContentUpdated(target.termId).catch(() => undefined);
    }
    return lecture;
  }

  async updateLecture(id: string, updates: { subjectId?: string; name?: string; description?: string }) {
    const [lecture] = await db
      .update(lectures)
      .set(updates)
      .where(eq(lectures.id, id))
      .returning();
    // Get the termId for notification
    const [target] = await db
      .select({ termId: terms.id })
      .from(lectures)
      .innerJoin(subjects, eq(lectures.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .innerJoin(terms, eq(modules.termId, terms.id))
      .where(eq(lectures.id, id));

    if (target) {
      void notifyContentUpdated(target.termId).catch(() => undefined);
    }
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

  async getProfile(userId: string) {
    const baUser = await db.query.betterAuthUser.findFirst({
      where: eq(betterAuthUser.id, userId),
    });
    if (baUser) {
      return {
        id: baUser.id,
        name: baUser.name,
        email: baUser.email,
        role: baUser.role,
        image: baUser.image,
        authProvider: 'credentials',
      };
    }
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        authProvider: true,
      },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; password?: string }) {
    const updatePayload: Record<string, any> = {};
    if (data.name) updatePayload.name = data.name;
    if (data.email) updatePayload.email = data.email;

    const [baUser] = await db
      .update(betterAuthUser)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(betterAuthUser.id, userId))
      .returning();

    if (data.password && data.password.trim()) {
      const passwordHash = await bcrypt.hash(data.password.trim(), 10);
      await db
        .update(betterAuthAccount)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(betterAuthAccount.userId, userId));
      updatePayload.passwordHash = passwordHash;
    }

    await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .catch(() => undefined);

    return baUser || { id: userId, ...data };
  }

  async getUsers() {
    return db
      .select({
        id: betterAuthUser.id,
        name: betterAuthUser.name,
        email: betterAuthUser.email,
        role: betterAuthUser.role,
        image: betterAuthUser.image,
        termId: betterAuthUser.termId,
        termName: terms.name,
        gradeId: terms.gradeId,
        gradeName: grades.name,
        createdAt: betterAuthUser.createdAt,
        updatedAt: betterAuthUser.updatedAt,
      })
      .from(betterAuthUser)
      .leftJoin(terms, eq(betterAuthUser.termId, terms.id))
      .leftJoin(grades, eq(terms.gradeId, grades.id))
      .orderBy(sql`${betterAuthUser.createdAt} DESC`);
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    termId?: string | null;
  }) {
    const email = data.email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(betterAuthUser)
      .where(eq(betterAuthUser.email, email))
      .limit(1);

    if (existing.length > 0) {
      throw new AdminConflictError('User with this email already exists');
    }

    const userId = crypto.randomUUID();
    const role = data.role === 'admin' ? 'admin' : 'student';
    const termId = data.termId || null;
    const now = new Date();

    const [newUser] = await db
      .insert(betterAuthUser)
      .values({
        id: userId,
        name: data.name.trim(),
        email,
        emailVerified: true,
        role,
        termId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const passwordHash = await bcrypt.hash(data.password.trim(), 10);
    await db.insert(betterAuthAccount).values({
      id: `acc_${userId}`,
      accountId: userId,
      providerId: 'credential',
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    await db
      .insert(users)
      .values({
        id: userId,
        name: data.name.trim(),
        email,
        passwordHash,
        authProvider: 'credentials',
        role,
        termId,
      })
      .catch(() => undefined);

    return newUser;
  }

  async updateUser(
    id: string,
    updates: {
      name?: string;
      email?: string;
      role?: string;
      termId?: string | null;
      password?: string;
    }
  ) {
    const userUpdates: Record<string, any> = { updatedAt: new Date() };
    if (updates.name !== undefined) userUpdates.name = updates.name.trim();
    if (updates.email !== undefined) userUpdates.email = updates.email.trim().toLowerCase();
    if (updates.role !== undefined) userUpdates.role = updates.role === 'admin' ? 'admin' : 'student';
    if (updates.termId !== undefined) userUpdates.termId = updates.termId || null;

    const [updatedUser] = await db
      .update(betterAuthUser)
      .set(userUpdates)
      .where(eq(betterAuthUser.id, id))
      .returning();

    if (updates.password && updates.password.trim()) {
      const passwordHash = await bcrypt.hash(updates.password.trim(), 10);
      const acc = await db
        .select()
        .from(betterAuthAccount)
        .where(eq(betterAuthAccount.userId, id))
        .limit(1);

      if (acc.length > 0) {
        await db
          .update(betterAuthAccount)
          .set({ password: passwordHash, updatedAt: new Date() })
          .where(eq(betterAuthAccount.userId, id));
      } else {
        await db.insert(betterAuthAccount).values({
          id: `acc_${id}`,
          accountId: id,
          providerId: 'credential',
          userId: id,
          password: passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      userUpdates.passwordHash = passwordHash;
    }

    await db
      .update(users)
      .set(userUpdates)
      .where(eq(users.id, id))
      .catch(() => undefined);

    return updatedUser;
  }

  async deleteUser(id: string) {
    await db.delete(betterAuthUser).where(eq(betterAuthUser.id, id));
    await db.delete(users).where(eq(users.id, id)).catch(() => undefined);
    return { success: true, id };
  }

  // --- Zekr Catalog ---

}
