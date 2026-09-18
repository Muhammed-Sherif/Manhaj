/**
 * TEMPORARY Phase 0 migration — delete after use.
 *
 * Adds the Anki scheduler columns the code already reads but the live database does not
 * have. Unlike the case/note reshape these are purely additive: no column is dropped and
 * no data is rewritten, so the only way this can fail is by refusing.
 *
 *   review_state enum   new, learning, review, relearning
 *   review_items        state, current_step_index, lapses
 *   review_logs         state_before
 *
 * This is live-blocking, not cosmetic: `studentSyncService` writes `state`,
 * `current_step_index` and `lapses` on every review-item upsert, and the mobile client
 * already reads them back, so any sync against the current database fails with
 * "column does not exist".
 *
 * The `tasks` family drift the audit also reports is deliberately NOT touched here — see
 * the note at the bottom of this file.
 *
 * Dry-run by default. `--commit` applies.
 *
 * Run from the repo root:
 *   pnpm --filter @manhaj/db exec tsx src/_phase0MigrateSrs.ts
 *   pnpm --filter @manhaj/db exec tsx src/_phase0MigrateSrs.ts --commit
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

/** Mirrors `reviewStateEnum` in packages/db/schema.ts. */
const ENUM = { name: 'review_state', values: ['new', 'learning', 'review', 'relearning'] };

/**
 * Definitions copied from the Drizzle declarations, not paraphrased — the point is for the
 * live column to be indistinguishable from one `push` would have created.
 */
const COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: 'review_items', column: 'state', definition: `review_state NOT NULL DEFAULT 'new'` },
  { table: 'review_items', column: 'current_step_index', definition: 'integer' },
  { table: 'review_items', column: 'lapses', definition: 'integer NOT NULL DEFAULT 0' },
  // review_logs already has interval_before/interval_after/ease_factor_after; only the
  // state snapshot is missing.
  { table: 'review_logs', column: 'state_before', definition: `review_state NOT NULL DEFAULT 'review'` },
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

    const enumExists = async (name: string) => {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from pg_type where typname = ${name}
      `;
      return n > 0;
    };

    const steps: { label: string; sql: string }[] = [];
    const blocked: string[] = [];
    const notes: string[] = [];

    // ── The enum first: the columns depend on it. ────────────────────────────
    if (await enumExists(ENUM.name)) {
      const rows = await sql<{ label: string }[]>`
        select e.enumlabel as label
        from pg_enum e join pg_type t on t.oid = e.enumtypid
        where t.typname = ${ENUM.name}
        order by e.enumsortorder
      `;
      const live = rows.map((r) => r.label);
      const missing = ENUM.values.filter((v) => !live.includes(v));
      if (missing.length > 0) {
        // `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block on older
        // servers, so this is reported rather than planned — it needs its own decision.
        blocked.push(
          `${ENUM.name} exists but is missing [${missing.join(', ')}] (live = [${live.join(', ')}])`
        );
      } else {
        notes.push(`${ENUM.name} already exists with the right values`);
      }
    } else {
      steps.push({
        label: `create  type ${ENUM.name} as enum (${ENUM.values.join(', ')})`,
        sql: `CREATE TYPE ${ENUM.name} AS ENUM (${ENUM.values.map((v) => `'${v}'`).join(', ')})`,
      });
    }

    // ── The columns. ─────────────────────────────────────────────────────────
    for (const { table, column, definition } of COLUMNS) {
      const cols = await columnsOf(table);
      if (cols.size === 0) {
        notes.push(`${table} does not exist — skipped`);
        continue;
      }
      if (cols.has(column)) {
        notes.push(`${table}.${column} already exists`);
        continue;
      }
      const rows = await countOf(table);
      // Every definition here is either nullable or carries a DEFAULT, so a populated
      // table is no obstacle — but say so, so the row count is never a surprise.
      steps.push({
        label: `add     ${table}.${column}  ${definition}${rows > 0 ? `   (${rows} row(s) backfilled with the default)` : ''}`,
        sql: `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
      });
    }

    // ── Report ───────────────────────────────────────────────────────────────
    console.log('\n============================================================');
    console.log(COMMIT ? ' APPLYING' : ' PLAN (dry run)');
    console.log('============================================================');
    if (steps.length === 0) console.log('  Nothing to do.');
    for (const s of steps) console.log(`  ${s.label}`);

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
    if (steps.length === 0) return;
    if (blocked.length > 0) {
      // Adding a column that references an enum this run refused to touch would fail
      // anyway, with a worse message.
      console.log('\nNot applying while something is refused.');
      process.exitCode = 1;
      return;
    }

    await sql.begin(async (tx) => {
      for (const s of steps) {
        await tx.unsafe(s.sql);
        console.log(`  ok  ${s.label}`);
      }
    });

    console.log(`\nApplied ${steps.length} change(s).`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();

// NOT handled here, on purpose: the audit also reports drift on `tasks` (5 columns only the
// live DB has, 7 only the schema has) and the four enums that family needs. That is a
// separate, lossy decision — the live-only columns hold the app's current task data and
// schema.ts has never had a migration for them. Documented, not touched.
