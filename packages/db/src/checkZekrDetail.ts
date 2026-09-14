import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

config({ path: '../../apps/api/.env' }); // load from api folder

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  try {
    // Check category 27 (morning/evening) in detail
    console.log('=== Category 27 (Morning & Evening) rows ===');
    const cat27 = await sql`
      SELECT id, category_number, name_en FROM zekr_categories WHERE category_number = 27
    `;
    console.table(cat27);

    for (const c of cat27) {
      const duas = await sql`
        SELECT dua_number, LEFT(text_en, 60) AS text_preview, repeat_count
        FROM zekr_catalog WHERE category_id = ${c.id} ORDER BY dua_number
      `;
      console.log(`\nCategory id ${c.id} has ${duas.length} duas:`);
      console.table(duas);
    }

    // Check which duplicate categories (1-5) have duas
    console.log('\n=== Duplicate categories 1-5: duas per copy ===');
    const dupDetail = await sql`
      SELECT c.id, c.category_number, c.name_en, COUNT(z.id)::int AS dua_count
      FROM zekr_categories c
      LEFT JOIN zekr_catalog z ON z.category_id = c.id
      WHERE c.category_number IN (1,2,3,4,5)
      GROUP BY c.id, c.category_number, c.name_en
      ORDER BY c.category_number, dua_count
    `;
    console.table(dupDetail);

    // Check for duplicate duas within same category (same dua_number twice)
    console.log('\n=== Duplicate dua_numbers within a category ===');
    const dupDuas = await sql`
      SELECT z.category_id, c.category_number, z.dua_number, COUNT(*)::int AS times
      FROM zekr_catalog z
      JOIN zekr_categories c ON c.id = z.category_id
      GROUP BY z.category_id, c.category_number, z.dua_number
      HAVING COUNT(*) > 1
      ORDER BY c.category_number
    `;
    if (dupDuas.length === 0) console.log('No duplicate duas!');
    else console.table(dupDuas);

    // Total duas in DB
    const total = await sql`SELECT COUNT(*)::int AS total_duas FROM zekr_catalog`;
    console.log(`\nTotal duas in Neon DB: ${total[0].total_duas}`);
    // API total: sum of counts
    const catRes = await fetch('https://api.islamic.app/v1/dhikr');
    const catData = await catRes.json();
    const apiTotal = catData.data.categories.reduce((s: number, c: any) => s + c.count, 0);
    console.log(`Total duas expected from API: ${apiTotal}`);

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
