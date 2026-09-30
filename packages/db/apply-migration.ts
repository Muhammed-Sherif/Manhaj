import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../apps/api/.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function applyMigration() {
  try {

    const qResult = await sql`
      SELECT id, question_text FROM questions WHERE question_text ILIKE '%diagnosis is most consistent with these findings%';
    `;
    console.log(qResult);
    if (qResult.length > 0) {
      const qImgs = await sql`SELECT * FROM question_images WHERE question_id = ${qResult[0].id}`;
      console.log("Images for question:", qImgs);
    }
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();