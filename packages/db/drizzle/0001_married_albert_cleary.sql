CREATE TYPE "public"."review_grade" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."review_item_type" AS ENUM('question', 'case', 'note', 'drug', 'fact');--> statement-breakpoint
CREATE TABLE "case_items" (
	"review_item_id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid,
	"title" text NOT NULL,
	"scenario" text NOT NULL,
	"diagnosis" text NOT NULL,
	"management" text,
	"key_points" text
);
--> statement-breakpoint
CREATE TABLE "drug_items" (
	"review_item_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"drug_class" text,
	"mechanism" text,
	"indications" text,
	"contraindications" text,
	"side_effects" text,
	"mnemonic" text
);
--> statement-breakpoint
CREATE TABLE "fact_items" (
	"review_item_id" uuid PRIMARY KEY NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_items" (
	"review_item_id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid,
	"note_text" text NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_review_items" (
	"review_item_id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" "review_item_type" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"grade" "review_grade" NOT NULL,
	"interval_before" integer NOT NULL,
	"interval_after" integer NOT NULL,
	"ease_factor_after" integer NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_items" ADD CONSTRAINT "case_items_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_items" ADD CONSTRAINT "case_items_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_items" ADD CONSTRAINT "drug_items_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_items" ADD CONSTRAINT "fact_items_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_items" ADD CONSTRAINT "note_items_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_items" ADD CONSTRAINT "note_items_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review_items" ADD CONSTRAINT "question_review_items_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_review_items" ADD CONSTRAINT "question_review_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;