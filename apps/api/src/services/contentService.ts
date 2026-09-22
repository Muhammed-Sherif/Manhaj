import { db } from '../config/database.js';
import { grades, terms, modules, subjects, studyUnits, lectureVideos, lectureFiles, videoProgress, questions, choices, questionSources } from '@manhaj/db/schema';
import { eq, gt, and, isNull, inArray } from '@manhaj/db';

export class ContentService {
  async syncContent(since?: string) {
    // Delta sync - return all content modified since the given timestamp
    const sinceDate = since ? new Date(since) : undefined;

    // Generate next cursor for next sync
    const nextCursor = new Date().toISOString();

    const content = {
      grades: await this.grades(sinceDate),
      terms: await this.terms(sinceDate),
      modules: await this.modules(sinceDate),
      subjects: await this.subjects(sinceDate),
      studyUnits: await this.studyUnits(sinceDate),
      questions: await this.questions(sinceDate),
      choices: await this.choices(sinceDate),
      questionSources: await this.questionSources(sinceDate),
      studyUnitVideos: await this.lectureVideos(sinceDate),
      studyUnitFiles: await this.lectureFiles(sinceDate),
      nextCursor,
    };

    return content;
  }

  async getContentHierarchy() {
    return db.query.grades.findMany({
      with: {
        terms: {
          with: {
            modules: {
              with: {
                subjects: {
                  with: {
                    studyUnits: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getStudyUnitDetails(studyUnitId: string) {
    return db.query.studyUnits.findFirst({
      where: eq(studyUnits.id, studyUnitId),
      with: {
        subject: true,
        lectureVideos: true,
        lectureFiles: true,
        questions: {
          with: {
            choices: true,
            questionSources: true,
          },
        },
      },
    });
  }

  async getStudyUnitVideos(studyUnitId: string) {
    return db.query.lectureVideos.findMany({
      where: eq(lectureVideos.studyUnitId, studyUnitId),
    });
  }

  async updateVideoProgress(userId: string, lectureVideoId: string, positionSeconds: number) {
    const [progress] = await db
      .insert(videoProgress)
      .values({
        userId,
        lectureVideoId,
        positionSeconds,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [videoProgress.userId, videoProgress.lectureVideoId],
        set: {
          positionSeconds,
          updatedAt: new Date(),
        },
      })
      .returning();

    return progress;
  }

  private async grades(since?: Date) {
    // For now, return all grades (would add updatedAt field for proper delta sync)
    return db.query.grades.findMany();
  }

  private async terms(since?: Date) {
    return db.query.terms.findMany();
  }

  private async modules(since?: Date) {
    return db.query.modules.findMany();
  }

  private async subjects(since?: Date) {
    return db.query.subjects.findMany();
  }

  private async studyUnits(since?: Date) {
    const where = since
      ? and(
          gt(studyUnits.updatedAt, since),
          isNull(studyUnits.deletedAt)
        )
      : isNull(studyUnits.deletedAt);

    return db.query.studyUnits.findMany({
      where: where || undefined,
    });
  }

  private async questions(since?: Date) {
    const where = since
      ? and(
          gt(questions.updatedAt, since),
          isNull(questions.deletedAt)
        )
      : isNull(questions.deletedAt);

    return db.query.questions.findMany({
      where: where || undefined,
      with: {
        choices: true,
        writtenQuestion: true,
        mcqQuestion: true,
        images: true,
      },
    });
  }

  private async choices(since?: Date) {
    // Choices are weak entities - they sync with their parent question
    // We use aggregate sync: when a question is updated, all its choices are included
    // So we only return choices whose parent questions were updated since the cursor
    if (since) {
      // Delta sync: get question IDs that were updated
      const updatedQuestions = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(
          gt(questions.updatedAt, since),
          isNull(questions.deletedAt)
        ));

      const questionIds = updatedQuestions.map(q => q.id);

      if (questionIds.length > 0) {
        return db.query.choices.findMany({
          where: inArray(choices.questionId, questionIds),
        });
      }

      return []; // No updated questions, so no choices to sync
    }

    // Full sync: return all choices
    return db.query.choices.findMany();
  }

  private async questionSources(since?: Date) {
    // Like choices, these are weak entities that ride along with their parent question:
    // a source is only meaningful in the context of the question it annotates, so a
    // question update re-sends its whole source set rather than diffing them separately.
    if (since) {
      const updatedQuestions = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(
          gt(questions.updatedAt, since),
          isNull(questions.deletedAt)
        ));

      const questionIds = updatedQuestions.map(q => q.id);

      if (questionIds.length > 0) {
        return db.query.questionSources.findMany({
          where: inArray(questionSources.questionId, questionIds),
        });
      }

      return [];
    }

    return db.query.questionSources.findMany();
  }

  private async lectureVideos(since?: Date) {
    const where = since
      ? and(
          gt(lectureVideos.updatedAt, since),
          isNull(lectureVideos.deletedAt)
        )
      : isNull(lectureVideos.deletedAt);

    return db.query.lectureVideos.findMany({
      where: where || undefined,
    });
  }

  private async lectureFiles(since?: Date) {
    const where = since
      ? and(
          gt(lectureFiles.updatedAt, since),
          isNull(lectureFiles.deletedAt)
        )
      : isNull(lectureFiles.deletedAt);

    return db.query.lectureFiles.findMany({
      where: where || undefined,
    });
  }
}
