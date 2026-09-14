import { getDb } from './index.js';
import postgres from 'postgres';

async function migrate() {
  console.log('Migrating wird_tasks table...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client = postgres(connectionString);
  
  try {
    await client`ALTER TABLE "wird_tasks" DROP COLUMN IF EXISTS "start_aya"`;
    await client`ALTER TABLE "wird_tasks" DROP COLUMN IF EXISTS "end_aya"`;
    await client`ALTER TABLE "wird_tasks" DROP COLUMN IF EXISTS "page_count"`;
    await client`ALTER TABLE "wird_tasks" DROP COLUMN IF EXISTS "achieved_page_count"`;

    await client`ALTER TABLE "wird_tasks" ADD COLUMN IF NOT EXISTS "start_verse_id" uuid`;
    await client`ALTER TABLE "wird_tasks" ADD COLUMN IF NOT EXISTS "end_verse_id" uuid`;
    await client`ALTER TABLE "wird_tasks" ADD COLUMN IF NOT EXISTS "start_page" integer`;
    await client`ALTER TABLE "wird_tasks" ADD COLUMN IF NOT EXISTS "end_page" integer`;
    await client`ALTER TABLE "wird_tasks" ADD COLUMN IF NOT EXISTS "last_achieved_page" integer`;

    await client`
      DO $$ BEGIN
       ALTER TABLE "wird_tasks" ADD CONSTRAINT "wird_tasks_start_verse_id_quran_verses_id_fk" FOREIGN KEY ("start_verse_id") REFERENCES "public"."quran_verses"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await client`
      DO $$ BEGIN
       ALTER TABLE "wird_tasks" ADD CONSTRAINT "wird_tasks_end_verse_id_quran_verses_id_fk" FOREIGN KEY ("end_verse_id") REFERENCES "public"."quran_verses"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;
    
    console.log('wird_tasks migrated successfully!');
  } catch (err) {
    console.error('Error migrating wird_tasks:', err);
  } finally {
    await client.end();
  }
}

migrate();
