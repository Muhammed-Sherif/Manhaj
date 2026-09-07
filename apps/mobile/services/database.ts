import * as SQLite from 'expo-sqlite';

const DB_NAME = 'manhaj.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase();
  return db;
};

const initializeDatabase = async () => {
  if (!db) return;

  // Create tables matching backend schema
  await db.execAsync(`
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

  const flagColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(flags)');
  if (!flagColumns.some((column) => column.name === 'operation')) {
    await db.execAsync("ALTER TABLE flags ADD COLUMN operation TEXT NOT NULL DEFAULT 'add'");
  }
};

export const clearDatabase = async () => {
  if (!db) return;
  await db.execAsync(`
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
  `);
  await initializeDatabase();
};
