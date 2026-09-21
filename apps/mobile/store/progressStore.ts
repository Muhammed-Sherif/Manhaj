import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '../services/database';
import { syncState } from '../db/schema';

const PROGRESS_KEY = 'last_progress';

interface LastProgress {
  moduleId: string | null;
  moduleName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  studyUnitId: string | null;
  studyUnitName: string | null;
  questionId: string | null;
  questionIndex: number;
  totalQuestions: number;
  lastStudied: string | null;
}

interface ProgressState {
  lastProgress: LastProgress | null;
  setProgress: (progress: Omit<LastProgress, 'lastStudied'>) => Promise<void>;
  clearProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
}

// ── Drizzle helpers (syncState table from db/schema.ts) ─────────────────────

function readFromSQLite(): LastProgress | null {
  try {
    const rows = db
      .select()
      .from(syncState)
      .where(eq(syncState.key, PROGRESS_KEY))
      .all();
    if (!rows.length) return null;
    const p = JSON.parse(rows[0].value) as Partial<LastProgress>;
    return {
      moduleId: p.moduleId ?? null,
      moduleName: p.moduleName ?? null,
      subjectId: p.subjectId ?? null,
      subjectName: p.subjectName ?? null,
      studyUnitId: p.studyUnitId ?? null,
      studyUnitName: p.studyUnitName ?? null,
      questionId: p.questionId ?? null,
      questionIndex: p.questionIndex ?? 0,
      totalQuestions: p.totalQuestions ?? 0,
      lastStudied: p.lastStudied ?? null,
    };
  } catch {
    return null;
  }
}

function writeToSQLite(progress: LastProgress): void {
  db.insert(syncState)
    .values({ key: PROGRESS_KEY, value: JSON.stringify(progress) })
    .onConflictDoUpdate({
      target: syncState.key,
      set: { value: JSON.stringify(progress) },
    })
    .run();
}

function deleteFromSQLite(): void {
  db.delete(syncState).where(eq(syncState.key, PROGRESS_KEY)).run();
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useProgressStore = create<ProgressState>((set) => ({
  lastProgress: null,

  setProgress: async (progress) => {
    const progressWithTimestamp: LastProgress = {
      ...progress,
      lastStudied: new Date().toISOString(),
    };
    writeToSQLite(progressWithTimestamp);
    set({ lastProgress: progressWithTimestamp });
  },

  clearProgress: async () => {
    deleteFromSQLite();
    set({ lastProgress: null });
  },

  loadProgress: async () => {
    try {
      const loaded = readFromSQLite();
      if (loaded) {
        set({ lastProgress: loaded });
      }
    } catch (error) {
      console.error('Failed to load progress from SQLite:', error);
    }
  },
}));

