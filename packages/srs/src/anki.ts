/**
 * Anki-style spaced repetition scheduler (FSRS predecessor — classic Anki SM-2+).
 *
 * Faithful port of Anki's scheduler semantics (ankitects/anki `rslib/src/scheduler`):
 *  - 4 ratings: again / hard / good / easy
 *  - Card states: new → learning → review ⇄ relearning
 *  - Learning steps: [1m, 10m] (default), relearning steps: [10m]
 *  - Ease is stored as integer percentage points (250 = 250% = 2.5)
 *  - Ease is NOT touched during learning/relearning (only in review state)
 *
 * Pure functions only — no I/O, no Date.now() inside (now is passed in), so the
 * same module runs on mobile (SQLite), API (Postgres), and in tests.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/** Full scheduling state of one reviewable item (mirrors DB columns). */
export interface CardStateData {
  state: CardState;
  /** Index into LEARNING_STEPS / RELEARNING_STEPS; null when state === 'review'. */
  currentStepIndex: number | null;
  /** Current inter-review interval in days (0 while in learning). */
  interval: number;
  /** Ease as integer percentage points: 250 = 250%. */
  easeFactor: number;
  /** Total successful reviews (graduations + steps passed). */
  repetitionCount: number;
  /** Times the card was lapsed (forgot in review state). */
  lapses: number;
}

/** Result of applying a rating to a card. */
export interface SchedulerResult {
  state: CardState;
  currentStepIndex: number | null;
  interval: number;
  easeFactor: number;
  repetitionCount: number;
  lapses: number;
  /** Milliseconds from `now` until the card is due again. */
  dueInMs: number;
}

// ─── Config (Anki deck defaults, per user spec) ────────────────────────────────

/** Learning steps in seconds. Anki default: [60, 600] = 1m, 10m. */
export const LEARNING_STEPS: readonly number[] = [60, 600];

/** Relearning steps in seconds. Anki default: [600] = 10m. */
export const RELEARNING_STEPS: readonly number[] = [600];

/** Interval (days) granted when graduating learning via "Good". */
export const GRADUATING_INTERVAL_GOOD = 1;

/** Interval (days) granted when graduating learning via "Easy". */
export const GRADUATING_INTERVAL_EASY = 4;

/** Initial ease as percentage points (Anki default 250%). */
export const DEFAULT_EASE_FACTOR = 250;

/** Minimum ease as percentage points (Anki floor 130%). */
export const MIN_EASE_FACTOR = 130;

/** Global interval modifier as a percentage (100 = no change). */
export const INTERVAL_MODIFIER = 100;

/** Easy bonus as a percentage (130 = easy interval is 1.3× the good interval). */
export const EASY_BONUS = 130;

/** Hard multiplier as a percentage (120 = hard interval is 1.2× the good interval). */
export const HARD_INTERVAL_FACTOR = 120;

/** Percentage of the old interval kept after a lapse (spec: 50%). */
export const LAPSE_INTERVAL_PERCENT = 50;

/** Minimum interval (days) after a lapse. */
export const MIN_LAPSE_INTERVAL = 1;

/** Ease deltas in percentage points, applied only in review state. */
export const EASE_DELTA_AGAIN = -20;
export const EASE_DELTA_HARD = -15;
export const EASE_DELTA_EASY = 15;

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86400;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampEase(ease: number): number {
  return Math.max(MIN_EASE_FACTOR, ease);
}

function daysToMs(days: number): number {
  return days * SECONDS_PER_DAY * MS_PER_SECOND;
}

function stepsFor(state: CardState): readonly number[] {
  return state === 'relearning' ? RELEARNING_STEPS : LEARNING_STEPS;
}

/**
 * Anki's `learning_strategies::hard_delay`:
 *  - On the FIRST step: average of the first two steps (e.g. (60 + 600) / 2 = 330s).
 *  - Single-step config: 1.5× the step, capped at step + 1 day.
 *  - Otherwise: same step again.
 */
function hardDelaySecs(state: CardState, stepIndex: number): number {
  const steps = stepsFor(state);
  if (stepIndex === 0) {
    if (steps.length >= 2) {
      return Math.round((steps[0] + steps[1]) / 2);
    }
    // Single step: 1.5×, capped at step + 1 day
    return Math.min(Math.round(steps[0] * 1.5), steps[0] + SECONDS_PER_DAY);
  }
  return steps[Math.min(stepIndex, steps.length - 1)];
}

/** Apply the global interval modifier and round to a whole number of days (min 1). */
function nextReviewIntervalDays(interval: number, easeFactor: number): number {
  const modified = interval * (INTERVAL_MODIFIER / 100);
  return Math.max(1, Math.round(modified));
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Apply a rating to a card and return its new scheduling state.
 *
 * @param rating  Student's self-rating.
 * @param card    Current scheduling state (as stored in the DB).
 * @param now    Reference time (ms epoch) — the card is due `dueInMs` after this.
 */
export function scheduleCard(
  rating: Rating,
  card: CardStateData,
  now: number = Date.now(),
): SchedulerResult {
  // A 'new' card enters learning at step 0 on its first rating.
  const state: CardState = card.state === 'new' ? 'learning' : card.state;
  const steps = stepsFor(state);
  const stepIndex = card.currentStepIndex ?? 0;

  const base = {
    interval: card.interval,
    easeFactor: card.easeFactor,
    repetitionCount: card.repetitionCount,
    lapses: card.lapses,
  };

  // ── Learning / Relearning ──────────────────────────────────────────────────
  if (state === 'learning' || state === 'relearning') {
    switch (rating) {
      case 'again': {
        // Back to step 0; ease untouched in learning phases.
        const delay = steps[0];
        return {
          ...base,
          state,
          currentStepIndex: 0,
          dueInMs: delay * MS_PER_SECOND,
        };
      }
      case 'hard': {
        // Stay on the same step with Anki's hard delay.
        const delay = hardDelaySecs(state, stepIndex);
        return {
          ...base,
          state,
          currentStepIndex: stepIndex,
          dueInMs: delay * MS_PER_SECOND,
        };
      }
      case 'good': {
        const nextStep = stepIndex + 1;
        if (nextStep < steps.length) {
          // Advance to the next step.
          return {
            ...base,
            state,
            currentStepIndex: nextStep,
            dueInMs: steps[nextStep] * MS_PER_SECOND,
          };
        }
        // Graduate: learning → review at 1 day; relearning → review keeping the
        // lapse-reduced interval already stored in `card.interval`.
        const gradInterval =
          state === 'learning'
            ? GRADUATING_INTERVAL_GOOD
            : Math.max(MIN_LAPSE_INTERVAL, card.interval);
        return {
          state: 'review',
          currentStepIndex: null,
          interval: gradInterval,
          easeFactor: base.easeFactor,
          repetitionCount: base.repetitionCount + 1,
          lapses: base.lapses,
          dueInMs: daysToMs(gradInterval),
        };
      }
      case 'easy': {
        // Easy always graduates immediately.
        // Learning → 4 days. Relearning → interval + 1 day (Anki answer_easy).
        const gradInterval =
          state === 'learning'
            ? GRADUATING_INTERVAL_EASY
            : Math.max(MIN_LAPSE_INTERVAL, card.interval) + 1;
        return {
          state: 'review',
          currentStepIndex: null,
          interval: gradInterval,
          easeFactor: base.easeFactor,
          repetitionCount: base.repetitionCount + 1,
          lapses: base.lapses,
          dueInMs: daysToMs(gradInterval),
        };
      }
    }
  }

  // ── Review state ───────────────────────────────────────────────────────────
  switch (rating) {
    case 'again': {
      // Lapse: ease −20 (floor 130), interval × 50% (min 1 day), → relearning step 0.
      const newEase = clampEase(card.easeFactor + EASE_DELTA_AGAIN);
      const newInterval = Math.max(
        MIN_LAPSE_INTERVAL,
        Math.round(card.interval * (LAPSE_INTERVAL_PERCENT / 100)),
      );
      return {
        state: 'relearning',
        currentStepIndex: 0,
        interval: newInterval,
        easeFactor: newEase,
        repetitionCount: base.repetitionCount,
        lapses: card.lapses + 1,
        dueInMs: RELEARNING_STEPS[0] * MS_PER_SECOND,
      };
    }
    case 'hard': {
      const newEase = clampEase(card.easeFactor + EASE_DELTA_HARD);
      const newInterval = nextReviewIntervalDays(
        card.interval * (HARD_INTERVAL_FACTOR / 100),
        newEase,
      );
      return {
        state: 'review',
        currentStepIndex: null,
        interval: newInterval,
        easeFactor: newEase,
        repetitionCount: base.repetitionCount + 1,
        lapses: card.lapses,
        dueInMs: daysToMs(newInterval),
      };
    }
    case 'good': {
      const newInterval = nextReviewIntervalDays(
        card.interval * (card.easeFactor / 100),
        card.easeFactor,
      );
      return {
        state: 'review',
        currentStepIndex: null,
        interval: newInterval,
        easeFactor: card.easeFactor,
        repetitionCount: base.repetitionCount + 1,
        lapses: card.lapses,
        dueInMs: daysToMs(newInterval),
      };
    }
    case 'easy': {
      const newEase = clampEase(card.easeFactor + EASE_DELTA_EASY);
      const newInterval = nextReviewIntervalDays(
        card.interval * (card.easeFactor / 100) * (EASY_BONUS / 100),
        newEase,
      );
      return {
        state: 'review',
        currentStepIndex: null,
        interval: newInterval,
        easeFactor: newEase,
        repetitionCount: base.repetitionCount + 1,
        lapses: card.lapses,
        dueInMs: daysToMs(newInterval),
      };
    }
  }
}

/** Initial scheduling state for a brand-new card (due immediately, first learning step). */
export function newCard(): CardStateData {
  return {
    state: 'new',
    currentStepIndex: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitionCount: 0,
    lapses: 0,
  };
}

/** Human-readable next-review preview, e.g. "<1m", "10m", "3d" — for button labels. */
export function formatDueIn(dueInMs: number): string {
  const totalMinutes = Math.round(dueInMs / (MS_PER_SECOND * 60));
  if (totalMinutes < 1) return '<1m';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.round(totalHours / 24);
  return `${days}d`;
}
