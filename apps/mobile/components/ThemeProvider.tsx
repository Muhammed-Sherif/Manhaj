/**
 * ThemeProvider
 *
 * Thin wrapper that:
 * 1. Loads the user's persisted theme choice from SQLite on mount.
 * 2. Applies it via NativeWind's `colorScheme.set()` — which is the single
 *    source of truth for dark/light mode. No custom context, no Zustand store.
 *
 * Consumers should use NativeWind's own `useColorScheme()` hook directly:
 *   import { useColorScheme } from 'nativewind';
 *   const { colorScheme, setColorScheme } = useColorScheme();
 *
 * `setColorScheme` wraps `colorScheme.set()` + SQLite persistence so the
 * preference survives app restarts.
 */
import { useEffect } from 'react';
import { colorScheme as nwColorScheme } from 'nativewind';
import { eq } from 'drizzle-orm';
import { db } from '../services/database';
import { syncState } from '../db/schema';

const THEME_KEY = 'user_theme';
type ThemeChoice = 'light' | 'dark' | 'system';

// ── SQLite helpers (sync_state table) ───────────────────────────────────────

function loadPersistedTheme(): ThemeChoice {
  try {
    const rows = db
      .select()
      .from(syncState)
      .where(eq(syncState.key, THEME_KEY))
      .all();
    const val = rows[0]?.value;
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {}
  return 'system';
}

function persistTheme(choice: ThemeChoice): void {
  try {
    db.insert(syncState)
      .values({ key: THEME_KEY, value: choice })
      .onConflictDoUpdate({
        target: syncState.key,
        set: { value: choice },
      })
      .run();
  } catch {}
}

// ── Public helper consumed by settings screen ────────────────────────────────

/** Persist + apply a theme choice. Call this from the settings toggle. */
export function setColorScheme(choice: ThemeChoice): void {
  persistTheme(choice);
  nwColorScheme.set(choice);
}

/** Read the user's saved preference (not the resolved system value). */
export function getPersistedColorScheme(): ThemeChoice {
  return loadPersistedTheme();
}

// ── Provider component ────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Restore the user's saved preference on every cold start
    const saved = loadPersistedTheme();
    nwColorScheme.set(saved);
  }, []);

  // No context value needed — consumers read from nativewind directly
  return <>{children}</>;
}

export default ThemeProvider;

