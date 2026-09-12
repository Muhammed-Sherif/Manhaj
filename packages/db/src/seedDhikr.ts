import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';
import path from 'path';

config({ path: '../../apps/api/.env' }); // load from api folder

const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient, { schema });

async function seed() {
  try {

    console.log('Creating tables...');
    await queryClient`
      CREATE TABLE IF NOT EXISTS zekr_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_number integer NOT NULL,
        name_en text NOT NULL,
        name_ar text NOT NULL
      );
    `;

    await queryClient`
      CREATE TABLE IF NOT EXISTS zekr_catalog (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id uuid NOT NULL REFERENCES zekr_categories(id) ON DELETE CASCADE,
        dua_number integer NOT NULL,
        slug text,
        transliteration text,
        text_en text NOT NULL,
        text_ar text NOT NULL,
        virtue text,
        source text,
        repeat_count integer NOT NULL DEFAULT 1
      );
    `;

    await queryClient`
      CREATE TABLE IF NOT EXISTS zekr_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        zekr_id uuid REFERENCES zekr_catalog(id) ON DELETE SET NULL,
        custom_zekr_text text,
        zekr_count integer NOT NULL,
        zekr_achieved_count integer NOT NULL DEFAULT 0
      );
    `;
    console.log('Tables created.');

    console.log('Fetching categories...');
    const catRes = await fetch('https://api.islamic.app/v1/dhikr');
    const catData = await catRes.json();
    const categories = catData.data.categories;

    console.log(`Found ${categories.length} categories. Clearing existing zekr tables...`);
    
    // Drop logic moved to dropZekr.ts, so we just assume tables are fresh.
    
    for (const cat of categories) {
      console.log(`Inserting category ${cat.number}: ${cat.en}`);
      const [insertedCat] = await db.insert(schema.zekrCategories).values({
        categoryNumber: parseInt(cat.number, 10),
        nameEn: cat.en,
        nameAr: cat.ar,
      }).returning();

      // Fetch duas for this category
      const duaRes = await fetch(`https://api.islamic.app/v1/dhikr/${cat.number}`);
      const duaData = await duaRes.json();
      
      const duasToInsert = duaData.data.duas.map((dua: any) => {
        let repeatCount = 1;
        if (dua.repeatCount !== undefined && dua.repeatCount !== null) {
          repeatCount = typeof dua.repeatCount === 'string' ? parseInt(dua.repeatCount, 10) : dua.repeatCount;
        }

        return {
          categoryId: insertedCat.id,
          duaNumber: parseInt(dua.number, 10),
          slug: dua.slug || null,
          transliteration: dua.transliteration?.en || null,
          textEn: dua.en.text,
          textAr: dua.ar.text,
          virtue: dua.virtue?.en || null,
          source: dua.source?.en || dua.source?.ar || null,
          repeatCount,
        };
      });

      if (duasToInsert.length > 0) {
        await db.insert(schema.zekrCatalog).values(duasToInsert);
      }
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seed();
