import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from '../db/schema';

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

  expoDb.execSync(`
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
      item_type TEXT NOT NULL,
      interval INTEGER NOT NULL DEFAULT 0,
      ease_factor INTEGER NOT NULL DEFAULT 2.5,
      repetition_count INTEGER NOT NULL DEFAULT 0,
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
      UNIQUE(task_type, start_time, end_time)
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
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      zekr_id TEXT,
      custom_zekr_text TEXT,
      zekr_count INTEGER,
      zekr_achieved_count INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wird_tasks (
      task_id TEXT PRIMARY KEY,
      wird_mode TEXT NOT NULL DEFAULT 'daily',
      start_aya INTEGER,
      end_aya INTEGER,
      page_count INTEGER,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
  `);
};

import { seedInitialSqliteData } from './seedData';

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
    DROP TABLE IF EXISTS work_tasks;
    DROP TABLE IF EXISTS study_tasks;
  `);
  initializeDatabase();
};
