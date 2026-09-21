import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://manhaj_owner:npg_QYasFMfuec28@ep-spring-smoke-b2iwguzq.c-6.eu-central-1.aws.neon.tech/manhaj?sslmode=require");
const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log("=== Tables in public schema ===");
rows.forEach(r => console.log(" -", r.table_name));
console.log("Total:", rows.length, "tables");
const hasQuestions = rows.some(r => r.table_name === "questions");
console.log('"questions" table exists?', hasQuestions ? "YES" : "NO - IT IS MISSING!");
