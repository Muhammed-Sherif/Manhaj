import { db } from './config/database.js';
import { quranChapters, quranVerses } from '@manhaj/db/schema';

async function check() {
  try {
    const chapters = await db.select().from(quranChapters).limit(1);
    const verses = await db.select().from(quranVerses).limit(1);
    console.log('Chapters found:', chapters.length);
    console.log('Verses found:', verses.length);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

check();
