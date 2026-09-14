import { eq, asc, notInArray, isNull } from 'drizzle-orm';
import { db } from './database';
import * as schema from '../db/schema.js';
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

    // Sync lectures (handle tombstones)
    for (const lecture of contentData.lectures) {
      if (lecture.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.lectures)
          .set({ deletedAt: lecture.deletedAt })
          .where(eq(schema.lectures.id, lecture.id));
      } else {
        await tx
          .insert(schema.lectures)
          .values({
            id: lecture.id,
            subjectId: lecture.subjectId,
            name: lecture.name,
            description: lecture.description ?? '',
            updatedAt: lecture.updatedAt ?? new Date().toISOString(),
            deletedAt: lecture.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.lectures.id,
            set: {
              subjectId: lecture.subjectId,
              name: lecture.name,
              description: lecture.description ?? '',
              updatedAt: lecture.updatedAt ?? new Date().toISOString(),
              deletedAt: lecture.deletedAt,
            },
          });
      }
    }

    // Sync questions (handle tombstones)
    for (const question of contentData.questions) {
      if (question.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.questions)
          .set({ deletedAt: question.deletedAt })
          .where(eq(schema.questions.id, question.id));
      } else {
        await tx
          .insert(schema.questions)
          .values({
            id: question.id,
            lectureId: question.lectureId || null,
            createdBy: question.createdBy || null,
            questionText: question.questionText,
            explanation: question.explanation ?? '',
            source: question.source ?? 'manual',
            updatedAt: question.updatedAt ?? new Date().toISOString(),
            deletedAt: question.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.questions.id,
            set: {
              lectureId: question.lectureId || null,
              createdBy: question.createdBy || null,
              questionText: question.questionText,
              explanation: question.explanation ?? '',
              source: question.source ?? 'manual',
              updatedAt: question.updatedAt ?? new Date().toISOString(),
              deletedAt: question.deletedAt,
            },
          });
      }
    }

    // Sync choices (aggregate sync - replace all choices for updated questions)
    // First, get the question IDs from the choices we received
    if (contentData.choices && contentData.choices.length > 0) {
      const questionIdsWithUpdatedChoices = Array.from(new Set(
        contentData.choices.map(choice => choice.questionId)
      ));

      // Delete all existing choices for these questions, then insert the new ones
      for (const questionId of questionIdsWithUpdatedChoices) {
        await tx
          .delete(schema.choices)
          .where(eq(schema.choices.questionId, questionId));
      }

      // Insert the new choices
      for (const choice of contentData.choices) {
        await tx
          .insert(schema.choices)
          .values({
            id: choice.id,
            questionId: choice.questionId,
            choiceText: choice.choiceText,
            isCorrect: choice.isCorrect ? 1 : 0,
          });
      }
    }

    // Sync lecture videos (handle tombstones)
    for (const video of contentData.lectureVideos) {
      if (video.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.lectureVideos)
          .set({ deletedAt: video.deletedAt })
          .where(eq(schema.lectureVideos.id, video.id));
      } else {
        await tx
          .insert(schema.lectureVideos)
          .values({
            id: video.id,
            lectureId: video.lectureId,
            sourceName: video.sourceName,
            url: video.url,
            duration: video.duration ?? 0,
            localFilePath: video.localFilePath,
            updatedAt: video.updatedAt ?? new Date().toISOString(),
            deletedAt: video.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.lectureVideos.id,
            set: {
              lectureId: video.lectureId,
              sourceName: video.sourceName,
              url: video.url,
              duration: video.duration ?? 0,
              localFilePath: video.localFilePath,
              updatedAt: video.updatedAt ?? new Date().toISOString(),
              deletedAt: video.deletedAt,
            },
          });
      }
    }

    // Sync lecture files (handle tombstones)
    for (const file of contentData.lectureFiles) {
      if (file.deletedAt) {
        // Soft delete locally
        await tx
          .update(schema.lectureFiles)
          .set({ deletedAt: file.deletedAt })
          .where(eq(schema.lectureFiles.id, file.id));
      } else {
        await tx
          .insert(schema.lectureFiles)
          .values({
            id: file.id,
            lectureId: file.lectureId,
            sourceName: file.sourceName,
            fileUrl: file.fileUrl,
            fileType: file.fileType ?? 'pdf',
            updatedAt: file.updatedAt ?? new Date().toISOString(),
            deletedAt: file.deletedAt,
          })
          .onConflictDoUpdate({
            target: schema.lectureFiles.id,
            set: {
              lectureId: file.lectureId,
              sourceName: file.sourceName,
              fileUrl: file.fileUrl,
              fileType: file.fileType ?? 'pdf',
              updatedAt: file.updatedAt ?? new Date().toISOString(),
              deletedAt: file.deletedAt,
            },
          });
      }
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
  console.log('[ContentSync] syncContentFromServer: starting');
  const cursor = await getLastSyncCursor();
  console.log(`[ContentSync] using cursor: ${cursor ?? 'none (full sync)'}`);
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
  console.log(
    `[ContentSync] fetched from server: ${contentData.grades.length} grades, ${contentData.terms.length} terms, ${contentData.modules.length} modules, ${contentData.subjects.length} subjects, ${contentData.lectures.length} lectures, ${contentData.questions.length} questions, ${contentData.choices.length} choices, ${contentData.lectureVideos.length} videos, ${contentData.lectureFiles.length} files, nextCursor: ${contentData.nextCursor ?? 'none'}`
  );
  await syncContent(contentData);
  console.log('[ContentSync] syncContentFromServer: finished successfully');
};

export const syncQuranData = async (): Promise<void> => {
  // Check if we already have it
  const existing = await db.select().from(schema.quranChapters).limit(1);
  if (existing.length > 0) return;

  const { getStudentQuranData } = await import('@manhaj/api-client');
  const response = await getStudentQuranData();
  if (!response || !('data' in response) || typeof response.data !== 'object') {
    console.warn('[ContentSync] syncQuranData: invalid response', response);
    return;
  }
  const data = response.data as any;
  const { chapters, verses } = data;
  
  await db.transaction(async (tx) => {
    // Sync chapters
    if (chapters && Array.isArray(chapters)) {
      for (const chapter of chapters) {
        await tx
          .insert(schema.quranChapters)
          .values({
            id: chapter.id,
            nameAr: chapter.nameAr,
            nameEn: chapter.nameEn,
            versesCount: chapter.versesCount,
          })
          .onConflictDoNothing();
      }
    }

    // Sync verses (batching to avoid too many variables)
    if (verses && Array.isArray(verses)) {
      const batchSize = 100;
      for (let i = 0; i < verses.length; i += batchSize) {
        const batch = verses.slice(i, i + batchSize);
        await tx
          .insert(schema.quranVerses)
          .values(batch.map(v => ({
            id: v.id,
            chapterId: v.chapterId,
            ayaNumber: v.ayaNumber,
            page: v.page,
            textAr: v.textAr,
          })))
          .onConflictDoNothing();
      }
    }
  });
};

// Bump this whenever the server-side zekr catalog changes (e.g. categories
// were re-seeded or cleaned up) so devices re-sync instead of keeping stale data.
const ZEKR_CATALOG_VERSION = '2';

export const syncZekrCatalog = async (): Promise<void> => {
  // Check if we already have this catalog version
  const [state] = await db
    .select()
    .from(schema.syncState)
    .where(eq(schema.syncState.key, 'zekr_catalog_version'))
    .limit(1);
  if (state && state.value === ZEKR_CATALOG_VERSION) return;

  const { getStudentZekrCatalog } = await import('@manhaj/api-client');
  const response = await getStudentZekrCatalog();
  if (!response || !('data' in response) || typeof response.data !== 'object') {
    console.warn('[ContentSync] syncZekrCatalog: invalid response', response);
    return;
  }
  const data = response.data as any;
  const { categories, catalog } = data;
  
  await db.transaction(async (tx) => {
    // Remove stale local rows that no longer exist on the server
    // (e.g. empty leftover categories from an old seed). Foreign keys are
    // OFF in SQLite by default, so we clean up references explicitly.
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const serverCatIds = categories.map((c: any) => c.id);
      const localCats = await tx.select().from(schema.zekrCategories);
      const staleCatIds = localCats
        .map((c) => c.id)
        .filter((id) => !serverCatIds.includes(id));

      if (staleCatIds.length > 0) {
        // Null out task references to stale categories (mirrors ON DELETE SET NULL)
        for (const staleId of staleCatIds) {
          await tx
            .update(schema.zekrTasks)
            .set({ categoryId: null })
            .where(eq(schema.zekrTasks.categoryId, staleId));
        }
        await tx
          .delete(schema.zekrCatalog)
          .where(notInArray(schema.zekrCatalog.categoryId, serverCatIds));
        await tx
          .delete(schema.zekrCategories)
          .where(notInArray(schema.zekrCategories.id, serverCatIds));
      }
    }

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
      // Remove duas that no longer exist on the server
      if (catalog.length > 0) {
        const serverDuaIds = catalog.map((d: any) => d.id);
        const localDuas = await tx.select({ id: schema.zekrCatalog.id }).from(schema.zekrCatalog);
        const staleDuaIds = localDuas.map((d) => d.id).filter((id) => !serverDuaIds.includes(id));

        if (staleDuaIds.length > 0) {
          // Null out task references to stale duas (mirrors ON DELETE SET NULL)
          for (const staleId of staleDuaIds) {
            await tx
              .update(schema.zekrTasks)
              .set({ zekrId: null })
              .where(eq(schema.zekrTasks.zekrId, staleId));
          }
          await tx
            .delete(schema.zekrCatalog)
            .where(notInArray(schema.zekrCatalog.id, serverDuaIds));
        }
      }

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

    // Mark this catalog version as synced
    await tx
      .insert(schema.syncState)
      .values({ key: 'zekr_catalog_version', value: ZEKR_CATALOG_VERSION })
      .onConflictDoUpdate({
        target: schema.syncState.key,
        set: { value: ZEKR_CATALOG_VERSION },
      });
  });
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
                          updatedAt: new Date().toISOString(),
                          deletedAt: null,
                        })
                        .onConflictDoUpdate({
                          target: schema.lectures.id,
                          set: {
                            subjectId: subj.id,
                            name: lec.name ?? '',
                            description: lec.description ?? '',
                            updatedAt: new Date().toISOString(),
                            deletedAt: null,
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
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: schema.lectures.id,
        set: {
          subjectId: lecture.subjectId ?? lecture.subject?.id ?? '',
          name: lecture.name ?? '',
          description: lecture.description ?? '',
          updatedAt: new Date().toISOString(),
          deletedAt: null,
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
            localFilePath: v.localFilePath,
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          })
          .onConflictDoUpdate({
            target: schema.lectureVideos.id,
            set: {
              sourceName: v.sourceName ?? '',
              url: v.url ?? '',
              duration: v.duration ?? 0,
              localFilePath: v.localFilePath,
              updatedAt: new Date().toISOString(),
              deletedAt: null,
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
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          })
          .onConflictDoUpdate({
            target: schema.lectureFiles.id,
            set: {
              sourceName: f.sourceName ?? '',
              fileUrl: f.fileUrl ?? '',
              fileType: f.fileType ?? 'pdf',
              updatedAt: new Date().toISOString(),
              deletedAt: null,
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
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          })
          .onConflictDoUpdate({
            target: schema.questions.id,
            set: {
              lectureId: lecture.id,
              createdBy: q.createdBy ?? null,
              questionText: q.questionText ?? q.question_text ?? '',
              explanation: q.explanation ?? '',
              source: q.source ?? 'manual',
              updatedAt: new Date().toISOString(),
              deletedAt: null,
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

