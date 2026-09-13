ALTER TABLE "case_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "case_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "drug_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "drug_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "fact_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "lecture_files" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lecture_files" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "lecture_videos" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lecture_videos" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "note_items" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "review_items" ADD COLUMN "deleted_at" timestamp;