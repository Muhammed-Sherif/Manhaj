import { getDatabase } from './database';
import { getContentSync } from '@manhaj/api-client';
import type { GetContentSync200 } from '@manhaj/api-client';

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

// Sync content from API to local SQLite
export const syncContent = async (contentData: ContentSyncData): Promise<void> => {
  const db = await getDatabase();

  // Begin transaction for atomic sync
  await db.execAsync('BEGIN TRANSACTION');

  try {
    // Sync grades
    for (const grade of contentData.grades) {
      await db.runAsync(`
        INSERT OR REPLACE INTO grades (id, name, description)
        VALUES (?, ?, ?)
      `, [grade.id, grade.name, grade.description]);
    }

    // Sync terms
    for (const term of contentData.terms) {
      await db.runAsync(`
        INSERT OR REPLACE INTO terms (id, grade_id, name, description)
        VALUES (?, ?, ?, ?)
      `, [term.id, term.gradeId, term.name, term.description]);
    }

    // Sync modules
    for (const module of contentData.modules) {
      await db.runAsync(`
        INSERT OR REPLACE INTO modules (id, term_id, name, description)
        VALUES (?, ?, ?, ?)
      `, [module.id, module.termId, module.name, module.description]);
    }

    // Sync subjects
    for (const subject of contentData.subjects) {
      await db.runAsync(`
        INSERT OR REPLACE INTO subjects (id, module_id, name)
        VALUES (?, ?, ?)
      `, [subject.id, subject.moduleId, subject.name]);
    }

    // Sync lectures
    for (const lecture of contentData.lectures) {
      await db.runAsync(`
        INSERT OR REPLACE INTO lectures (id, subject_id, name, description)
        VALUES (?, ?, ?, ?)
      `, [lecture.id, lecture.subjectId, lecture.name, lecture.description]);
    }

    // Sync questions
    for (const question of contentData.questions) {
      await db.runAsync(`
        INSERT OR REPLACE INTO questions (id, lecture_id, created_by, question_text, explanation, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        question.id,
        question.lectureId || null,
        question.createdBy || null,
        question.questionText,
        question.explanation,
        question.source,
      ]);
    }

    // Sync choices
    for (const choice of contentData.choices) {
      await db.runAsync(`
        INSERT OR REPLACE INTO choices (id, question_id, choice_text, is_correct)
        VALUES (?, ?, ?, ?)
      `, [choice.id, choice.questionId, choice.choiceText, choice.isCorrect ? 1 : 0]);
    }

    // Sync lecture videos
    for (const video of contentData.lectureVideos) {
      await db.runAsync(`
        INSERT OR REPLACE INTO lecture_videos (id, lecture_id, source_name, url, duration)
        VALUES (?, ?, ?, ?, ?)
      `, [video.id, video.lectureId, video.sourceName, video.url, video.duration]);
    }

    // Sync lecture files
    for (const file of contentData.lectureFiles) {
      await db.runAsync(`
        INSERT OR REPLACE INTO lecture_files (id, lecture_id, source_name, file_url, file_type)
        VALUES (?, ?, ?, ?, ?)
      `, [file.id, file.lectureId, file.sourceName, file.fileUrl, file.fileType]);
    }

    // Store sync cursor
    if (contentData.nextCursor) {
      await db.runAsync(`
        INSERT OR REPLACE INTO sync_state (key, value)
        VALUES ('last_sync_cursor', ?)
      `, [contentData.nextCursor]);
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
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

export const getAutoDownloadEnabled = async (): Promise<boolean> => {
  const db = await getDatabase();
  const value = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = 'auto_download'"
  );
  return value?.value === 'true';
};

export const setAutoDownloadEnabled = async (enabled: boolean): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_state (key, value) VALUES ('auto_download', ?)",
    [enabled ? 'true' : 'false']
  );
};

// Get last sync cursor
export const getLastSyncCursor = async (): Promise<string | null> => {
  const db = await getDatabase();
  const result = await db.getFirstAsync(`
    SELECT value FROM sync_state WHERE key = 'last_sync_cursor'
  `);
  return result ? (result as any).value : null;
};

// Get content for browse screen from SQLite
export const getGrades = async () => {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM grades ORDER BY name');
};

export const getTermsByGrade = async (gradeId: string) => {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT * FROM terms WHERE grade_id = ? ORDER BY name
  `, [gradeId]);
};

export const getModulesByTerm = async (termId: string) => {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT * FROM modules WHERE term_id = ? ORDER BY name
  `, [termId]);
};

export const getSubjectsByModule = async (moduleId: string) => {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT * FROM subjects WHERE module_id = ? ORDER BY name
  `, [moduleId]);
};

export const getLecturesBySubject = async (subjectId: string) => {
  const db = await getDatabase();
  return db.getAllAsync(`
    SELECT * FROM lectures WHERE subject_id = ? ORDER BY name
  `, [subjectId]);
};

export const getLectureDetails = async (lectureId: string) => {
  const db = await getDatabase();

  const lecture = await db.getFirstAsync(`
    SELECT * FROM lectures WHERE id = ?
  `, [lectureId]);

  if (!lecture) return null;

  const videos = await db.getAllAsync(`
    SELECT * FROM lecture_videos WHERE lecture_id = ?
  `, [lectureId]);

  const files = await db.getAllAsync(`
    SELECT * FROM lecture_files WHERE lecture_id = ?
  `, [lectureId]);

  const questions = await db.getAllAsync(`
    SELECT * FROM questions WHERE lecture_id = ?
  `, [lectureId]);

  return {
    ...(lecture as any),
    videos,
    files,
    questions,
  };
};

export const getQuestionWithChoices = async (questionId: string) => {
  const db = await getDatabase();

  const question = await db.getFirstAsync(`
    SELECT * FROM questions WHERE id = ?
  `, [questionId]);

  if (!question) return null;

  const choices = await db.getAllAsync(`
    SELECT * FROM choices WHERE question_id = ?
  `, [questionId]);

  return {
    ...(question as any),
    choices,
  };
};
