/**
 * TEMPORARY Phase 0 migration — delete after use.
 *
 * Moves the live `case_items` / `note_items` from origin's shape to the shape
 * `packages/db/schema.ts` now declares. The two are not merely different — origin's
 * shape has NO producer anywhere in the codebase (the mobile app writes
 * category/content/answer; origin's server declared scenario/diagnosis/management that
 * nothing ever wrote), so this converges the database onto the model the clients
 * actually use.
 *
 *   case_items   add     category, content, answer, image_key, image_url,
 *                        image_upload_status, updated_at, deleted_at
 *                backfill content <- scenario + diagnosis
 *                         answer  <- management + key_points
 *                drop    scenario, diagnosis, management, key_points
 *
 *   note_items   add     type, content, source_question_id, image_key, image_url,
 *                        image_upload_status, updated_at, deleted_at
 *                backfill content <- note_text
 *                drop    note_text, is_starred
 *
 * Reversible in principle — `_phase0RevertReshape.ts` is the inverse — but the backfill
 * is lossy in one direction: `scenario + diagnosis` concatenated cannot be split back
 * into two columns. Read the preview before committing.
 *
 * Each table is planned as a UNIT: if any one step on a table is refused, none of that
 * table's steps run. A half-migrated table would be worse than one left alone.
 *
 * Dry-run by default. `--commit` applies. Every destructive step is preceded by a
 * printed breakdown of exactly what it will discard, so the decision is made on data.
 *
 * Run from the repo root:
 *   pnpm --filter @manhaj/db exec tsx src/_phase0MigrateCaseNote.ts
 *   pnpm --filter @manhaj/db exec tsx src/_phase0MigrateCaseNote.ts --commit
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

function findEnvFile(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'apps', 'api', '.env');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('Could not locate apps/api/.env walking up from ' + __dirname);
}

function readDatabaseUrl(): string {
  const match = fs.readFileSync(findEnvFile(), 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) throw new Error('No DATABASE_URL in env file');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const COMMIT = process.argv.includes('--commit');

interface AddColumn {
  column: string;
  definition: string;
}

interface TablePlan {
  table: string;
  /** Columns the new schema declares, with the definition it gives them. */
  add: AddColumn[];
  /**
   * The expression that produces `content` for a row being migrated, in terms of the
   * columns about to be dropped. `null` when the table needs no backfill.
   */
  contentBackfill?: string;
  /** Which source columns `contentBackfill` actually reads, for the label. */
  contentFrom?: string[];
  /** Optional second backfill, e.g. case_items.answer. */
  extraBackfill?: { column: string; expression: string };
  /** Columns the new schema does not declare. */
  drop: string[];
  /** The column that must not be NULL in any row after backfill. */
  requiredAfter: string;
}

const PLANS: TablePlan[] = [
  {
    table: 'case_items',
    add: [
      { column: 'category', definition: `text NOT NULL DEFAULT 'general'` },
      { column: 'content', definition: 'text' }, // promoted to NOT NULL after the backfill
      { column: 'answer', definition: 'text' },
      { column: 'image_key', definition: 'text' },
      { column: 'image_url', definition: 'text' },
      { column: 'image_upload_status', definition: `text NOT NULL DEFAULT 'none'` },
      { column: 'updated_at', definition: 'timestamp NOT NULL DEFAULT now()' },
      { column: 'deleted_at', definition: 'timestamp' },
    ],
    // A case is a flashcard: the title names it, the scenario IS the prompt, and the
    // diagnosis is the answer. Management and key points are elaboration on that answer.
    contentBackfill: `nullif(trim(coalesce(scenario, '') || E'\\n\\n' || coalesce(diagnosis, '')), '')`,
    contentFrom: ['scenario', 'diagnosis'],
    extraBackfill: {
      column: 'answer',
      expression: `nullif(trim(coalesce(management, '') || E'\\n\\n' || coalesce(key_points, '')), '')`,
    },
    drop: ['scenario', 'diagnosis', 'management', 'key_points'],
    requiredAfter: 'content',
  },
  {
    table: 'note_items',
    add: [
      { column: 'type', definition: `text NOT NULL DEFAULT 'general'` },
      { column: 'content', definition: 'text' }, // promoted to NOT NULL after the backfill
      { column: 'source_question_id', definition: 'uuid' }, // FK added separately
      { column: 'image_key', definition: 'text' },
      { column: 'image_url', definition: 'text' },
      { column: 'image_upload_status', definition: `text NOT NULL DEFAULT 'none'` },
      { column: 'updated_at', definition: 'timestamp NOT NULL DEFAULT now()' },
      { column: 'deleted_at', definition: 'timestamp' },
    ],
    contentBackfill: 'nullif(trim(note_text), \'\')',
    contentFrom: ['note_text'],
    drop: ['note_text', 'is_starred'],
    requiredAfter: 'content',
  },
];

async function main() {
  const sql = postgres(readDatabaseUrl(), { ssl: 'require', max: 1 });

  try {
    const columnsOf = async (table: string) => {
      const rows = await sql<any[]>`
        select column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema = 'public' and table_name = ${table}
      `;
      return new Map(rows.map((r) => [r.column_name as string, r]));
    };

    const countOf = async (table: string) => {
      const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(table)}`;
      return n;
    };

    const nonNullCount = async (table: string, column: string) => {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from ${sql(table)} where ${sql(column)} is not null
      `;
      return n;
    };

    /** Every distinct value of a column, so a planned drop is decided on the actual data. */
    const breakdown = async (table: string, column: string) => {
      const rows = await sql<any[]>`
        select ${sql(column)} as value, count(*)::int as n
        from ${sql(table)}
        group by ${sql(column)}
        order by n desc
        limit 10
      `;
      return rows;
    };

    /** The first few rows as the backfill would rewrite them — the mapping made visible. */
    const preview = async (table: string, expression: string, extra?: { column: string; expression: string }) => {
      const extraSelect = extra ? sql`, (${sql.unsafe(extra.expression)}) as ${sql(extra.column)}` : sql``;
      return sql<any[]>`
        select (${sql.unsafe(expression)}) as content${extraSelect}
        from ${sql(table)}
        limit 5
      `;
    };

    const allSteps: { label: string; sql: string }[] = [];
    const blocked: string[] = [];
    const notes: string[] = [];

    for (const plan of PLANS) {
      const cols = await columnsOf(plan.table);
      if (cols.size === 0) {
        notes.push(`${plan.table} does not exist — skipped`);
        continue;
      }

      const rows = await countOf(plan.table);
      const tableBlocked: string[] = [];
      const tableSteps: { label: string; sql: string }[] = [];

      console.log(`\n── ${plan.table}  (${rows} row${rows === 1 ? '' : 's'}) ${'─'.repeat(40)}`);

      // Is there anything to do at all? The script is idempotent — a table already in
      // the new shape reports that and drops out, so re-running after a failed attempt
      // is safe by construction.
      const alreadyMigrated =
        cols.has(plan.requiredAfter) && plan.drop.every((column) => !cols.has(column));
      if (alreadyMigrated) {
        notes.push(`${plan.table} is already in the new shape — nothing to do`);
        continue;
      }

      // ── The drop is the destructive half. Show what it discards before planning it. ──
      for (const column of plan.drop) {
        if (!cols.has(column)) continue;
        const populated = await nonNullCount(plan.table, column);
        if (populated === 0) {
          console.log(`  drop ${column}: empty (0 non-null)`);
          continue;
        }
        console.log(`  drop ${column}: ${populated} non-null value(s), breakdown:`);
        for (const row of await breakdown(plan.table, column)) {
          const shown = String(row.value ?? 'NULL').replace(/\s+/g, ' ').slice(0, 60);
          console.log(`      ${String(row.n).padStart(5)}  ${shown}${String(row.value ?? '').length > 60 ? '…' : ''}`);
        }
      }

      // ── What the backfill would produce. ──
      if (plan.contentBackfill) {
        const sourceColumns = plan.contentFrom ?? plan.drop;
        if (sourceColumns.some((c) => cols.has(c))) {
          console.log(`  backfill content <- ${sourceColumns.join(' + ')}:`);
          for (const row of await preview(plan.table, plan.contentBackfill, plan.extraBackfill)) {
            const content = String(row.content ?? 'NULL').replace(/\s+/g, ' ').slice(0, 70);
            console.log(`      content: ${content}${String(row.content ?? '').length > 70 ? '…' : ''}`);
            if (plan.extraBackfill) {
              const answer = String(row[plan.extraBackfill.column] ?? 'NULL').replace(/\s+/g, ' ').slice(0, 70);
              console.log(`      answer:  ${answer}`);
            }
          }
        }
      }

      // ── Plan the adds. ──
      for (const { column, definition } of plan.add) {
        if (cols.has(column)) continue;
        tableSteps.push({
          label: `add     ${plan.table}.${column}  ${definition}`,
          sql: `ALTER TABLE ${plan.table} ADD COLUMN ${column} ${definition}`,
        });
      }

      // `content` is added nullable above and tightened below, so a populated table can be
      // backfilled first. Backfilling a NOT NULL column in place is impossible.
      const needsContentTightening = !cols.has(plan.requiredAfter) && plan.contentBackfill;

      if (needsContentTightening) {
        const sourceColumns = plan.contentFrom ?? plan.drop;
        if (sourceColumns.some((c) => cols.has(c))) {
          tableSteps.push({
            label: `backfill ${plan.table}.content from ${sourceColumns.join(' + ')}`,
            sql: `UPDATE ${plan.table} SET content = ${plan.contentBackfill}`,
          });
          if (plan.extraBackfill) {
            const target = plan.extraBackfill.column;
            tableSteps.push({
              label: `backfill ${plan.table}.${target}`,
              sql: `UPDATE ${plan.table} SET ${target} = ${plan.extraBackfill.expression}`,
            });
          }
        }
        tableSteps.push({
          label: `notnull ${plan.table}.content`,
          sql: `ALTER TABLE ${plan.table} ALTER COLUMN content SET NOT NULL`,
        });
      }

      // ── Plan the drops, only once the backfill is known to cover everything. ──
      if (plan.contentBackfill && rows > 0) {
        const sourceColumns = plan.contentFrom ?? plan.drop;
        if (sourceColumns.some((c) => cols.has(c))) {
          // Refuse if any row would end up with a NULL content — that is the one outcome
          // that silently loses a user's work instead of loudly refusing.
          const orphanCheck = await sql<{ n: number }[]>`
            select count(*)::int as n from ${sql(plan.table)}
            where (${sql.unsafe(plan.contentBackfill)}) is null
          `;
          const orphans = orphanCheck[0].n;
          if (orphans > 0) {
            tableBlocked.push(
              `${plan.table}: ${orphans} row(s) produce a NULL content — backfill cannot cover them`
            );
          }
        }
      }

      for (const column of plan.drop) {
        if (!cols.has(column)) continue;
        const populated = await nonNullCount(plan.table, column);
        if (populated > 0 && !plan.contentBackfill) {
          tableBlocked.push(
            `${plan.table}.${column} holds ${populated} non-null value(s) and nothing backfills them`
          );
          continue;
        }
        tableSteps.push({
          label: `drop    ${plan.table}.${column}`,
          sql: `ALTER TABLE ${plan.table} DROP COLUMN ${column}`,
        });
      }

      if (tableBlocked.length > 0) {
        // All-or-nothing: a half-migrated table is worse than an untouched one.
        for (const b of tableBlocked) blocked.push(`${b} — whole table skipped`);
        notes.push(`${plan.table}: ${tableSteps.length} step(s) withheld because of the above`);
      } else {
        allSteps.push(...tableSteps);
      }
    }

    // ── The FK on note_items.source_question_id, mirroring the Drizzle declaration. ──
    // The column may not exist yet at this point — this same run can be the thing that adds
    // it — so the gate is "will it exist", not "does it exist".
    {
      const cols = await columnsOf('note_items');
      const plannedAdd = PLANS.find((p) => p.table === 'note_items')
        ?.add.some((c) => c.column === 'source_question_id');
      if (cols.has('source_question_id') || plannedAdd) {
        const [{ n }] = await sql<{ n: number }[]>`
          select count(*)::int as n
          from information_schema.table_constraints
          where table_schema = 'public' and table_name = 'note_items'
            and constraint_type = 'FOREIGN KEY'
            and constraint_name = 'note_items_source_question_id_questions_id_fk'
        `;
        if (n === 0) {
          allSteps.push({
            label: 'fk      note_items.source_question_id -> questions.id',
            sql: `ALTER TABLE note_items ADD CONSTRAINT note_items_source_question_id_questions_id_fk
                  FOREIGN KEY (source_question_id) REFERENCES questions(id) ON DELETE SET NULL`,
          });
        }
      }
    }

    // ── Report ───────────────────────────────────────────────────────────────
    console.log('\n============================================================');
    console.log(COMMIT ? ' APPLYING' : ' PLAN (dry run)');
    console.log('============================================================');
    if (allSteps.length === 0) console.log('  Nothing to do.');
    for (const s of allSteps) console.log(`  ${s.label}`);

    if (notes.length > 0) {
      console.log('\n  Skipped:');
      for (const n of notes) console.log(`    - ${n}`);
    }

    if (blocked.length > 0) {
      console.log('\n  REFUSED — needs a human decision:');
      for (const b of blocked) console.log(`    ! ${b}`);
    }

    if (!COMMIT) {
      console.log('\nDRY RUN — nothing applied. Re-run with --commit to apply.');
      return;
    }
    if (allSteps.length === 0) return;

    // Capture the pre-migration schema of everything about to be touched, so the DDL has a
    // written record even though the tables hold no rows to lose.
    {
      const snapshot: Record<string, unknown> = { takenAt: new Date().toISOString() };
      for (const plan of PLANS) {
        const cols = await columnsOf(plan.table);
        if (cols.size === 0) continue;
        snapshot[plan.table] = {
          rows: await countOf(plan.table),
          columns: [...cols.values()],
        };
      }
      const dir = path.join(__dirname, '..', 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `case-note-preschema-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
      console.log(`\nPre-migration schema captured: ${file}`);
    }

    await sql.begin(async (tx) => {
      for (const s of allSteps) {
        await tx.unsafe(s.sql);
        console.log(`  ok  ${s.label}`);
      }
    });

    console.log(`\nApplied ${allSteps.length} change(s).`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
