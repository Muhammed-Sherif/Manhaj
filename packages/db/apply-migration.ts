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
    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), 'drizzle/0005_workable_king_bedlam.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration...');
    await sql.unsafe(migrationSQL);
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();