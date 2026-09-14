import { getDb } from './index.js';
import postgres from 'postgres';

async function migrate() {
  console.log('Creating Quran tables directly...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client = postgres(connectionString);
  
  try {
    await client`
      CREATE TABLE IF NOT EXISTS "quran_chapters" (
        "id" integer PRIMARY KEY NOT NULL,
        "name_ar" text NOT NULL,
        "name_en" text NOT NULL,
        "verses_count" integer NOT NULL
      );
    `;
    
    await client`
      CREATE TABLE IF NOT EXISTS "quran_verses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chapter_id" integer NOT NULL,
        "aya_number" integer NOT NULL,
        "page" integer NOT NULL,
        "text_ar" text NOT NULL
      );
    `;
    
    await client`
      DO $$ BEGIN
       ALTER TABLE "quran_verses" ADD CONSTRAINT "quran_verses_chapter_id_quran_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."quran_chapters"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `;
    
    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

migrate();
