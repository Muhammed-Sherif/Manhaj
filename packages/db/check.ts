import { db } from './index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const result = await db().execute(sql`SELECT * FROM question_images`);
  console.log('Images:', result);
  process.exit(0);
}
run();
