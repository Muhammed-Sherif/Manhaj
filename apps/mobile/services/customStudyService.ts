import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { newCard, scheduleCard, type CardStateData, type Rating } from '@manhaj/srs/src/anki';
import { db } from './database';
import * as schema from '../db/schema';

/**
 * Custom Study — the student-facing launcher for an ad-hoc SRS session.
 *
 * Every filter composes with AND: the queue is the union of one query per selected
 * content type, each already narrowed by due-date, source tag, and subject/lecture
 * scope. Nothing here writes to the DB except `gradeStudyCard`; the setup screen can
 * therefore be reopened and re-filtered freely without side effects.
 */

// ─── Filters ──────────────────────────────────────────────────────────────────

/**
 * The student thinks in four content types; the database only knows three
 * `reviewable_items.item_type` values. Notes and summaries share `'note'` and are told
 * apart by `note_items.type`, which is why the split happens at query time rather than
 * in the stored item type.
 */
export const studyContentTypes = ['question', 'case', 'note', 'summary'] as const;
export type StudyContentType = (typeof studyContentTypes)[number];

/**
 * - `due` — only what the scheduler says is ready (the default SRS session).
 * - `all` — everything already tracked, regardless of due date. Ratings still run
 *   through the real scheduler, so a card studied early simply moves further out; this
 *   is extra practice, not a cram mode that leaves the schedule untouched.
 * - `all_including_new` — as `all`, plus content with no reviewable row yet. Its row is
 *   created on the first rating. Only questions realistically land here: cases and
 *   summaries are born with a reviewable row alongside them.
 */
export const studyDueScopes = ['due', 'all', 'all_including_new'] as const;
export type StudyDueScope = (typeof studyDueScopes)[number];

export type StudyScope =
  | { kind: 'all' }
  | { kind: 'subject'; subjectId: string }
  | { kind: 'lecture'; lectureId: string };

export interface CustomStudyFilters {
  contentTypes: StudyContentType[];
  dueScope: StudyDueScope;
  /** Empty means "don't filter on source" — not "match nothing". */
  questionSources: schema.QuestionSourceType[];
  scope: StudyScope;
}

export const DEFAULT_STUDY_FILTERS: CustomStudyFilters = {
  contentTypes: ['question', 'case', 'note', 'summary'],
  dueScope: 'due',
  questionSources: [],
  scope: { kind: 'all' },
};

// ─── Queue ────────────────────────────────────────────────────────────────────

export interface StudyCard {
  /** `reviewable_items.id`, or null when the content has never been reviewed. */
  reviewableId: string | null;
  itemType: 'question' | 'case' | 'note';
  /** The underlying content row (question / case_item / note_item). */
  data: any;
  lecture?: any;
  choices?: any[];
  writtenAnswer?: string | null;
  /** Scheduling state to hand to `scheduleCard`. */
  card: CardStateData;
  /** Null for never-reviewed content; used only for ordering. */
  nextReviewDate: string | null;
}

type ReviewableRow = {
  id: string;
  state: string;
  currentStepIndex: number | null;
  interval: number;
  easeFactor: number;
  repetitionCount: number;
  lapses: number;
  nextReviewDate: string;
};

const toCardState = (row: ReviewableRow): CardStateData => ({
  state: row.state as CardStateData['state'],
  currentStepIndex: row.currentStepIndex,
  interval: row.interval,
  easeFactor: row.easeFactor,
  repetitionCount: row.repetitionCount,
  lapses: row.lapses,
});

/**
 * Whether a piece of content belongs in the queue, and — for never-reviewed content —
 * whether this scope admits it at all.
 */
const isAdmitted = (
  reviewable: ReviewableRow | null,
  dueScope: StudyDueScope,
  nowStr: string,
): boolean => {
  if (!reviewable) return dueScope === 'all_including_new';
  // Dates are stored as ISO-8601, so string comparison is chronological.
  return dueScope !== 'due' || reviewable.nextReviewDate <= nowStr;
};

/** `null` means "every lecture"; an empty array means the scope matched nothing. */
async function resolveLectureIds(scope: StudyScope): Promise<string[] | null> {
  if (scope.kind === 'lecture') return [scope.lectureId];

  if (scope.kind === 'subject') {
    const rows = await db
      .select({ id: schema.lectures.id })
      .from(schema.lectures)
      .where(
        and(
          eq(schema.lectures.subjectId, scope.subjectId),
          isNull(schema.lectures.deletedAt),
        ),
      );
    return rows.map(row => row.id);
  }

  return null;
}

/**
 * Resolve the live reviewable row for each piece of content, keyed by content id.
 *
 * A junction row that survives while its reviewable row is tombstoned (or belongs to
 * another account on a shared device) resolves to nothing, and the content is treated
 * as never-reviewed rather than as due.
 */
async function loadReviewablesByContent(
  userId: string,
  links: { reviewableId: string; contentId: string }[],
): Promise<Map<string, ReviewableRow>> {
  const byContent = new Map<string, ReviewableRow>();
  if (links.length === 0) return byContent;

  const rows = await db
    .select({
      id: schema.reviewableItems.id,
      state: schema.reviewableItems.state,
      currentStepIndex: schema.reviewableItems.currentStepIndex,
      interval: schema.reviewableItems.interval,
      easeFactor: schema.reviewableItems.easeFactor,
      repetitionCount: schema.reviewableItems.repetitionCount,
      lapses: schema.reviewableItems.lapses,
      nextReviewDate: schema.reviewableItems.nextReviewDate,
    })
    .from(schema.reviewableItems)
    .where(
      and(
        eq(schema.reviewableItems.userId, userId),
        isNull(schema.reviewableItems.deletedAt),
        inArray(
          schema.reviewableItems.id,
          links.map(link => link.reviewableId),
        ),
      ),
    );

  const byId = new Map(rows.map(row => [row.id, row]));
  for (const link of links) {
    const row = byId.get(link.reviewableId);
    if (row) byContent.set(link.contentId, row);
  }
  return byContent;
}

async function questionCards(
  filters: CustomStudyFilters,
  userId: string,
  lectureIds: string[] | null,
  nowStr: string,
): Promise<StudyCard[]> {
  const conditions = [isNull(schema.questions.deletedAt)];

  if (lectureIds) conditions.push(inArray(schema.questions.lectureId, lectureIds));

  if (filters.questionSources.length > 0) {
    // A question matches when any chosen tag is still live on it. Tombstoned tags are
    // ignored so a retracted "previous exam" claim stops pulling the question in.
    const tagged = await db
      .selectDistinct({ questionId: schema.questionSources.questionId })
      .from(schema.questionSources)
      .where(
        and(
          isNull(schema.questionSources.deletedAt),
          inArray(schema.questionSources.sourceType, filters.questionSources),
        ),
      );

    if (tagged.length === 0) return [];
    conditions.push(
      inArray(
        schema.questions.id,
        tagged.map(row => row.questionId),
      ),
    );
  }

  const rows = await db
    .select()
    .from(schema.questions)
    .where(and(...conditions));
  if (rows.length === 0) return [];

  const links = await db
    .select()
    .from(schema.questionReviewable)
    .where(
      inArray(
        schema.questionReviewable.questionId,
        rows.map(row => row.id),
      ),
    );
  const reviewables = await loadReviewablesByContent(
    userId,
    links.map(link => ({ reviewableId: link.reviewableId, contentId: link.questionId })),
  );

  const admitted = rows.filter(row =>
    isAdmitted(reviewables.get(row.id) ?? null, filters.dueScope, nowStr),
  );
  if (admitted.length === 0) return [];

  // Hydrate the three things a question card needs to render, one batch per kind rather
  // than one query per card — a lecture-wide queue can hold a few hundred questions.
  const lectureById = new Map<string, any>();
  const lectureIdsToLoad = Array.from(
    new Set(admitted.map(row => row.lectureId).filter((id): id is string => !!id)),
  );
  if (lectureIdsToLoad.length > 0) {
    const lectureRows = await db
      .select()
      .from(schema.lectures)
      .where(inArray(schema.lectures.id, lectureIdsToLoad));
    for (const lecture of lectureRows) lectureById.set(lecture.id, lecture);
  }

  const mcqIds = admitted.filter(row => row.questionType === 'mcq').map(row => row.id);
  const choicesByQuestion = new Map<string, any[]>();
  if (mcqIds.length > 0) {
    const choiceRows = await db
      .select()
      .from(schema.choices)
      .where(inArray(schema.choices.questionId, mcqIds));
    for (const choice of choiceRows) {
      const list = choicesByQuestion.get(choice.questionId) ?? [];
      list.push(choice);
      choicesByQuestion.set(choice.questionId, list);
    }
  }

  const writtenIds = admitted
    .filter(row => row.questionType === 'written')
    .map(row => row.id);
  const writtenAnswerByQuestion = new Map<string, string | null>();
  if (writtenIds.length > 0) {
    const writtenRows = await db
      .select()
      .from(schema.writtenQuestions)
      .where(inArray(schema.writtenQuestions.questionId, writtenIds));
    for (const written of writtenRows) {
      writtenAnswerByQuestion.set(written.questionId, written.writtenAnswer);
    }
  }

  return admitted.map(row => {
    const reviewable = reviewables.get(row.id) ?? null;
    return {
      reviewableId: reviewable?.id ?? null,
      itemType: 'question' as const,
      data: row,
      lecture: row.lectureId ? lectureById.get(row.lectureId) ?? null : null,
      choices: choicesByQuestion.get(row.id) ?? [],
      writtenAnswer: writtenAnswerByQuestion.get(row.id) ?? null,
      card: reviewable ? toCardState(reviewable) : newCard(),
      nextReviewDate: reviewable?.nextReviewDate ?? null,
    };
  });
}

async function caseCards(
  dueScope: StudyDueScope,
  userId: string,
  lectureIds: string[] | null,
  nowStr: string,
): Promise<StudyCard[]> {
  const conditions = [];
  if (lectureIds) conditions.push(inArray(schema.caseItems.lectureId, lectureIds));

  const rows = await db
    .select()
    .from(schema.caseItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  if (rows.length === 0) return [];

  const links = await db
    .select()
    .from(schema.caseReviewable)
    .where(
      inArray(
        schema.caseReviewable.caseId,
        rows.map(row => row.id),
      ),
    );
  const reviewables = await loadReviewablesByContent(
    userId,
    links.map(link => ({ reviewableId: link.reviewableId, contentId: link.caseId })),
  );

  return rows
    .filter(row => isAdmitted(reviewables.get(row.id) ?? null, dueScope, nowStr))
    .map(row => {
      const reviewable = reviewables.get(row.id) ?? null;
      return {
        reviewableId: reviewable?.id ?? null,
        itemType: 'case' as const,
        data: row,
        card: reviewable ? toCardState(reviewable) : newCard(),
        nextReviewDate: reviewable?.nextReviewDate ?? null,
      };
    });
}

async function noteCards(
  dueScope: StudyDueScope,
  userId: string,
  lectureIds: string[] | null,
  nowStr: string,
  noteTypes: StudyContentType[],
): Promise<StudyCard[]> {
  const conditions = [];

  // `note` is every note_item that isn't a summary, so the two content types stay
  // exhaustive and mutually exclusive no matter what other note types appear later —
  // including rows written by other clients with a type this app never produces.
  if (!noteTypes.includes('summary')) {
    conditions.push(ne(schema.noteItems.type, 'summary'));
  } else if (!noteTypes.includes('note')) {
    conditions.push(eq(schema.noteItems.type, 'summary'));
  }

  if (lectureIds) conditions.push(inArray(schema.noteItems.lectureId, lectureIds));

  const rows = await db
    .select()
    .from(schema.noteItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  if (rows.length === 0) return [];

  const links = await db
    .select()
    .from(schema.noteReviewable)
    .where(
      inArray(
        schema.noteReviewable.noteId,
        rows.map(row => row.id),
      ),
    );
  const reviewables = await loadReviewablesByContent(
    userId,
    links.map(link => ({ reviewableId: link.reviewableId, contentId: link.noteId })),
  );

  return rows
    .filter(row => isAdmitted(reviewables.get(row.id) ?? null, dueScope, nowStr))
    .map(row => {
      const reviewable = reviewables.get(row.id) ?? null;
      return {
        reviewableId: reviewable?.id ?? null,
        itemType: 'note' as const,
        data: row,
        card: reviewable ? toCardState(reviewable) : newCard(),
        nextReviewDate: reviewable?.nextReviewDate ?? null,
      };
    });
}

/**
 * Sort key that puts never-reviewed cards after every scheduled one: they carry no
 * due date, and the student should clear what the scheduler already asked for first.
 * `~` sorts above every character an ISO-8601 timestamp can contain.
 */
const NEVER_REVIEWED_SORT_KEY = '~';

/**
 * Build the review queue for a set of filters.
 *
 * Ordering is by due date ascending with never-reviewed cards last: the student clears
 * what the scheduler already asked for before meeting anything new.
 */
export async function buildCustomStudyQueue(
  filters: CustomStudyFilters,
  userId: string,
): Promise<StudyCard[]> {
  const nowStr = new Date().toISOString();
  const lectureIds = await resolveLectureIds(filters.scope);

  // A scope that names a lecture with no siblings, or a subject with no lectures, can
  // only ever produce an empty queue — and `inArray` with `[]` is a dialect trap.
  if (lectureIds && lectureIds.length === 0) return [];

  const cards: StudyCard[] = [];

  if (filters.contentTypes.includes('question')) {
    cards.push(...(await questionCards(filters, userId, lectureIds, nowStr)));
  }
  if (filters.contentTypes.includes('case')) {
    cards.push(...(await caseCards(filters.dueScope, userId, lectureIds, nowStr)));
  }

  const noteTypes = filters.contentTypes.filter(
    (type): type is 'note' | 'summary' => type === 'note' || type === 'summary',
  );
  if (noteTypes.length > 0) {
    cards.push(...(await noteCards(filters.dueScope, userId, lectureIds, nowStr, noteTypes)));
  }

  return cards.sort((a, b) =>
    (a.nextReviewDate ?? NEVER_REVIEWED_SORT_KEY).localeCompare(
      b.nextReviewDate ?? NEVER_REVIEWED_SORT_KEY,
    ),
  );
}

// ─── Grading ──────────────────────────────────────────────────────────────────

/**
 * Apply a rating to one queue card.
 *
 * Returns the reviewable id that now holds the schedule — for never-reviewed content
 * this is a freshly-created row, so callers can keep their local copy in step.
 */
export async function gradeStudyCard(
  card: StudyCard,
  rating: Rating,
  userId: string,
): Promise<string> {
  const now = Date.now();
  const next = scheduleCard(rating, card.card, now);
  const timestamp = new Date(now).toISOString();

  const schedule = {
    state: next.state,
    currentStepIndex: next.currentStepIndex,
    interval: next.interval,
    easeFactor: next.easeFactor,
    repetitionCount: next.repetitionCount,
    lapses: next.lapses,
    nextReviewDate: new Date(now + next.dueInMs).toISOString(),
    lastReviewedAt: timestamp,
  };

  if (card.reviewableId) {
    await db
      .update(schema.reviewableItems)
      .set(schedule)
      .where(eq(schema.reviewableItems.id, card.reviewableId));
    return card.reviewableId;
  }

  // The content had no scheduling state until this moment. Create the reviewable row
  // with the rating already applied rather than passing through `state: 'new'`, which
  // would leave the queue's first answer unscheduled.
  const reviewableId = Crypto.randomUUID();
  await db.insert(schema.reviewableItems).values({
    id: reviewableId,
    userId,
    itemType: card.itemType,
    ...schedule,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const contentId = card.data.id;
  switch (card.itemType) {
    case 'question':
      await db
        .insert(schema.questionReviewable)
        .values({ reviewableId, questionId: contentId });
      break;
    case 'case':
      await db.insert(schema.caseReviewable).values({ reviewableId, caseId: contentId });
      break;
    case 'note':
      await db.insert(schema.noteReviewable).values({ reviewableId, noteId: contentId });
      break;
  }

  return reviewableId;
}
