import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const authProviderEnum = pgEnum('auth_provider', ['google', 'credentials']);
export const roleEnum = pgEnum('role', ['student', 'admin']);
export const studyUnitTypeEnum = pgEnum('study_unit_type', ['lecture', 'section']);
// How a question entered the system (ingestion provenance).
export const questionSourceEnum = pgEnum('question_source', ['telegram_auto', 'admin_manual']);
export const questionTypeEnum = pgEnum('question_type', ['mcq', 'written']);
// Why a question is worth studying (clinical provenance) — a different axis from
// `question_source` above, and what the custom-study launcher filters on.
export const questionSourceTypeEnum = pgEnum('question_source_type', [
  'previous_exam',
  'doctor_confirmation',
  'owner',
  'team_expectation',
  'data',
]);

// Tables
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const terms = pgTable('terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  gradeId: uuid('grade_id').notNull().references(() => grades.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => terms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const studyUnits = pgTable('study_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  type: studyUnitTypeEnum('type').notNull().default('lecture'),
  order: integer('order'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const lectureFiles = pgTable('lecture_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  studyUnitId: uuid('study_unit_id').notNull().references(() => studyUnits.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const lectureVideos = pgTable('lecture_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  studyUnitId: uuid('study_unit_id').notNull().references(() => studyUnits.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  url: text('url').notNull(),
  duration: integer('duration').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const videoProgress = pgTable('video_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lectureVideoId: uuid('lecture_video_id').notNull().references(() => lectureVideos.id, { onDelete: 'cascade' }),
  positionSeconds: integer('position_seconds').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserVideo: unique('unique_user_video').on(table.userId, table.lectureVideoId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: authProviderEnum('auth_provider').notNull(),
  role: roleEnum('role').notNull(),
  termId: uuid('term_id').references(() => terms.id, { onDelete: 'set null' }),
});

export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pushToken: text('push_token').notNull().unique(),
  platform: text('platform').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').notNull().default(false),
});

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studyUnitId: uuid('study_unit_id').references(() => studyUnits.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  // Discriminator: determines which subclass table holds type-specific data
  questionType: questionTypeEnum('question_type').notNull().default('mcq'),
  questionText: text('question_text').notNull(),
  explanation: text('explanation'), // nullable — written questions often have none
  source: questionSourceEnum('source').notNull(),
  telegramMessageId: integer('telegram_message_id').unique(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const choices = pgTable('choices', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  choiceText: text('choice_text').notNull(),
  isCorrect: boolean('is_correct').notNull(),
});

// Why a question is worth studying. A child table rather than a column on `questions`
// because a single question can carry several of these, and the custom-study launcher
// offers them as a multi-select filter.
export const questionSources = pgTable('question_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  sourceType: questionSourceTypeEnum('source_type').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  // nullable: set for MCQ (the choice picked), null for written (student self-evaluates)
  choiceId: uuid('choice_id').references(() => choices.id, { onDelete: 'cascade' }),
  isCorrect: boolean('is_correct').notNull(),
}, (table) => ({
  uniqueUserQuestion: unique('unique_user_question').on(table.userId, table.questionId),
}));

export const flags = pgTable('flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
}, (table) => ({
  uniqueUserQuestion: unique('unique_user_flag').on(table.userId, table.questionId),
}));

// ── Question Subclass Tables (8A: Superclass + Subclasses) ────────────────────
// Each row here has a 1-to-1 FK to questions.id (the superclass).
// A question MUST have exactly one matching row in exactly one subclass table.

// Subclass: MCQ — no extra columns needed; MCQ-specific data lives in choices table
export const mcqQuestions = pgTable('mcq_questions', {
  questionId: uuid('question_id').primaryKey().references(() => questions.id, { onDelete: 'cascade' }),
});

// Subclass: Written — stores the hidden model answer shown after student reveals it
export const writtenQuestions = pgTable('written_questions', {
  questionId: uuid('question_id').primaryKey().references(() => questions.id, { onDelete: 'cascade' }),
  writtenAnswer: text('written_answer').notNull(), // the hidden/spoiler answer from Telegram
});

// Question Images — works for both MCQ and written (anatomy diagrams, labelling, etc.)
export const questionImages = pgTable('question_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),           // permanent URL (object storage / CDN)
  displayOrder: integer('display_order').notNull().default(0),
  telegramFileId: text('telegram_file_id'),        // original Telegram file_id for reference
  isAnswer: boolean('is_answer').notNull().default(false), // true if this image represents the model answer
});

// ── Spaced Repetition System (SRS) ────────────────────────────────────────────
// Architecture: 8A Superclass + Subclasses (same pattern as questions).
// `review_items` holds the SM-2 scheduling state per user per item.
// Each subclass table holds the actual content for that item type.
// ALL items are private per student (like Anki — no shared decks).

export const reviewItemTypeEnum = pgEnum('review_item_type', [
  'question', // links to existing questions table
  'case',     // medical case scenario
  'note',     // lecture note
  'drug',     // drug/medication card
  'fact',     // simple front/back flashcard (Anki-style)
]);

// SM-2 grade: 1=Again (forgot), 2=Hard, 3=Good, 4=Easy
export const reviewGradeEnum = pgEnum('review_grade', ['again', 'hard', 'good', 'easy']);

// Anki card states: new → learning → review ⇄ relearning
export const reviewStateEnum = pgEnum('review_state', ['new', 'learning', 'review', 'relearning']);

// Superclass: holds Anki scheduling state — one row per user per reviewable item
export const reviewItems = pgTable('review_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemType: reviewItemTypeEnum('item_type').notNull(),
  // Anki scheduler fields
  state: reviewStateEnum('state').notNull().default('new'),   // new/learning/review/relearning
  currentStepIndex: integer('current_step_index'),              // index into learning/relearning steps; null when state='review'
  interval: integer('interval').notNull().default(0),           // days until next review (0 while learning)
  easeFactor: integer('ease_factor').notNull().default(250),    // stored as x100 (250 = 2.5) to avoid floats
  repetitions: integer('repetitions').notNull().default(0),     // consecutive correct answers
  lapses: integer('lapses').notNull().default(0),               // times forgotten in review state
  nextReviewAt: timestamp('next_review_at').notNull().defaultNow(), // when to show next
  lastReviewedAt: timestamp('last_reviewed_at'),                // null = never reviewed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),   // for sync
  deletedAt: timestamp('deleted_at'),                           // for sync (soft delete)
}, (table) => ({
  // A user can only have one review_item per question/case/etc.
  // Uniqueness is enforced at subclass level via the PK on reviewItemId
}));

// Subclass: Question — links to the existing questions table (MCQ or Written)
export const questionReviewItems = pgTable('question_review_items', {
  reviewItemId: uuid('review_item_id').primaryKey().references(() => reviewItems.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
});

// Subclass: Case — medical case scenario added by student
// Subclass: Case — authored by the student.
//
// Shape note: this mirrors the MOBILE schema, which is canonical. The server's original shape
// (scenario/diagnosis/management/keyPoints) was a richer clinical model that no code ever read
// or wrote — a case_item is a flashcard with a title, a prompt and an answer, same as a note.
//
// Image columns: `image_key` is authoritative — it is the provider-relative path in whichever
// storage backend is configured (see apps/api/src/services/storage). `image_url` is a derived
// cache of `image_key -> URL` so list screens need no storage round trip, and can always be
// rebuilt from the key, which is what makes a provider swap possible without rewriting rows.
// `image_upload_status` mirrors the device's view of the upload, so a row can sync before its
// image finishes uploading without the client re-syncing the whole row afterwards.
export const caseItems = pgTable('case_items', {
  reviewItemId: uuid('review_item_id').primaryKey().references(() => reviewItems.id, { onDelete: 'cascade' }),
  studyUnitId: uuid('study_unit_id').references(() => studyUnits.id, { onDelete: 'set null' }), // nullable: optional link
  category: text('category').notNull().default('general'),
  title: text('title').notNull(),
  content: text('content').notNull(),      // the prompt shown before reveal
  answer: text('answer'),                  // revealed after the student taps Show Answer
  imageKey: text('image_key'),
  imageUrl: text('image_url'),
  imageUploadStatus: text('image_upload_status').notNull().default('none'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Subclass: Note — lecture note added by student
// Subclass: Note — authored by the student, mirrors the MOBILE schema (canonical).
// The image columns carry the same meaning as on case_items above.
export const noteItems = pgTable('note_items', {
  reviewItemId: uuid('review_item_id').primaryKey().references(() => reviewItems.id, { onDelete: 'cascade' }),
  studyUnitId: uuid('study_unit_id').references(() => studyUnits.id, { onDelete: 'set null' }), // nullable: optional link
  type: text('type').notNull().default('general'),
  content: text('content').notNull(),      // the note body (markdown supported)
  sourceQuestionId: uuid('source_question_id').references(() => questions.id, { onDelete: 'set null' }),
  imageKey: text('image_key'),
  imageUrl: text('image_url'),
  imageUploadStatus: text('image_upload_status').notNull().default('none'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Subclass: Drug — drug/medication flashcard added by student
export const drugItems = pgTable('drug_items', {
  reviewItemId: uuid('review_item_id').primaryKey().references(() => reviewItems.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  drugClass: text('drug_class'),           // e.g. "Beta blocker", "Antibiotic"
  mechanism: text('mechanism'),
  indications: text('indications'),
  contraindications: text('contraindications'),
  sideEffects: text('side_effects'),
  mnemonic: text('mnemonic'),              // memory trick
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Subclass: Fact — simple front/back flashcard (Anki-style), most flexible type
export const factItems = pgTable('fact_items', {
  reviewItemId: uuid('review_item_id').primaryKey().references(() => reviewItems.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),  // the question / prompt shown to student
  back: text('back').notNull(),    // the answer shown after reveal
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Review log — every review session is recorded for analytics & scheduler history
export const reviewLogs = pgTable('review_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewItemId: uuid('review_item_id').notNull().references(() => reviewItems.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  grade: reviewGradeEnum('grade').notNull(),          // student's self-rating
  stateBefore: reviewStateEnum('state_before').notNull().default('review'), // card state before this review
  intervalBefore: integer('interval_before').notNull(), // interval BEFORE this review
  intervalAfter: integer('interval_after').notNull(),   // interval AFTER this review (new schedule)
  easeFactorAfter: integer('ease_factor_after').notNull(), // new ease factor after update
  reviewedAt: timestamp('reviewed_at').notNull().defaultNow(),
});


export const taskTypeEnum = pgEnum('task_type', ['zekr', 'wird', 'work', 'study']);
export const taskRecurrenceEnum = pgEnum('task_recurrence', ['once', 'daily', 'weekly']);
export const taskRecurrenceStatusEnum = pgEnum('task_recurrence_status', ['active', 'stopped']);
export const wirdModeEnum = pgEnum('wird_mode', ['by_ayat', 'by_pages']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'done', 'missed']);
export const workTaskCategoryEnum = pgEnum('work_task_category', ['programming', 'video_editing']);
export const studyTaskActivityEnum = pgEnum('study_task_activity', ['watch', 'solve', 'revision']);

// Superclass: shared task fields
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(), // UUID generated on device for offline-first
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: taskTypeEnum('task_type').notNull(),
  recurrence: taskRecurrenceEnum('recurrence').notNull().default('once'),
  recurrenceStatus: taskRecurrenceStatusEnum('recurrence_status').notNull().default('active'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  consumedTime: integer('consumed_time'),
  estimatedTime: integer('estimated_time'),
  status: taskStatusEnum('status').notNull().default('pending'),
  achievedFrom: text('achieved_from'),
  // Offline-first sync fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(), // updated on every change for sync
  deletedAt: timestamp('deleted_at'),          // soft delete for offline-first safety
}, (table) => {
  return {
    uniqueTaskConstraint: unique('unique_task_recurrence').on(table.userId, table.taskType, table.startTime, table.endTime),
  };
});

// Quran Chapters (Surahs)
export const quranChapters = pgTable('quran_chapters', {
  id: integer('id').primaryKey(), // 1-114
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  versesCount: integer('verses_count').notNull(),
});

// Quran Verses (Ayat)
export const quranVerses = pgTable('quran_verses', {
  id: uuid('id').defaultRandom().primaryKey(),
  chapterId: integer('chapter_id').references(() => quranChapters.id, { onDelete: 'cascade' }).notNull(),
  ayaNumber: integer('aya_number').notNull(),
  page: integer('page').notNull(),
  textAr: text('text_ar').notNull(),
});

// Zekr Categories — the 132 categories from Hisn al-Muslim
export const zekrCategories = pgTable('zekr_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryNumber: integer('category_number').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
});

// Zekr Catalog — the 268 duas linked to categories
export const zekrCatalog = pgTable('zekr_catalog', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => zekrCategories.id, { onDelete: 'cascade' }).notNull(),
  duaNumber: integer('dua_number').notNull(),
  slug: text('slug'),
  transliteration: text('transliteration'),
  textEn: text('text_en').notNull(),
  textAr: text('text_ar').notNull(),
  virtue: text('virtue'),
  source: text('source'),
  repeatCount: integer('repeat_count').notNull().default(1),
});

// Subclass: Zekr task — separate table (8A), 1-to-many with tasks
export const zekrTasks = pgTable('zekr_tasks', {
  id: uuid('id').defaultRandom().primaryKey(), // its own ID for 1-to-many
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  zekrId: uuid('zekr_id').references(() => zekrCatalog.id, { onDelete: 'set null' }), // nullable: custom zekr not in list
  customZekrText: text('custom_zekr_text'), // if zekrId is null, student typed their own
  zekrCount: integer('zekr_count').notNull(),           // target: e.g. 33
  zekrAchievedCount: integer('zekr_achieved_count').notNull().default(0), // progress
});

// Subclass: Wird task — uses nullable columns controlled by wirdMode enum
// (simpler than a 2nd level of subclassing since only 4 optional fields total)
export const wirdTasks = pgTable('wird_tasks', {
  taskId: uuid('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  wirdMode: wirdModeEnum('wird_mode').notNull(), // controls which nullable fields are used
  // Used when wirdMode = 'by_ayat'
  startVerseId: uuid('start_verse_id').references(() => quranVerses.id, { onDelete: 'cascade' }),
  endVerseId: uuid('end_verse_id').references(() => quranVerses.id, { onDelete: 'cascade' }),
  // Used when wirdMode = 'by_pages'
  startPage: integer('start_page'),
  endPage: integer('end_page'),
  lastAchievedPage: integer('last_achieved_page'), // tracks the actual page number reached
});

export const workTasks = pgTable('work_tasks', {
  taskId: uuid('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  category: workTaskCategoryEnum('category').notNull(),
  projectName: text('project_name').notNull(),
  description: text('description'),
  link: text('link'),
  cost: integer('cost').notNull(),
});

export const studyTasks = pgTable('study_tasks', {
  taskId: uuid('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  studyUnitId: uuid('study_unit_id').notNull().references(() => studyUnits.id, { onDelete: 'cascade' }),
  activityType: studyTaskActivityEnum('activity_type').notNull(),
});

// Relations
export const gradesRelations = relations(grades, ({ many }) => ({
  terms: many(terms),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  grade: one(grades, {
    fields: [terms.gradeId],
    references: [grades.id],
  }),
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  term: one(terms, {
    fields: [modules.termId],
    references: [terms.id],
  }),
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  module: one(modules, {
    fields: [subjects.moduleId],
    references: [modules.id],
  }),
  studyUnits: many(studyUnits),
}));

export const studyUnitsRelations = relations(studyUnits, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [studyUnits.subjectId],
    references: [subjects.id],
  }),
  lectureFiles: many(lectureFiles),
  lectureVideos: many(lectureVideos),
  questions: many(questions),
  caseItems: many(caseItems),
  noteItems: many(noteItems),
}));

export const lectureFilesRelations = relations(lectureFiles, ({ one }) => ({
  studyUnit: one(studyUnits, {
    fields: [lectureFiles.studyUnitId],
    references: [studyUnits.id],
  }),
}));

export const lectureVideosRelations = relations(lectureVideos, ({ one, many }) => ({
  studyUnit: one(studyUnits, {
    fields: [lectureVideos.studyUnitId],
    references: [studyUnits.id],
  }),
  videoProgress: many(videoProgress),
}));

export const videoProgressRelations = relations(videoProgress, ({ one }) => ({
  user: one(users, {
    fields: [videoProgress.userId],
    references: [users.id],
  }),
  lectureVideo: one(lectureVideos, {
    fields: [videoProgress.lectureVideoId],
    references: [lectureVideos.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  term: one(terms, {
    fields: [users.termId],
    references: [terms.id],
  }),
  refreshTokens: many(refreshTokens),
  deviceTokens: many(deviceTokens),
  videoProgress: many(videoProgress),
  questions: many(questions),
  attempts: many(attempts),
  flags: many(flags),
  reviewItems: many(reviewItems), // SRS
  reviewLogs: many(reviewLogs),   // SRS
  tasks: many(tasks),             // Tasks
}));

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, {
    fields: [deviceTokens.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  studyUnit: one(studyUnits, {
    fields: [questions.studyUnitId],
    references: [studyUnits.id],
  }),
  creator: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
  choices: many(choices),
  attempts: many(attempts),
  flags: many(flags),
  questionSources: many(questionSources),
  // Subclass relations
  mcqQuestion: one(mcqQuestions, {
    fields: [questions.id],
    references: [mcqQuestions.questionId],
  }),
  writtenQuestion: one(writtenQuestions, {
    fields: [questions.id],
    references: [writtenQuestions.questionId],
  }),
  images: many(questionImages),
}));

export const choicesRelations = relations(choices, ({ one, many }) => ({
  question: one(questions, {
    fields: [choices.questionId],
    references: [questions.id],
  }),
  attempts: many(attempts),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  user: one(users, {
    fields: [attempts.userId],
    references: [users.id],
  }),
  question: one(questions, {
    fields: [attempts.questionId],
    references: [questions.id],
  }),
  choice: one(choices, {
    fields: [attempts.choiceId],
    references: [choices.id],
  }),
}));

export const flagsRelations = relations(flags, ({ one }) => ({
  user: one(users, {
    fields: [flags.userId],
    references: [users.id],
  }),
  question: one(questions, {
    fields: [flags.questionId],
    references: [questions.id],
  }),
}));

export const questionSourcesRelations = relations(questionSources, ({ one }) => ({
  question: one(questions, {
    fields: [questionSources.questionId],
    references: [questions.id],
  }),
}));

export const mcqQuestionsRelations = relations(mcqQuestions, ({ one }) => ({
  question: one(questions, {
    fields: [mcqQuestions.questionId],
    references: [questions.id],
  }),
}));

export const writtenQuestionsRelations = relations(writtenQuestions, ({ one }) => ({
  question: one(questions, {
    fields: [writtenQuestions.questionId],
    references: [questions.id],
  }),
}));

export const questionImagesRelations = relations(questionImages, ({ one }) => ({
  question: one(questions, {
    fields: [questionImages.questionId],
    references: [questions.id],
  }),
}));

// ── SRS Relations ─────────────────────────────────────────────────────────────

export const reviewItemsRelations = relations(reviewItems, ({ one, many }) => ({
  user: one(users, {
    fields: [reviewItems.userId],
    references: [users.id],
  }),
  questionReviewItem: one(questionReviewItems, {
    fields: [reviewItems.id],
    references: [questionReviewItems.reviewItemId],
  }),
  caseItem: one(caseItems, {
    fields: [reviewItems.id],
    references: [caseItems.reviewItemId],
  }),
  noteItem: one(noteItems, {
    fields: [reviewItems.id],
    references: [noteItems.reviewItemId],
  }),
  drugItem: one(drugItems, {
    fields: [reviewItems.id],
    references: [drugItems.reviewItemId],
  }),
  factItem: one(factItems, {
    fields: [reviewItems.id],
    references: [factItems.reviewItemId],
  }),
  logs: many(reviewLogs),
}));

export const questionReviewItemsRelations = relations(questionReviewItems, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [questionReviewItems.reviewItemId],
    references: [reviewItems.id],
  }),
  question: one(questions, {
    fields: [questionReviewItems.questionId],
    references: [questions.id],
  }),
}));

export const caseItemsRelations = relations(caseItems, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [caseItems.reviewItemId],
    references: [reviewItems.id],
  }),
  studyUnit: one(studyUnits, {
    fields: [caseItems.studyUnitId],
    references: [studyUnits.id],
  }),
}));

export const noteItemsRelations = relations(noteItems, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [noteItems.reviewItemId],
    references: [reviewItems.id],
  }),
  studyUnit: one(studyUnits, {
    fields: [noteItems.studyUnitId],
    references: [studyUnits.id],
  }),
}));

export const drugItemsRelations = relations(drugItems, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [drugItems.reviewItemId],
    references: [reviewItems.id],
  }),
}));

export const factItemsRelations = relations(factItems, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [factItems.reviewItemId],
    references: [reviewItems.id],
  }),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  reviewItem: one(reviewItems, {
    fields: [reviewLogs.reviewItemId],
    references: [reviewItems.id],
  }),
  user: one(users, {
    fields: [reviewLogs.userId],
    references: [users.id],
  }),
}));

// ── Tasks Relations ─────────────────────────────────────────────────────────────

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  zekrTasks: many(zekrTasks),
  wirdTask: one(wirdTasks, {
    fields: [tasks.id],
    references: [wirdTasks.taskId],
  }),
}));

export const quranChaptersRelations = relations(quranChapters, ({ many }) => ({
  verses: many(quranVerses),
}));

export const quranVersesRelations = relations(quranVerses, ({ one }) => ({
  chapter: one(quranChapters, {
    fields: [quranVerses.chapterId],
    references: [quranChapters.id],
  }),
}));

export const zekrCategoriesRelations = relations(zekrCategories, ({ many }) => ({
  catalog: many(zekrCatalog),
}));

export const zekrCatalogRelations = relations(zekrCatalog, ({ one, many }) => ({
  category: one(zekrCategories, {
    fields: [zekrCatalog.categoryId],
    references: [zekrCategories.id],
  }),
  zekrTasks: many(zekrTasks),
}));

export const zekrTasksRelations = relations(zekrTasks, ({ one }) => ({
  task: one(tasks, {
    fields: [zekrTasks.taskId],
    references: [tasks.id],
  }),
  zekr: one(zekrCatalog, {
    fields: [zekrTasks.zekrId],
    references: [zekrCatalog.id],
  }),
}));

export const wirdTasksRelations = relations(wirdTasks, ({ one }) => ({
  task: one(tasks, {
    fields: [wirdTasks.taskId],
    references: [tasks.id],
  }),
  startVerse: one(quranVerses, {
    fields: [wirdTasks.startVerseId],
    references: [quranVerses.id],
  }),
  endVerse: one(quranVerses, {
    fields: [wirdTasks.endVerseId],
    references: [quranVerses.id],
  }),
}));

// TypeScript types
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type StudyUnit = typeof studyUnits.$inferSelect;
export type NewStudyUnit = typeof studyUnits.$inferInsert;

export type Lecture = typeof studyUnits.$inferSelect;
export type NewLecture = typeof studyUnits.$inferInsert;

export type LectureFile = typeof lectureFiles.$inferSelect;
export type NewLectureFile = typeof lectureFiles.$inferInsert;

export type LectureVideo = typeof lectureVideos.$inferSelect;
export type NewLectureVideo = typeof lectureVideos.$inferInsert;

export type VideoProgress = typeof videoProgress.$inferSelect;
export type NewVideoProgress = typeof videoProgress.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type Choice = typeof choices.$inferSelect;
export type NewChoice = typeof choices.$inferInsert;

export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;

export type Flag = typeof flags.$inferSelect;
export type NewFlag = typeof flags.$inferInsert;

export type QuestionSource = typeof questionSources.$inferSelect;
export type NewQuestionSource = typeof questionSources.$inferInsert;

export type McqQuestion = typeof mcqQuestions.$inferSelect;
export type NewMcqQuestion = typeof mcqQuestions.$inferInsert;

export type WrittenQuestion = typeof writtenQuestions.$inferSelect;
export type NewWrittenQuestion = typeof writtenQuestions.$inferInsert;

export type QuestionImage = typeof questionImages.$inferSelect;
export type NewQuestionImage = typeof questionImages.$inferInsert;

// SRS types
export type ReviewItem = typeof reviewItems.$inferSelect;
export type NewReviewItem = typeof reviewItems.$inferInsert;

export type QuestionReviewItem = typeof questionReviewItems.$inferSelect;
export type NewQuestionReviewItem = typeof questionReviewItems.$inferInsert;

export type CaseItem = typeof caseItems.$inferSelect;
export type NewCaseItem = typeof caseItems.$inferInsert;

export type NoteItem = typeof noteItems.$inferSelect;
export type NewNoteItem = typeof noteItems.$inferInsert;

export type DrugItem = typeof drugItems.$inferSelect;
export type NewDrugItem = typeof drugItems.$inferInsert;

export type FactItem = typeof factItems.$inferSelect;
export type NewFactItem = typeof factItems.$inferInsert;

export type ReviewLog = typeof reviewLogs.$inferSelect;
export type NewReviewLog = typeof reviewLogs.$inferInsert;

// Tasks types
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type ZekrCategory = typeof zekrCategories.$inferSelect;
export type NewZekrCategory = typeof zekrCategories.$inferInsert;

export type ZekrCatalogItem = typeof zekrCatalog.$inferSelect;
export type NewZekrCatalogItem = typeof zekrCatalog.$inferInsert;

export type ZekrTask = typeof zekrTasks.$inferSelect;
export type NewZekrTask = typeof zekrTasks.$inferInsert;

export type WirdTask = typeof wirdTasks.$inferSelect;
export type NewWirdTask = typeof wirdTasks.$inferInsert;

export type QuranChapter = typeof quranChapters.$inferSelect;
export type NewQuranChapter = typeof quranChapters.$inferInsert;

export type QuranVerse = typeof quranVerses.$inferSelect;
export type NewQuranVerse = typeof quranVerses.$inferInsert;

// ── Better Auth Tables ───────────────────────────────────────────────────────
// Required by Better Auth. "user" is Better Auth's primary identity table.
// We use additionalFields (role, termId) to carry our domain data.

export const betterAuthUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Domain-specific fields
  role: text('role').notNull().default('student'), // 'student' | 'admin'
  termId: uuid('term_id').references(() => terms.id, { onDelete: 'set null' }),
});

export const betterAuthSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
});

export const betterAuthAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => betterAuthUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const betterAuthVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type BetterAuthUser = typeof betterAuthUser.$inferSelect;
export type NewBetterAuthUser = typeof betterAuthUser.$inferInsert;
