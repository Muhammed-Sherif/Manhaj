CREATE TYPE "public"."task_type" AS ENUM('zekr', 'wird');--> statement-breakpoint
CREATE TYPE "public"."wird_mode" AS ENUM('by_ayat', 'by_pages');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"scheduled_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wird_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"wird_mode" "wird_mode" NOT NULL,
	"start_aya" text,
	"end_aya" text,
	"page_count" integer,
	"achieved_page_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "zekr_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"transliteration" text,
	"meaning" text,
	"source" text,
	"default_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zekr_tasks" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"zekr_id" uuid,
	"custom_zekr_text" text,
	"zekr_count" integer NOT NULL,
	"zekr_achieved_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wird_tasks" ADD CONSTRAINT "wird_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zekr_tasks" ADD CONSTRAINT "zekr_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zekr_tasks" ADD CONSTRAINT "zekr_tasks_zekr_id_zekr_list_id_fk" FOREIGN KEY ("zekr_id") REFERENCES "public"."zekr_list"("id") ON DELETE set null ON UPDATE no action;