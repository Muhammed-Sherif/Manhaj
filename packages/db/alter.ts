import { db } from './index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await db().execute(sql`DELETE FROM questions WHERE telegram_message_id = 3997`);
  console.log('Done deleting 3997');
  process.exit(0);
}
run();
