import { getDb } from '../index.js';
import { quranChapters, quranVerses } from '../schema.js';
import * as Crypto from 'node:crypto';

async function seedQuran() {
  console.log('Fetching Quran data from alquran.cloud API...');
  const db = getDb();
  
  try {
    // We use alquran.cloud for the Uthmani script as it provides the entire Quran
    // perfectly formatted in a single unpaginated JSON response that matches our schema.
    const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
    if (!response.ok) {
      throw new Error(`API failed with status: ${response.status}`);
    }
    
    const json = await response.json();
    const surahs = json.data.surahs;
    
    console.log(`Fetched ${surahs.length} surahs. Seeding database...`);
    
    for (const surah of surahs) {
      console.log(`Inserting Surah ${surah.number}: ${surah.englishName}`);
      
      // Insert Chapter
      await db.insert(quranChapters).values({
        id: surah.number,
        nameAr: surah.name,
        nameEn: surah.englishName,
        versesCount: surah.ayahs.length,
      }).onConflictDoNothing();
      
      // Prepare Verses for batch insertion
      const versesToInsert = surah.ayahs.map((ayah: any) => ({
        id: Crypto.randomUUID(),
        chapterId: surah.number,
        ayaNumber: ayah.numberInSurah,
        page: ayah.page,
        textAr: ayah.text,
      }));
      
      // Batch insert verses (we do it per surah to avoid memory issues and query limits)
      await db.insert(quranVerses).values(versesToInsert).onConflictDoNothing();
    }
    
    console.log('Successfully seeded Quran data!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed Quran:', error);
    process.exit(1);
  }
}

seedQuran();
