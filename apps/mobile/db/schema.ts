import { sqliteTable, text, integer, uniqueIndex, unique } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Tables matching the Manhaj SQLite schema
export const grades = sqliteTable('grades', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const terms = sqliteTable('terms', {
  id: text('id').primaryKey(),
  gradeId: text('grade_id')
    .notNull()
    .references(() => grades.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const modules = sqliteTable('modules', {
  id: text('id').primaryKey(),
  termId: text('term_id')
    .notNull()
    .references(() => terms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  moduleId: text('module_id')
    .notNull()
    .references(() => modules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const studyUnits = sqliteTable('study_units', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['lecture', 'section'] }).notNull().default('lecture'),
  name: text('name').notNull(),
  description: text('description').notNull(),
  order: integer('order'),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const studyUnitVideos = sqliteTable('study_unit_videos', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id')
    .notNull()
    .references(() => studyUnits.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  url: text('url').notNull(),
  duration: integer('duration').notNull(),
  localFilePath: text('local_file_path'),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const studyUnitFiles = sqliteTable('study_unit_files', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id')
    .notNull()
    .references(() => studyUnits.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

/**
 * Files the student attached to a lecture for their own convenience.
 *
 * Deliberately device-local: this table exists only here, never on the server, and is
 * absent from both sync services. Attaching a file on one device does not make it appear
 * on another — that is the intended behaviour, not an omission, and the reason there is
 * no `synced`/`deleted_at` column to reconcile against a remote.
 *
 * `localFilePath` points inside the app's own sandbox (`documentDirectory/...`), where a
 * copy of the bytes was placed at attach time. Referencing the original URI instead would
 * break as soon as the OS, or another app, moved or reclaimed it.
 */
export const studyUnitLocalFiles = sqliteTable('study_unit_local_files', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id')
    .notNull()
    .references(() => studyUnits.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  localFilePath: text('local_file_path').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  createdAt: text('created_at').notNull(),
});

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id').references(() => studyUnits.id, { onDelete: 'set null' }),
  createdBy: text('created_by'),
  questionType: text('question_type').notNull().default('mcq'),
  questionText: text('question_text').notNull(),
  explanation: text('explanation').notNull(),
  source: text('source').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

/**
 * Why a question is worth studying — its clinical provenance, distinct from
 * `questions.source`, which only records how the row got into the database
 * (telegram_auto / admin_manual).
 *
 * A question may carry several of these, so this is a child table rather than a column,
 * and the custom-study launcher filters on it as a multi-select.
 */
export const questionSourceTypes = [
  'previous_exam',
  'doctor_confirmation',
  'owner',
  'team_expectation',
] as const;
export type QuestionSourceType = (typeof questionSourceTypes)[number];

export const questionSources = sqliteTable('question_sources', {
  id: text('id').primaryKey(),
  questionId: text('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const mcqQuestions = sqliteTable('mcq_questions', {
  questionId: text('question_id').primaryKey().references(() => questions.id, { onDelete: 'cascade' }),
});

export const writtenQuestions = sqliteTable('written_questions', {
  questionId: text('question_id').primaryKey().references(() => questions.id, { onDelete: 'cascade' }),
  writtenAnswer: text('written_answer').notNull(),
});

export const choices = sqliteTable('choices', {
  id: text('id').primaryKey(),
  questionId: text('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  choiceText: text('choice_text').notNull(),
  isCorrect: integer('is_correct').notNull(), // 1 = true, 0 = false
});

export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  choiceId: text('choice_id').notNull(),
  isCorrect: integer('is_correct').notNull(),
  synced: integer('synced').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const flags = sqliteTable('flags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  synced: integer('synced').notNull().default(0),
  operation: text('operation').notNull().default('add'),
  createdAt: text('created_at').notNull(),
});

export const videoProgress = sqliteTable('video_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  studyUnitVideoId: text('study_unit_video_id').notNull(),
  positionSeconds: integer('position_seconds').notNull(),
  updatedAt: text('updated_at').notNull(),
  synced: integer('synced').notNull().default(0),
});

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const reviewableItems = sqliteTable('reviewable_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemType: text('item_type').notNull(),
  state: text('state').notNull().default('new'),
  currentStepIndex: integer('current_step_index'),
  interval: integer('interval').notNull().default(0),
  easeFactor: integer('ease_factor').notNull().default(250),
  repetitionCount: integer('repetition_count').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  nextReviewDate: text('next_review_date').notNull(),
  lastReviewedAt: text('last_reviewed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const questionReviewable = sqliteTable('question_reviewable', {
  reviewableId: text('reviewable_id').primaryKey().references(() => reviewableItems.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
});

/**
 * Image attachment state for user-authorable review items.
 *
 * The device and the server are deliberately asymmetric about what is authoritative.
 * Here it is `imageLocalPath`: the device that took the photo holds the only copy of the
 * bytes until they reach the server, and `imageUrl` stays empty until they do. On the
 * server it is `imageKey` — the provider-relative path, which survives a storage-provider
 * swap in a way that a URL does not. `resolveImageUri` bridges the two on read, preferring
 * whichever copy this device can actually reach.
 */
export const imageUploadStatuses = ['none', 'pending', 'synced', 'failed'] as const;
export type ImageUploadStatus = (typeof imageUploadStatuses)[number];

export const caseItems = sqliteTable('case_items', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  answer: text('answer'),
  imageLocalPath: text('image_local_path'),
  imageUrl: text('image_url'),
  imageUploadStatus: text('image_upload_status').notNull().default('none'),
  createdAt: text('created_at').notNull(),
});

export const caseReviewable = sqliteTable('case_reviewable', {
  reviewableId: text('reviewable_id').primaryKey().references(() => reviewableItems.id, { onDelete: 'cascade' }),
  caseId: text('case_id').notNull().references(() => caseItems.id, { onDelete: 'cascade' }),
});

export const noteItems = sqliteTable('note_items', {
  id: text('id').primaryKey(),
  studyUnitId: text('study_unit_id').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  sourceQuestionId: text('source_question_id'),
  imageLocalPath: text('image_local_path'),
  imageUrl: text('image_url'),
  imageUploadStatus: text('image_upload_status').notNull().default('none'),
  createdAt: text('created_at').notNull(),
});

export const noteReviewable = sqliteTable('note_reviewable', {
  reviewableId: text('reviewable_id').primaryKey().references(() => reviewableItems.id, { onDelete: 'cascade' }),
  noteId: text('note_id').notNull().references(() => noteItems.id, { onDelete: 'cascade' }),
});

/**
 * Whether a recurring series is still producing new instances.
 *
 * Deleting a daily/weekly task cannot be expressed as a row delete: the recurrence pass
 * rebuilds each series from the latest surviving instance, so soft-deleting the newest
 * one would only make it fall back to an older instance and carry on. Stopping is a
 * property of the series, recorded on its latest instance, and is what the recurrence
 * pass consults before cloning. 'once' tasks never need it — they have no series.
 */
export const taskRecurrenceStatuses = ['active', 'stopped'] as const;
export type TaskRecurrenceStatus = (typeof taskRecurrenceStatuses)[number];

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  taskType: text('task_type').notNull(),
  recurrence: text('recurrence').notNull().default('once'),
  recurrenceStatus: text('recurrence_status').notNull().default('active'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  consumedTime: integer('consumed_time'),
  estimatedTime: integer('estimated_time'),
  status: text('status').notNull().default('pending'),
  achievedFrom: text('achieved_from'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
}, (table) => {
  return {
    uniqueTaskConstraint: unique('unique_mobile_task').on(table.taskType, table.startTime, table.endTime, table.createdAt),
  };
});

export const quranChapters = sqliteTable('quran_chapters', {
  id: integer('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  versesCount: integer('verses_count').notNull(),
});

export const quranVerses = sqliteTable('quran_verses', {
  id: text('id').primaryKey(),
  chapterId: integer('chapter_id').references(() => quranChapters.id, { onDelete: 'cascade' }).notNull(),
  ayaNumber: integer('aya_number').notNull(),
  page: integer('page').notNull(),
  textAr: text('text_ar').notNull(),
});

export const zekrCategories = sqliteTable('zekr_categories', {
  id: text('id').primaryKey(),
  categoryNumber: integer('category_number').notNull(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
});

export const zekrCatalog = sqliteTable('zekr_catalog', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => zekrCategories.id, { onDelete: 'cascade' }).notNull(),
  duaNumber: integer('dua_number').notNull(),
  slug: text('slug'),
  transliteration: text('transliteration'),
  textEn: text('text_en').notNull(),
  textAr: text('text_ar').notNull(),
  virtue: text('virtue'),
  source: text('source'),
  repeatCount: integer('repeat_count').notNull().default(1),
});

export const zekrTasks = sqliteTable('zekr_tasks', {
  taskId: text('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => zekrCategories.id, { onDelete: 'set null' }),
  zekrId: text('zekr_id').references(() => zekrCatalog.id, { onDelete: 'set null' }),
});

export const wirdTasks = sqliteTable('wird_tasks', {
  taskId: text('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  wirdMode: text('wird_mode').notNull().default('daily'),
  startVerseId: text('start_verse_id').references(() => quranVerses.id, { onDelete: 'cascade' }),
  endVerseId: text('end_verse_id').references(() => quranVerses.id, { onDelete: 'cascade' }),
  startPage: integer('start_page'),
  endPage: integer('end_page'),
  lastAchievedPage: integer('last_achieved_page'),
});

export const workTasks = sqliteTable('work_tasks', {
  taskId: text('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  projectName: text('project_name').notNull(),
  description: text('description'),
  link: text('link'),
  cost: integer('cost').notNull(),
});

export const studyTasks = sqliteTable('study_tasks', {
  taskId: text('task_id').primaryKey().references(() => tasks.id, { onDelete: 'cascade' }),
  studyUnitId: text('study_unit_id').notNull(),
  activityType: text('activity_type').notNull(),
});

// Relations for Drizzle Relational Queries
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
  studyUnitVideos: many(studyUnitVideos),
  studyUnitFiles: many(studyUnitFiles),
  studyUnitLocalFiles: many(studyUnitLocalFiles),
  questions: many(questions),
}));

export const studyUnitVideosRelations = relations(studyUnitVideos, ({ one }) => ({
  studyUnit: one(studyUnits, {
    fields: [studyUnitVideos.studyUnitId],
    references: [studyUnits.id],
  }),
}));

export const studyUnitFilesRelations = relations(studyUnitFiles, ({ one }) => ({
  studyUnit: one(studyUnits, {
    fields: [studyUnitFiles.studyUnitId],
    references: [studyUnits.id],
  }),
}));

export const questionImages = sqliteTable('question_images', {
  id: text('id').primaryKey(),
  questionId: text('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isAnswer: integer('is_answer').notNull().default(0),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  studyUnit: one(studyUnits, {
    fields: [questions.studyUnitId],
    references: [studyUnits.id],
  }),
  choices: many(choices),
  questionSources: many(questionSources),
  questionImages: many(questionImages),
  writtenQuestion: one(writtenQuestions, {
    fields: [questions.id],
    references: [writtenQuestions.questionId],
  }),
  mcqQuestion: one(mcqQuestions, {
    fields: [questions.id],
    references: [mcqQuestions.questionId],
  }),
}));

export const questionImagesRelations = relations(questionImages, ({ one }) => ({
  question: one(questions, {
    fields: [questionImages.questionId],
    references: [questions.id],
  }),
}));

export const questionSourcesRelations = relations(questionSources, ({ one }) => ({
  question: one(questions, {
    fields: [questionSources.questionId],
    references: [questions.id],
  }),
}));

export const choicesRelations = relations(choices, ({ one }) => ({
  question: one(questions, {
    fields: [choices.questionId],
    references: [questions.id],
  }),
}));
