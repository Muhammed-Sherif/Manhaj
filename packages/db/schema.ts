import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const authProviderEnum = pgEnum('auth_provider', ['google', 'credentials']);
export const roleEnum = pgEnum('role', ['student', 'admin']);
export const questionSourceEnum = pgEnum('question_source', ['telegram_auto', 'admin_manual']);

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

export const lectures = pgTable('lectures', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const lectureFiles = pgTable('lecture_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
});

export const lectureVideos = pgTable('lecture_videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  sourceName: text('source_name').notNull(),
  url: text('url').notNull(),
  duration: integer('duration').notNull(),
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
  lectureId: uuid('lecture_id').references(() => lectures.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  questionText: text('question_text').notNull(),
  explanation: text('explanation').notNull(),
  source: questionSourceEnum('source').notNull(),
  telegramMessageId: integer('telegram_message_id').unique(),
});

export const choices = pgTable('choices', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  choiceText: text('choice_text').notNull(),
  isCorrect: boolean('is_correct').notNull(),
});

export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  choiceId: uuid('choice_id').notNull().references(() => choices.id, { onDelete: 'cascade' }),
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
  lectures: many(lectures),
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [lectures.subjectId],
    references: [subjects.id],
  }),
  lectureFiles: many(lectureFiles),
  lectureVideos: many(lectureVideos),
  questions: many(questions),
}));

export const lectureFilesRelations = relations(lectureFiles, ({ one }) => ({
  lecture: one(lectures, {
    fields: [lectureFiles.lectureId],
    references: [lectures.id],
  }),
}));

export const lectureVideosRelations = relations(lectureVideos, ({ one, many }) => ({
  lecture: one(lectures, {
    fields: [lectureVideos.lectureId],
    references: [lectures.id],
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
  lecture: one(lectures, {
    fields: [questions.lectureId],
    references: [lectures.id],
  }),
  creator: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
  choices: many(choices),
  attempts: many(attempts),
  flags: many(flags),
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

// TypeScript types
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Lecture = typeof lectures.$inferSelect;
export type NewLecture = typeof lectures.$inferInsert;

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
