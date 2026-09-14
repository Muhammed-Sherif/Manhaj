CREATE TYPE "public"."review_state" AS ENUM('new', 'learning', 'review', 'relearning');--> statement-breakpoint
CREATE TYPE "public"."study_task_activity" AS ENUM('watch', 'solve', 'revision');--> statement-breakpoint
CREATE TYPE "public"."task_recurrence" AS ENUM('once', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'done', 'missed');--> statement-breakpoint
CREATE TYPE "public"."work_task_category" AS ENUM('programming', 'video_editing');--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'work';--> statement-breakpoint
ALTER TYPE "public"."task_type" ADD VALUE 'study';--> statement-breakpoint
CREATE TABLE "quran_chapters" (
	"id" integer PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"verses_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quran_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" integer NOT NULL,
	"aya_number" integer NOT NULL,
	"page" integer NOT NULL,
	"text_ar" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid NOT NULL,
	"activity_type" "study_task_activity" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"category" "work_task_category" NOT NULL,
	"project_name" text NOT NULL,
	"description" text,
	"link" text,
	"cost" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zekr_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"dua_number" integer NOT NULL,
	"slug" text,
	"transliteration" text,
	"text_en" text NOT NULL,
	"text_ar" text NOT NULL,
	"virtue" text,
	"source" text,
	"repeat_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zekr_list" RENAME TO "zekr_categories";--> statement-breakpoint
ALTER TABLE "wird_tasks" RENAME COLUMN "start_aya" TO "start_verse_id";--> statement-breakpoint
ALTER TABLE "wird_tasks" RENAME COLUMN "end_aya" TO "end_verse_id";--> statement-breakpoint
ALTER TABLE "wird_tasks" RENAME COLUMN "achieved_page_count" TO "last_achieved_page";--> statement-breakpoint
ALTER TABLE "zekr_tasks" DROP CONSTRAINT "zekr_tasks_zekr_id_zekr_list_id_fk";
--> statement-breakpoint
ALTER TABLE "review_items" ALTER COLUMN "interval" SET DEFAULT 0;--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'zekr_tasks'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "zekr_tasks" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "state" "review_state" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "current_step_index" integer;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "lapses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "review_logs" ADD COLUMN "state_before" "review_state" DEFAULT 'review' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" "task_recurrence" DEFAULT 'once' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "start_time" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "end_time" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "consumed_time" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_time" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "status" "task_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "achieved_from" text;--> statement-breakpoint
ALTER TABLE "wird_tasks" ADD COLUMN "start_page" integer;--> statement-breakpoint
ALTER TABLE "wird_tasks" ADD COLUMN "end_page" integer;--> statement-breakpoint
ALTER TABLE "zekr_categories" ADD COLUMN "category_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "zekr_categories" ADD COLUMN "name_en" text NOT NULL;--> statement-breakpoint
ALTER TABLE "zekr_categories" ADD COLUMN "name_ar" text NOT NULL;--> statement-breakpoint
ALTER TABLE "zekr_tasks" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "quran_verses" ADD CONSTRAINT "quran_verses_chapter_id_quran_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."quran_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tasks" ADD CONSTRAINT "work_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zekr_catalog" ADD CONSTRAINT "zekr_catalog_category_id_zekr_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."zekr_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wird_tasks" ADD CONSTRAINT "wird_tasks_start_verse_id_quran_verses_id_fk" FOREIGN KEY ("start_verse_id") REFERENCES "public"."quran_verses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wird_tasks" ADD CONSTRAINT "wird_tasks_end_verse_id_quran_verses_id_fk" FOREIGN KEY ("end_verse_id") REFERENCES "public"."quran_verses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zekr_tasks" ADD CONSTRAINT "zekr_tasks_zekr_id_zekr_catalog_id_fk" FOREIGN KEY ("zekr_id") REFERENCES "public"."zekr_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "is_completed";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "completed_at";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "scheduled_date";--> statement-breakpoint
ALTER TABLE "wird_tasks" DROP COLUMN "page_count";--> statement-breakpoint
ALTER TABLE "zekr_categories" DROP COLUMN "text";--> statement-breakpoint
ALTER TABLE "zekr_categories" DROP COLUMN "transliteration";--> statement-breakpoint
ALTER TABLE "zekr_categories" DROP COLUMN "meaning";--> statement-breakpoint
ALTER TABLE "zekr_categories" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "zekr_categories" DROP COLUMN "default_count";--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "unique_task_recurrence" UNIQUE("user_id","task_type","start_time","end_time");