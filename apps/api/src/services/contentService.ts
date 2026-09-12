import { db } from '../config/database';
import { grades, terms, modules, subjects, lectures, lectureVideos, lectureFiles, videoProgress, questions, choices } from '@manhaj/db';
import { eq, gt } from 'drizzle-orm';

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
      lectures: await this.lectures(sinceDate),
      questions: await this.questions(sinceDate),
      choices: await this.choices(sinceDate),
      lectureVideos: await this.lectureVideos(sinceDate),
      lectureFiles: await this.lectureFiles(sinceDate),
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
                    lectures: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getLectureDetails(lectureId: string) {
    return db.query.lectures.findFirst({
      where: eq(lectures.id, lectureId),
      with: {
        subject: true,
        lectureVideos: true,
        lectureFiles: true,
        questions: {
          with: {
            choices: true,
          },
        },
      },
    });
  }

  async getLectureVideos(lectureId: string) {
    return db.query.lectureVideos.findMany({
      where: eq(lectureVideos.lectureId, lectureId),
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

  private async lectures(since?: Date) {
    return db.query.lectures.findMany();
  }

  private async questions(since?: Date) {
    return db.query.questions.findMany({
      with: {
        choices: true,
      },
    });
  }

  private async choices(since?: Date) {
    return db.query.choices.findMany();
  }

  private async lectureVideos(since?: Date) {
    return db.query.lectureVideos.findMany();
  }

  private async lectureFiles(since?: Date) {
    return db.query.lectureFiles.findMany();
  }
}
