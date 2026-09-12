import { eq, asc } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema';
import { getContentSync } from '@manhaj/api-client';

export interface ContentSyncData {
  grades: any[];
  terms: any[];
  modules: any[];
  subjects: any[];
  lectures: any[];
  questions: any[];
  choices: any[];
  lectureVideos: any[];
  lectureFiles: any[];
  nextCursor?: string;
}

// Sync content from API to local SQLite using Drizzle ORM
export const syncContent = async (contentData: ContentSyncData): Promise<void> => {
  await db.transaction(async (tx) => {
    // Sync grades
    for (const grade of contentData.grades) {
      await tx
        .insert(schema.grades)
        .values({
          id: grade.id,
          name: grade.name,
          description: grade.description ?? '',
        })
        .onConflictDoUpdate({
          target: schema.grades.id,
          set: {
            name: grade.name,
            description: grade.description ?? '',
          },
        });
    }

    // Sync terms
    for (const term of contentData.terms) {
      await tx
        .insert(schema.terms)
        .values({
          id: term.id,
          gradeId: term.gradeId,
          name: term.name,
          description: term.description ?? '',
        })
        .onConflictDoUpdate({
          target: schema.terms.id,
          set: {
            gradeId: term.gradeId,
            name: term.name,
            description: term.description ?? '',
          },
        });
    }

    // Sync modules
    for (const module of contentData.modules) {
      await tx
        .insert(schema.modules)
        .values({
          id: module.id,
          termId: module.termId,
          name: module.name,
          description: module.description ?? '',
        })
        .onConflictDoUpdate({
          target: schema.modules.id,
          set: {
            termId: module.termId,
            name: module.name,
            description: module.description ?? '',
          },
        });
    }

    // Sync subjects
    for (const subject of contentData.subjects) {
      await tx
        .insert(schema.subjects)
        .values({
          id: subject.id,
          moduleId: subject.moduleId,
          name: subject.name,
        })
        .onConflictDoUpdate({
          target: schema.subjects.id,
          set: {
            moduleId: subject.moduleId,
            name: subject.name,
          },
        });
    }

    // Sync lectures
    for (const lecture of contentData.lectures) {
      await tx
        .insert(schema.lectures)
        .values({
          id: lecture.id,
          subjectId: lecture.subjectId,
          name: lecture.name,
          description: lecture.description ?? '',
        })
        .onConflictDoUpdate({
          target: schema.lectures.id,
          set: {
            subjectId: lecture.subjectId,
            name: lecture.name,
            description: lecture.description ?? '',
          },
        });
    }

    // Sync questions
    for (const question of contentData.questions) {
      await tx
        .insert(schema.questions)
        .values({
          id: question.id,
          lectureId: question.lectureId || null,
          createdBy: question.createdBy || null,
          questionText: question.questionText,
          explanation: question.explanation ?? '',
          source: question.source ?? 'manual',
        })
        .onConflictDoUpdate({
          target: schema.questions.id,
          set: {
            lectureId: question.lectureId || null,
            createdBy: question.createdBy || null,
            questionText: question.questionText,
            explanation: question.explanation ?? '',
            source: question.source ?? 'manual',
          },
        });
    }

    // Sync choices
    for (const choice of contentData.choices) {
      await tx
        .insert(schema.choices)
        .values({
          id: choice.id,
          questionId: choice.questionId,
          choiceText: choice.choiceText,
          isCorrect: choice.isCorrect ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: schema.choices.id,
          set: {
            questionId: choice.questionId,
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect ? 1 : 0,
          },
        });
    }

    // Sync lecture videos
    for (const video of contentData.lectureVideos) {
      await tx
        .insert(schema.lectureVideos)
        .values({
          id: video.id,
          lectureId: video.lectureId,
          sourceName: video.sourceName,
          url: video.url,
          duration: video.duration ?? 0,
        })
        .onConflictDoUpdate({
          target: schema.lectureVideos.id,
          set: {
            lectureId: video.lectureId,
            sourceName: video.sourceName,
            url: video.url,
            duration: video.duration ?? 0,
          },
        });
    }

    // Sync lecture files
    for (const file of contentData.lectureFiles) {
      await tx
        .insert(schema.lectureFiles)
        .values({
          id: file.id,
          lectureId: file.lectureId,
          sourceName: file.sourceName,
          fileUrl: file.fileUrl,
          fileType: file.fileType ?? 'pdf',
        })
        .onConflictDoUpdate({
          target: schema.lectureFiles.id,
          set: {
            lectureId: file.lectureId,
            sourceName: file.sourceName,
            fileUrl: file.fileUrl,
            fileType: file.fileType ?? 'pdf',
          },
        });
    }

    // Store sync cursor
    if (contentData.nextCursor) {
      await tx
        .insert(schema.syncState)
        .values({
          key: 'last_sync_cursor',
          value: contentData.nextCursor,
        })
        .onConflictDoUpdate({
          target: schema.syncState.key,
          set: { value: contentData.nextCursor },
        });
    }
  });
};

export const syncContentFromServer = async (): Promise<void> => {
  const cursor = await getLastSyncCursor();
  const response = await getContentSync(cursor ? { since: cursor } : {});
  const contentData: ContentSyncData = {
    grades: response.data.grades || [],
    terms: response.data.terms || [],
    modules: response.data.modules || [],
    subjects: response.data.subjects || [],
    lectures: response.data.lectures || [],
    questions: response.data.questions || [],
    choices: response.data.choices || [],
    lectureVideos: response.data.lectureVideos || [],
    lectureFiles: response.data.lectureFiles || [],
    nextCursor: response.data.nextCursor,
  };
  await syncContent(contentData);
};

export const syncZekrCatalog = async (): Promise<void> => {
  const { getStudentZekrCatalog } = await import('@manhaj/api-client');
  const response = await getStudentZekrCatalog();
  if (response.data) {
    const { categories, catalog } = response.data;
    await db.transaction(async (tx) => {
      // Sync categories
      if (categories && Array.isArray(categories)) {
        for (const cat of categories) {
          await tx
            .insert(schema.zekrCategories)
            .values({
              id: cat.id,
              categoryNumber: cat.categoryNumber,
              nameEn: cat.nameEn,
              nameAr: cat.nameAr,
            })
            .onConflictDoUpdate({
              target: schema.zekrCategories.id,
              set: {
                categoryNumber: cat.categoryNumber,
                nameEn: cat.nameEn,
                nameAr: cat.nameAr,
              },
            });
        }
      }
      
      // Sync catalog
      if (catalog && Array.isArray(catalog)) {
        for (const item of catalog) {
          await tx
            .insert(schema.zekrCatalog)
            .values({
              id: item.id,
              categoryId: item.categoryId,
              duaNumber: item.duaNumber,
              slug: item.slug,
              transliteration: item.transliteration,
              textEn: item.textEn,
              textAr: item.textAr,
              virtue: item.virtue,
              source: item.source,
              repeatCount: item.repeatCount,
            })
            .onConflictDoUpdate({
              target: schema.zekrCatalog.id,
              set: {
                categoryId: item.categoryId,
                duaNumber: item.duaNumber,
                slug: item.slug,
                transliteration: item.transliteration,
                textEn: item.textEn,
                textAr: item.textAr,
                virtue: item.virtue,
                source: item.source,
                repeatCount: item.repeatCount,
              },
            });
        }
      }
    });
  }
};

export const getAutoDownloadEnabled = async (): Promise<boolean> => {
  const result = await db
    .select()
    .from(schema.syncState)
    .where(eq(schema.syncState.key, 'auto_download'))
    .limit(1);
  return result[0]?.value === 'true';
};

export const setAutoDownloadEnabled = async (enabled: boolean): Promise<void> => {
  await db
    .insert(schema.syncState)
    .values({
      key: 'auto_download',
      value: enabled ? 'true' : 'false',
    })
    .onConflictDoUpdate({
      target: schema.syncState.key,
      set: { value: enabled ? 'true' : 'false' },
    });
};

// Get last sync cursor
export const getLastSyncCursor = async (): Promise<string | null> => {
  const result = await db
    .select()
    .from(schema.syncState)
    .where(eq(schema.syncState.key, 'last_sync_cursor'))
    .limit(1);
  return result[0]?.value ?? null;
};

// Get content for browse screen from SQLite via Drizzle ORM
export const getGrades = async () => {
  return db.select().from(schema.grades).orderBy(asc(schema.grades.name));
};

export const getTermsByGrade = async (gradeId: string) => {
  return db
    .select()
    .from(schema.terms)
    .where(eq(schema.terms.gradeId, gradeId))
    .orderBy(asc(schema.terms.name));
};

export const getModulesByTerm = async (termId: string) => {
  return db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.termId, termId))
    .orderBy(asc(schema.modules.name));
};

export const getSubjectsByModule = async (moduleId: string) => {
  return db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.moduleId, moduleId))
    .orderBy(asc(schema.subjects.name));
};

export const getLecturesBySubject = async (subjectId: string) => {
  return db
    .select()
    .from(schema.lectures)
    .where(eq(schema.lectures.subjectId, subjectId))
    .orderBy(asc(schema.lectures.name));
};

export const getLectureDetails = async (lectureId: string) => {
  const lecture = await db.query.lectures.findFirst({
    where: eq(schema.lectures.id, lectureId),
    with: {
      lectureVideos: true,
      lectureFiles: true,
      questions: {
        with: {
          choices: true,
        },
      },
      subject: {
        with: {
          module: true,
        },
      },
    },
  });

  if (!lecture) return null;

  return {
    ...lecture,
    videos: lecture.lectureVideos,
    files: lecture.lectureFiles,
    questions: lecture.questions,
  };
};

export const getQuestionWithChoices = async (questionId: string) => {
  const question = await db.query.questions.findFirst({
    where: eq(schema.questions.id, questionId),
    with: {
      choices: true,
      lecture: {
        with: {
          subject: true,
        },
      },
    },
  });

  if (!question) return null;

  return question;
};

export const getQuestionsByLecture = async (lectureId: string) => {
  return db.query.questions.findMany({
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
};

// Retrieve complete content hierarchy directly from local SQLite
export const getHierarchyFromSqlite = async (): Promise<any[]> => {
  try {
    const gradesData = await db.query.grades.findMany({
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
    return (gradesData as unknown) as any[];
  } catch (error) {
    console.warn('Failed to load hierarchy from SQLite:', error);
    return [];
  }
};

// Save content hierarchy from API into local SQLite tables
export const saveHierarchyToSqlite = async (hierarchy: any[]): Promise<void> => {
  if (!Array.isArray(hierarchy) || hierarchy.length === 0) return;
  await db.transaction(async (tx) => {
    for (const grade of hierarchy) {
      if (!grade.id) continue;
      await tx
        .insert(schema.grades)
        .values({
          id: grade.id,
          name: grade.name ?? '',
          description: grade.description ?? '',
        })
        .onConflictDoUpdate({
          target: schema.grades.id,
          set: {
            name: grade.name ?? '',
            description: grade.description ?? '',
          },
        });

      if (Array.isArray(grade.terms)) {
        for (const term of grade.terms) {
          if (!term.id) continue;
          await tx
            .insert(schema.terms)
            .values({
              id: term.id,
              gradeId: grade.id,
              name: term.name ?? '',
              description: term.description ?? '',
            })
            .onConflictDoUpdate({
              target: schema.terms.id,
              set: {
                gradeId: grade.id,
                name: term.name ?? '',
                description: term.description ?? '',
              },
            });

          if (Array.isArray(term.modules)) {
            for (const mod of term.modules) {
              if (!mod.id) continue;
              await tx
                .insert(schema.modules)
                .values({
                  id: mod.id,
                  termId: term.id,
                  name: mod.name ?? '',
                  description: mod.description ?? '',
                })
                .onConflictDoUpdate({
                  target: schema.modules.id,
                  set: {
                    termId: term.id,
                    name: mod.name ?? '',
                    description: mod.description ?? '',
                  },
                });

              if (Array.isArray(mod.subjects)) {
                for (const subj of mod.subjects) {
                  if (!subj.id) continue;
                  await tx
                    .insert(schema.subjects)
                    .values({
                      id: subj.id,
                      moduleId: mod.id,
                      name: subj.name ?? '',
                    })
                    .onConflictDoUpdate({
                      target: schema.subjects.id,
                      set: {
                        moduleId: mod.id,
                        name: subj.name ?? '',
                      },
                    });

                  if (Array.isArray(subj.lectures)) {
                    for (const lec of subj.lectures) {
                      if (!lec.id) continue;
                      await tx
                        .insert(schema.lectures)
                        .values({
                          id: lec.id,
                          subjectId: subj.id,
                          name: lec.name ?? '',
                          description: lec.description ?? '',
                        })
                        .onConflictDoUpdate({
                          target: schema.lectures.id,
                          set: {
                            subjectId: subj.id,
                            name: lec.name ?? '',
                            description: lec.description ?? '',
                          },
                        });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
};

// Save a single lecture and its media / questions to local SQLite
export const saveLectureDetailsToSqlite = async (lecture: any): Promise<void> => {
  if (!lecture?.id) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.lectures)
      .values({
        id: lecture.id,
        subjectId: lecture.subjectId ?? lecture.subject?.id ?? '',
        name: lecture.name ?? '',
        description: lecture.description ?? '',
      })
      .onConflictDoUpdate({
        target: schema.lectures.id,
        set: {
          name: lecture.name ?? '',
          description: lecture.description ?? '',
        },
      });

    if (Array.isArray(lecture.lectureVideos)) {
      for (const v of lecture.lectureVideos) {
        if (!v.id) continue;
        await tx
          .insert(schema.lectureVideos)
          .values({
            id: v.id,
            lectureId: lecture.id,
            sourceName: v.sourceName ?? '',
            url: v.url ?? '',
            duration: v.duration ?? 0,
          })
          .onConflictDoUpdate({
            target: schema.lectureVideos.id,
            set: {
              sourceName: v.sourceName ?? '',
              url: v.url ?? '',
              duration: v.duration ?? 0,
            },
          });
      }
    }

    if (Array.isArray(lecture.lectureFiles)) {
      for (const f of lecture.lectureFiles) {
        if (!f.id) continue;
        await tx
          .insert(schema.lectureFiles)
          .values({
            id: f.id,
            lectureId: lecture.id,
            sourceName: f.sourceName ?? '',
            fileUrl: f.fileUrl ?? '',
            fileType: f.fileType ?? 'pdf',
          })
          .onConflictDoUpdate({
            target: schema.lectureFiles.id,
            set: {
              sourceName: f.sourceName ?? '',
              fileUrl: f.fileUrl ?? '',
              fileType: f.fileType ?? 'pdf',
            },
          });
      }
    }

    if (Array.isArray(lecture.questions)) {
      for (const q of lecture.questions) {
        if (!q.id) continue;
        await tx
          .insert(schema.questions)
          .values({
            id: q.id,
            lectureId: lecture.id,
            createdBy: q.createdBy ?? null,
            questionText: q.questionText ?? q.question_text ?? '',
            explanation: q.explanation ?? '',
            source: q.source ?? 'manual',
          })
          .onConflictDoUpdate({
            target: schema.questions.id,
            set: {
              questionText: q.questionText ?? q.question_text ?? '',
              explanation: q.explanation ?? '',
            },
          });

        if (Array.isArray(q.choices)) {
          for (const c of q.choices) {
            if (!c.id) continue;
            await tx
              .insert(schema.choices)
              .values({
                id: c.id,
                questionId: q.id,
                choiceText: c.choiceText ?? c.choice_text ?? '',
                isCorrect: c.isCorrect ? 1 : 0,
              })
              .onConflictDoUpdate({
                target: schema.choices.id,
                set: {
                  choiceText: c.choiceText ?? c.choice_text ?? '',
                  isCorrect: c.isCorrect ? 1 : 0,
                },
              });
          }
        }
      }
    }
  });
};

