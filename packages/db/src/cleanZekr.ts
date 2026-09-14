import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'path';

config({ path: '../../apps/api/.env' }); // load from api folder

const sql = postgres(process.env.DATABASE_URL!);

async function clean() {
  try {
    // Find categories that have zero duas in the catalog (stale leftovers from old seed)
    const emptyCategories = await sql`
      SELECT c.id, c.category_number, c.name_en
      FROM zekr_categories c
      LEFT JOIN zekr_catalog z ON z.category_id = c.id
      GROUP BY c.id, c.category_number, c.name_en
      HAVING COUNT(z.id) = 0
      ORDER BY c.category_number
    `;

    if (emptyCategories.length === 0) {
      console.log('No empty categories found. Nothing to clean.');
    } else {
      console.log(`Found ${emptyCategories.length} empty categories to delete:`);
      console.table(emptyCategories);

      for (const cat of emptyCategories) {
        await sql`DELETE FROM zekr_categories WHERE id = ${cat.id}`;
        console.log(`Deleted: ${cat.name_en} (number ${cat.category_number})`);
      }
    }

    // Verify final state
    const finalCats = await sql`SELECT COUNT(*)::int AS total FROM zekr_categories`;
    const finalDuas = await sql`SELECT COUNT(*)::int AS total FROM zekr_catalog`;
    console.log(`\nFinal state: ${finalCats[0].total} categories, ${finalDuas[0].total} duas`);

    // Sanity check against API
    const catRes = await fetch('https://api.islamic.app/v1/dhikr');
    const catData = await catRes.json();
    const apiCats = catData.data.categories.length;
    const apiDuas = catData.data.categories.reduce((s: number, c: any) => s + c.count, 0);
    console.log(`API state:    ${apiCats} categories, ${apiDuas} duas`);
    console.log(finalCats[0].total === apiCats && finalDuas[0].total === apiDuas ? '✅ MATCH!' : '❌ STILL MISMATCHED!');

    await sql.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clean();
