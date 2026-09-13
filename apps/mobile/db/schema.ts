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

export const lectures = sqliteTable('lectures', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const lectureVideos = sqliteTable('lecture_videos', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  url: text('url').notNull(),
  duration: integer('duration').notNull(),
  localFilePath: text('local_file_path'),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const lectureFiles = sqliteTable('lecture_files', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id').references(() => lectures.id, { onDelete: 'set null' }),
  createdBy: text('created_by'),
  questionType: text('question_type').notNull().default('mcq'),
  questionText: text('question_text').notNull(),
  explanation: text('explanation').notNull(),
  source: text('source').notNull(),
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
  lectureVideoId: text('lecture_video_id').notNull(),
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

export const caseItems = sqliteTable('case_items', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  answer: text('answer'),
  createdAt: text('created_at').notNull(),
});

export const caseReviewable = sqliteTable('case_reviewable', {
  reviewableId: text('reviewable_id').primaryKey().references(() => reviewableItems.id, { onDelete: 'cascade' }),
  caseId: text('case_id').notNull().references(() => caseItems.id, { onDelete: 'cascade' }),
});

export const noteItems = sqliteTable('note_items', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id').notNull(),
  type: text('type').notNull(),
  content: text('content').notNull(),
  sourceQuestionId: text('source_question_id'),
  createdAt: text('created_at').notNull(),
});

export const noteReviewable = sqliteTable('note_reviewable', {
  reviewableId: text('reviewable_id').primaryKey().references(() => reviewableItems.id, { onDelete: 'cascade' }),
  noteId: text('note_id').notNull().references(() => noteItems.id, { onDelete: 'cascade' }),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  taskType: text('task_type').notNull(),
  recurrence: text('recurrence').notNull().default('once'),
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
  lectureId: text('lecture_id').notNull(),
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
  lectures: many(lectures),
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [lectures.subjectId],
    references: [subjects.id],
  }),
  lectureVideos: many(lectureVideos),
  lectureFiles: many(lectureFiles),
  questions: many(questions),
}));

export const lectureVideosRelations = relations(lectureVideos, ({ one }) => ({
  lecture: one(lectures, {
    fields: [lectureVideos.lectureId],
    references: [lectures.id],
  }),
}));

export const lectureFilesRelations = relations(lectureFiles, ({ one }) => ({
  lecture: one(lectures, {
    fields: [lectureFiles.lectureId],
    references: [lectures.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  lecture: one(lectures, {
    fields: [questions.lectureId],
    references: [lectures.id],
  }),
  choices: many(choices),
}));

export const choicesRelations = relations(choices, ({ one }) => ({
  question: one(questions, {
    fields: [choices.questionId],
    references: [questions.id],
  }),
}));
