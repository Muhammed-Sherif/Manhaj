import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import { questionImages, caseItems, noteItems } from '@manhaj/db/schema';

async function run() {
  try {
    console.log('Updating question_images...');
    await db.execute(sql`
      UPDATE question_images 
      SET image_url = REPLACE(image_url, '/manhaj/', '/manhaj-public/')
      WHERE image_url LIKE '%/manhaj/%'
    `);
    
    console.log('Updating case_items...');
    await db.execute(sql`
      UPDATE case_items 
      SET image_url = REPLACE(image_url, '/manhaj/', '/manhaj-public/')
      WHERE image_url LIKE '%/manhaj/%'
    `);
    
    console.log('Updating note_items...');
    await db.execute(sql`
      UPDATE note_items 
      SET image_url = REPLACE(image_url, '/manhaj/', '/manhaj-public/')
      WHERE image_url LIKE '%/manhaj/%'
    `);
    
    console.log('All URLs updated to use manhaj-public successfully!');
  } catch (error: any) {
    console.error('Failed to update database:', error.message);
  }
  process.exit(0);
}
run();
