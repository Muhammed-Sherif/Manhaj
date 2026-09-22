import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../apps/api/.env') });

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

async function migrate() {
  console.log('Starting migration: lectures → study_units...');

  // 1. Create the enum if it doesn't exist
  await sql`
    DO $$ BEGIN
      CREATE TYPE study_unit_type AS ENUM ('lecture', 'section');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `;
  console.log('✓ Ensured study_unit_type enum exists');

  // 2. Rename the lectures table to study_units (if not already done)
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lectures')
         AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_units') THEN
        ALTER TABLE lectures RENAME TO study_units;
        RAISE NOTICE 'Renamed lectures to study_units';
      ELSIF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_units') THEN
        CREATE TABLE study_units (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
          type study_unit_type NOT NULL DEFAULT 'lecture',
          "order" INTEGER,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          deleted_at TIMESTAMP
        );
        RAISE NOTICE 'Created study_units table';
      ELSE
        RAISE NOTICE 'study_units already exists, skipping rename';
      END IF;
    END $$;
  `;
  console.log('✓ study_units table ready');

  // 3. Add missing columns to study_units if they do not exist
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_units' AND column_name='type') THEN
        ALTER TABLE study_units ADD COLUMN type study_unit_type NOT NULL DEFAULT 'lecture';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_units' AND column_name='order') THEN
        ALTER TABLE study_units ADD COLUMN "order" INTEGER;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_units' AND column_name='updated_at') THEN
        ALTER TABLE study_units ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='study_units' AND column_name='deleted_at') THEN
        ALTER TABLE study_units ADD COLUMN deleted_at TIMESTAMP;
      END IF;
    END $$;
  `;
  console.log('✓ study_units columns verified');

  // 4. Fix lecture_videos: rename lecture_id to study_unit_id
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lecture_videos' AND column_name='lecture_id') THEN
        ALTER TABLE lecture_videos DROP CONSTRAINT IF EXISTS lecture_videos_lecture_id_fkey;
        ALTER TABLE lecture_videos RENAME COLUMN lecture_id TO study_unit_id;
        ALTER TABLE lecture_videos ADD CONSTRAINT lecture_videos_study_unit_id_fkey
          FOREIGN KEY (study_unit_id) REFERENCES study_units(id) ON DELETE CASCADE;
      ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lecture_videos' AND column_name='study_unit_id') THEN
        ALTER TABLE lecture_videos ADD COLUMN study_unit_id UUID NOT NULL REFERENCES study_units(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;
  console.log('✓ lecture_videos.study_unit_id fixed');

  // 5. Fix lecture_files: rename lecture_id to study_unit_id
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lecture_files' AND column_name='lecture_id') THEN
        ALTER TABLE lecture_files DROP CONSTRAINT IF EXISTS lecture_files_lecture_id_fkey;
        ALTER TABLE lecture_files RENAME COLUMN lecture_id TO study_unit_id;
        ALTER TABLE lecture_files ADD CONSTRAINT lecture_files_study_unit_id_fkey
          FOREIGN KEY (study_unit_id) REFERENCES study_units(id) ON DELETE CASCADE;
      ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lecture_files' AND column_name='study_unit_id') THEN
        ALTER TABLE lecture_files ADD COLUMN study_unit_id UUID NOT NULL REFERENCES study_units(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;
  console.log('✓ lecture_files.study_unit_id fixed');

  // 6. Fix questions: rename lecture_id to study_unit_id
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='lecture_id') THEN
        ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_lecture_id_fkey;
        ALTER TABLE questions RENAME COLUMN lecture_id TO study_unit_id;
        ALTER TABLE questions ADD CONSTRAINT questions_study_unit_id_fkey
          FOREIGN KEY (study_unit_id) REFERENCES study_units(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;
  console.log('✓ questions.study_unit_id fixed');

  // 7. Verify
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('study_units','lecture_videos','lecture_files','questions')
    ORDER BY table_name;
  `;
  console.log('\n✅ Migration complete! Tables:', tables.map((t: any) => t.table_name));

  const cols = await sql`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name IN ('lecture_videos','lecture_files','questions','study_units')
      AND column_name IN ('study_unit_id','lecture_id','type','order')
    ORDER BY table_name, column_name;
  `;
  console.log('Key columns:', cols.map((c: any) => `${c.table_name}.${c.column_name}`));
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
