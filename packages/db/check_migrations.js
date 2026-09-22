require('dotenv').config();
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  try {
    const res = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC`;
    console.log(res);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
