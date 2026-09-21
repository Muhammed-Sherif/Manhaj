-- 1. Rename the table
ALTER TABLE "lectures" RENAME TO "study_units";

-- 2. Add type discriminator and order
CREATE TYPE "public"."study_unit_type" AS ENUM('lecture', 'section');
ALTER TABLE "study_units" ADD COLUMN "type" "public"."study_unit_type" NOT NULL DEFAULT 'lecture';
ALTER TABLE "study_units" ADD COLUMN "order" integer;

-- 3. Backfill: every existing row was a lecture
UPDATE "study_units" SET "type" = 'lecture';

-- 4. Rename the FK column on each child table
ALTER TABLE "case_items"     RENAME COLUMN "lecture_id"  TO "study_unit_id";
ALTER TABLE "note_items"     RENAME COLUMN "lecture_id"  TO "study_unit_id";
ALTER TABLE "questions"      RENAME COLUMN "lecture_id"  TO "study_unit_id";
ALTER TABLE "lecture_files"  RENAME COLUMN "lecture_id"  TO "study_unit_id";
ALTER TABLE "lecture_videos" RENAME COLUMN "lecture_id"  TO "study_unit_id";
ALTER TABLE "study_tasks"    RENAME COLUMN "lecture_id"  TO "study_unit_id";
