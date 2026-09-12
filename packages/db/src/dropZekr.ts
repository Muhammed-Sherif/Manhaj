import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

config({ path: '../../apps/api/.env' }); // load from api folder

const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  try {
    console.log('Dropping old tables if they exist...');
    await sql`DROP TABLE IF EXISTS zekr_tasks CASCADE`;
    await sql`DROP TABLE IF EXISTS zekr_list CASCADE`;
    await sql`DROP TABLE IF EXISTS zekr_catalog CASCADE`;
    await sql`DROP TABLE IF EXISTS zekr_categories CASCADE`;
    
    console.log('Drop successful. Please run drizzle-kit push now.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seed();
