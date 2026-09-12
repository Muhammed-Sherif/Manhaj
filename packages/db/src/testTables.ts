import { config } from 'dotenv';
import postgres from 'postgres';
config({ path: '../../apps/api/.env' });
const sql = postgres(process.env.DATABASE_URL!);
async function run() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log(tables.map(t => t.table_name));
  
  await sql`DROP TABLE IF EXISTS __drizzle_migrations CASCADE;`;
  
  process.exit(0);
}
run();
