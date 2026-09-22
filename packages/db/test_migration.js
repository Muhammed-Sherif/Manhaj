require('dotenv').config();
const postgres = require('postgres');
const fs = require('fs');
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  try {
    const file = fs.readFileSync('drizzle/0000_tearful_the_professor.sql', 'utf8');
    const queries = file.split('--> statement-breakpoint');
    for (const query of queries) {
        if(query.trim() === '') continue;
        console.log("Running:", query.trim().substring(0, 50));
        await sql.unsafe(query);
    }
    console.log("Success");
  } catch (e) {
    console.error("Failed!", e);
  } finally {
    process.exit(0);
  }
}
run();
