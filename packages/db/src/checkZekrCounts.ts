import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

config({ path: '../../apps/api/.env' }); // load from api folder

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  try {
    const categories = await sql`
      SELECT c.category_number, c.name_en, c.name_ar, COUNT(z.id)::int AS dua_count
      FROM zekr_categories c
      LEFT JOIN zekr_catalog z ON z.category_id = c.id
      GROUP BY c.category_number, c.name_en, c.name_ar
      ORDER BY c.category_number
    `;

    const catRes = await fetch('https://api.islamic.app/v1/dhikr');
    const catData = await catRes.json();
    const apiCategories: { number: string; en: string; ar: string; count: number }[] = catData.data.categories;

    const dbMap = new Map(categories.map((c: any) => [c.category_number, c.dua_count]));
    const apiMap = new Map(apiCategories.map((c) => [parseInt(c.number, 10), c]));

    console.log('=== REAL MISMATCHES (API vs DB) ===');
    const mismatches: any[] = [];
    for (const apiCat of apiCategories) {
      const num = parseInt(apiCat.number, 10);
      const dbCount = dbMap.get(num);
      if (dbCount === undefined) {
        mismatches.push({ category: num, name: apiCat.en, apiCount: apiCat.count, dbCount: 'MISSING CATEGORY' });
      } else if (dbCount !== apiCat.count) {
        mismatches.push({ category: num, name: apiCat.en, apiCount: apiCat.count, dbCount });
      }
    }
    if (mismatches.length === 0) console.log('None! All categories match.');
    else console.table(mismatches);

    console.log('\n=== EXTRA CATEGORIES IN DB (not in API) ===');
    const extras: any[] = [];
    for (const [num, count] of dbMap.entries()) {
      if (!apiMap.has(num)) {
        const cat = categories.find((c: any) => c.category_number === num);
        extras.push({ category: num, name: cat?.name_en, nameAr: cat?.name_ar, duaCount: count });
      }
    }
    if (extras.length === 0) console.log('None!');
    else console.table(extras);

    console.log('\n=== DUPLICATE CATEGORY NUMBERS CHECK ===');
    const dups = await sql`
      SELECT category_number, COUNT(*)::int AS times, array_agg(id::text) AS ids
      FROM zekr_categories
      GROUP BY category_number
      HAVING COUNT(*) > 1
      ORDER BY category_number
    `;
    if (dups.length === 0) console.log('No duplicates!');
    else console.table(dups);

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
