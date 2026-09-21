CREATE TYPE "public"."task_recurrence_status" AS ENUM('active', 'stopped');--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "answer" text;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "image_upload_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "source_question_id" uuid;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "image_upload_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_status" "task_recurrence_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_items" ADD CONSTRAINT "note_items_source_question_id_questions_id_fk" FOREIGN KEY ("source_question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_items" DROP COLUMN "scenario";--> statement-breakpoint
ALTER TABLE "case_items" DROP COLUMN "diagnosis";--> statement-breakpoint
ALTER TABLE "case_items" DROP COLUMN "management";--> statement-breakpoint
ALTER TABLE "case_items" DROP COLUMN "key_points";--> statement-breakpoint
ALTER TABLE "note_items" DROP COLUMN "note_text";--> statement-breakpoint
ALTER TABLE "note_items" DROP COLUMN "is_starred";