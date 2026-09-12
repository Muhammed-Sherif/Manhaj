/**
 * Backfill script — run ONCE after the schema migration.
 *
 * What it does:
 *   1. For every existing `questions` row that has no `mcq_questions` subclass row,
 *      insert a row into `mcq_questions`.
 *
 * Safe to run multiple times — uses onConflictDoNothing.
 * Run: npx ts-node backfill-mcq.ts
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { db, questions, mcqQuestions } from '@manhaj/db';

dotenv.config({ path: path.resolve(__dirname, '../../apps/api/.env') });

const database = db();

async function backfill() {
  console.log('🔄 Starting backfill: mcq_questions rows for existing questions...\n');

  // Get all question IDs
  const allQuestions = await database
    .select({ id: questions.id })
    .from(questions);

  // Get existing mcq_questions rows
  const existingRows = await database
    .select({ questionId: mcqQuestions.questionId })
    .from(mcqQuestions);

  const existingIds = new Set(existingRows.map(r => r.questionId));
  const toBackfill = allQuestions.filter(q => !existingIds.has(q.id));

  console.log(`📊 Total questions: ${allQuestions.length}`);
  console.log(`✅ Already backfilled: ${existingRows.length}`);
  console.log(`🆕 Need to insert: ${toBackfill.length}\n`);

  if (toBackfill.length === 0) {
    console.log('Nothing to do — all questions already have mcq_questions rows.');
    process.exit(0);
  }

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < toBackfill.length; i += BATCH_SIZE) {
    const batch = toBackfill.slice(i, i + BATCH_SIZE);
    await database
      .insert(mcqQuestions)
      .values(batch.map(q => ({ questionId: q.id })))
      .onConflictDoNothing();
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${toBackfill.length}...`);
  }

  console.log(`\n✅ Done — inserted ${inserted} mcq_questions rows.`);
  process.exit(0);
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
