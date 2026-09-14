import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '../db/schema.js';

const DB_NAME = 'manhaj.db';

// Synchronously open SQLite database with Expo SQLite
export const expoDb = SQLite.openDatabaseSync(DB_NAME);

// Drizzle ORM client with complete relational schema
export const db = drizzle(expoDb, { schema });

// Initialize database tables if not already created
export const initializeDatabase = () => {
  expoDb.execSync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS terms (
      id TEXT PRIMARY KEY,
      grade_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      term_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS lectures (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS lecture_videos (
      id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      url TEXT NOT NULL,
      duration INTEGER NOT NULL,
      local_file_path TEXT,
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS lecture_files (
      id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      lecture_id TEXT,
      created_by TEXT,
      question_text TEXT NOT NULL,
      explanation TEXT NOT NULL,
      source TEXT NOT NULL,
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE SET NULL
    );
    
    CREATE TABLE IF NOT EXISTS choices (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      choice_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      choice_id TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, question_id)
    );
    
    CREATE TABLE IF NOT EXISTS flags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      operation TEXT NOT NULL DEFAULT 'add',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, question_id)
    );
    
    CREATE TABLE IF NOT EXISTS video_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lecture_video_id TEXT NOT NULL,
      position_seconds INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      UNIQUE(user_id, lecture_video_id)
    );
    
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  try {
    expoDb.execSync(`ALTER TABLE questions ADD COLUMN question_type TEXT NOT NULL DEFAULT 'mcq';`);
  } catch (e) {
    // Ignore error if column already exists
  }

  const secondBatch = `
    CREATE TABLE IF NOT EXISTS mcq_questions (
      question_id TEXT PRIMARY KEY,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS written_questions (
      question_id TEXT PRIMARY KEY,
      written_answer TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviewable_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'new',
      current_step_index INTEGER,
      interval INTEGER NOT NULL DEFAULT 0,
      ease_factor INTEGER NOT NULL DEFAULT 250,
      repetition_count INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL,
      last_reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS question_reviewable (
      reviewable_id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      FOREIGN KEY (reviewable_id) REFERENCES reviewable_items(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS case_items (
      id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_reviewable (
      reviewable_id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      FOREIGN KEY (reviewable_id) REFERENCES reviewable_items(id) ON DELETE CASCADE,
      FOREIGN KEY (case_id) REFERENCES case_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_items (
      id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      source_question_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_reviewable (
      reviewable_id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      FOREIGN KEY (reviewable_id) REFERENCES reviewable_items(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES note_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'once',
      start_time TEXT,
      end_time TEXT,
      consumed_time INTEGER,
      estimated_time INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      achieved_from TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(task_type, start_time, end_time, created_at)
    );

    CREATE TABLE IF NOT EXISTS zekr_categories (
      id TEXT PRIMARY KEY,
      category_number INTEGER NOT NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zekr_catalog (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      dua_number INTEGER NOT NULL,
      slug TEXT,
      transliteration TEXT,
      text_en TEXT NOT NULL,
      text_ar TEXT NOT NULL,
      virtue TEXT,
      source TEXT,
      repeat_count INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES zekr_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS zekr_tasks (
      task_id TEXT PRIMARY KEY,
      category_id TEXT,
      zekr_id TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES zekr_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (zekr_id) REFERENCES zekr_catalog(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS quran_chapters (
      id INTEGER PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      verses_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quran_verses (
      id TEXT PRIMARY KEY,
      chapter_id INTEGER NOT NULL,
      aya_number INTEGER NOT NULL,
      page INTEGER NOT NULL,
      text_ar TEXT NOT NULL,
      FOREIGN KEY (chapter_id) REFERENCES quran_chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wird_tasks (
      task_id TEXT PRIMARY KEY,
      wird_mode TEXT NOT NULL DEFAULT 'daily',
      start_verse_id TEXT,
      end_verse_id TEXT,
      start_page INTEGER,
      end_page INTEGER,
      last_achieved_page INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (start_verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE,
      FOREIGN KEY (end_verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS work_tasks (
      task_id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      project_name TEXT NOT NULL,
      description TEXT,
      link TEXT,
      cost INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_tasks (
      task_id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `;
  
  const statements = secondBatch.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try {
      expoDb.execSync(stmt + ';');
    } catch (err) {
      console.warn('Failed to execute statement:', stmt, err);
    }
  }

  // ── Migrations for existing installs ──────────────────────────────────────
  // Old wird_tasks used start_aya/end_aya/page_count; rebuild it to match the
  // current Drizzle schema (start_verse_id/end_verse_id/start_page/end_page/last_achieved_page).
  const wirdColumns = expoDb
    .getAllSync(`PRAGMA table_info(wird_tasks)`) as Array<{ name: string }>;
  const wirdColumnNames = wirdColumns.map((c) => c.name);
  if (wirdColumnNames.length > 0 && !wirdColumnNames.includes('start_verse_id')) {
    expoDb.execSync(`
      CREATE TABLE wird_tasks_new (
        task_id TEXT PRIMARY KEY,
        wird_mode TEXT NOT NULL DEFAULT 'daily',
        start_verse_id TEXT,
        end_verse_id TEXT,
        start_page INTEGER,
        end_page INTEGER,
        last_achieved_page INTEGER,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (start_verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE,
        FOREIGN KEY (end_verse_id) REFERENCES quran_verses(id) ON DELETE CASCADE
      );
      INSERT INTO wird_tasks_new (task_id, wird_mode, start_page, end_page, last_achieved_page)
        SELECT task_id, wird_mode, NULL, NULL, NULL FROM wird_tasks;
      DROP TABLE wird_tasks;
      ALTER TABLE wird_tasks_new RENAME TO wird_tasks;
    `);
  }

  // ── Migration: tasks used UNIQUE(task_type, start_time, end_time), which blocked
  // creating a second task of the same type in the same time window. Rebuild the
  // table with created_at included so each insert is distinct. (CREATE TABLE IF
  // NOT EXISTS cannot change the constraint of an existing table.)
  const tasksTableSqlRows = expoDb.getAllSync(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'`
  ) as Array<{ sql: string }>;
  const tasksTableSql = tasksTableSqlRows[0]?.sql ?? '';
  if (tasksTableSql.length > 0 && !tasksTableSql.includes('end_time, created_at')) {
    // Disable FKs during the rebuild: DROP TABLE runs an implicit DELETE FROM,
    // which would cascade-delete zekr_tasks/wird_tasks/work_tasks/study_tasks.
    const fkRows = expoDb.getAllSync(`PRAGMA foreign_keys`) as Array<{ foreign_keys: number }>;
    const fkWasOn = fkRows[0]?.foreign_keys === 1;
    expoDb.execSync(`PRAGMA foreign_keys = OFF;`);
    try {
      expoDb.execSync(`
        CREATE TABLE tasks_new (
          id TEXT PRIMARY KEY,
          task_type TEXT NOT NULL,
          recurrence TEXT NOT NULL DEFAULT 'once',
          start_time TEXT,
          end_time TEXT,
          consumed_time INTEGER,
          estimated_time INTEGER,
          status TEXT NOT NULL DEFAULT 'pending',
          achieved_from TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(task_type, start_time, end_time, created_at)
        );
        INSERT INTO tasks_new (id, task_type, recurrence, start_time, end_time, consumed_time, estimated_time, status, achieved_from, created_at)
          SELECT id, task_type, recurrence, start_time, end_time, consumed_time, estimated_time, status, achieved_from, created_at
          FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
      `);
    } finally {
      if (fkWasOn) expoDb.execSync(`PRAGMA foreign_keys = ON;`);
    }
  }

  // ── Migration: zekr_tasks was 1-to-many (one row per dua with count tracking).
  // Rebuild it as a single row per task: exactly one of category_id / zekr_id is
  // set, no partial progress fields. Old rows are dropped (progress is not
  // representable in the new model).
  const zekrTableSqlRows = expoDb.getAllSync(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'zekr_tasks'`
  ) as Array<{ sql: string }>;
  const zekrTableSql = zekrTableSqlRows[0]?.sql ?? '';
  if (zekrTableSql.length > 0 && !zekrTableSql.includes('category_id')) {
    expoDb.execSync(`
      DROP TABLE IF EXISTS zekr_tasks;
    `);
    // Recreate with the new single-row layout
    expoDb.execSync(`
      CREATE TABLE zekr_tasks (
        task_id TEXT PRIMARY KEY,
        category_id TEXT,
        zekr_id TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES zekr_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (zekr_id) REFERENCES zekr_catalog(id) ON DELETE SET NULL
      );
    `);
  }

  // ── Migration: reviewable_items was created without user_id (and without
  // state/current_step_index/lapses, with ease_factor defaulting to 2.5 instead
  // of 250). Each student needs independent SRS progress for the same
  // question/case/note, so add the missing columns. NOT NULL columns require a
  // DEFAULT in ALTER TABLE ADD COLUMN. (No FK to a users table on mobile — the
  // logged-in user id comes from the auth store; Postgres has the real FK.)
  const reviewableColumns = expoDb
    .getAllSync(`PRAGMA table_info(reviewable_items)`) as Array<{ name: string }>;
  const reviewableColumnNames = reviewableColumns.map((c) => c.name);
  if (reviewableColumnNames.length > 0 && !reviewableColumnNames.includes('user_id')) {
    expoDb.execSync(`
      ALTER TABLE reviewable_items ADD COLUMN user_id TEXT NOT NULL DEFAULT 'temp_user_id';
      ALTER TABLE reviewable_items ADD COLUMN state TEXT NOT NULL DEFAULT 'new';
      ALTER TABLE reviewable_items ADD COLUMN current_step_index INTEGER;
      ALTER TABLE reviewable_items ADD COLUMN lapses INTEGER NOT NULL DEFAULT 0;
      UPDATE reviewable_items SET ease_factor = 250 WHERE ease_factor < 100;
    `);
  }
};

// import { seedInitialSqliteData } from './seedData';

// Run schema initialization once on import
initializeDatabase();
// seedInitialSqliteData(expoDb);

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  return expoDb;
};

export const clearDatabase = async () => {
  expoDb.execSync(`
    DROP TABLE IF EXISTS grades;
    DROP TABLE IF EXISTS terms;
    DROP TABLE IF EXISTS modules;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS lectures;
    DROP TABLE IF EXISTS lecture_videos;
    DROP TABLE IF EXISTS lecture_files;
    DROP TABLE IF EXISTS questions;
    DROP TABLE IF EXISTS choices;
    DROP TABLE IF EXISTS attempts;
    DROP TABLE IF EXISTS flags;
    DROP TABLE IF EXISTS video_progress;
    DROP TABLE IF EXISTS sync_state;
    DROP TABLE IF EXISTS reviewable_items;
    DROP TABLE IF EXISTS question_reviewable;
    DROP TABLE IF EXISTS case_items;
    DROP TABLE IF EXISTS case_reviewable;
    DROP TABLE IF EXISTS note_items;
    DROP TABLE IF EXISTS note_reviewable;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS zekr_tasks;
    DROP TABLE IF EXISTS wird_tasks;
    DROP TABLE IF EXISTS quran_verses;
    DROP TABLE IF EXISTS quran_chapters;
    DROP TABLE IF EXISTS work_tasks;
    DROP TABLE IF EXISTS study_tasks;
  `);
  initializeDatabase();
};
