/**
 * Diffs `schema.ts` against the live database — what `drizzle-kit push` would see, without
 * running it.
 *
 * This exists because `push` is not usable on this database: the live DB carries the
 * drifted `tasks` family, and `push` diffs the WHOLE schema, so an accidental push is a
 * data-loss vector. Read-only, no side effects, safe to run any time.
 *
 * It imports the Drizzle schema directly, so it sees exactly what `push` would see.
 *
 * Run from the repo root:
 *   pnpm --filter @manhaj/db exec tsx src/auditSchema.ts
 *
 * Section 4 (enums) is expected to report the known `tasks`-family drift; that is
 * documented, not a regression. Sections 1 and 3 are the ones that should be empty.
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../schema';

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
  const envPath = findEnvFile();
  const match = fs.readFileSync(envPath, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) throw new Error(`No DATABASE_URL in ${envPath}`);
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * Collapse PostgreSQL type aliases to one spelling so `int4` and `integer` (and `bool`
 * and `boolean`) stop being reported as differences — they are the same type.
 */
function canonType(raw: string): string {
  const t = raw.toLowerCase().replace(/\(.*\)/, '').replace(/\s+/g, ' ').trim();
  const aliases: Record<string, string> = {
    int2: 'smallint',
    int4: 'integer',
    int8: 'bigint',
    bool: 'boolean',
    float4: 'real',
    float8: 'double precision',
    'timestamp without time zone': 'timestamp',
    'time without time zone': 'time',
    'character varying': 'varchar',
    bpchar: 'char',
  };
  return aliases[t] ?? t;
}

interface DeclaredColumn {
  sqlType: string;
  notNull: boolean;
  hasDefault: boolean;
  defaultText: string | null;
  isPrimaryKey: boolean;
}
interface DeclaredTable {
  sqlName: string;
  exportName: string;
  columns: Map<string, DeclaredColumn>;
  uniqueIndexes: string[];
}

function collectDeclared() {
  const tables = new Map<string, DeclaredTable>();
  const enums = new Map<string, { exportName: string; labels: string[] }>();

  for (const [exportName, value] of Object.entries(schema)) {
    const anyVal = value as any;

    // Enums first — they carry enumValues and are not tables. `pgEnum` returns a callable
    // (it doubles as the column type factory), so the typeof check has to allow functions.
    const isEnum =
      anyVal != null &&
      (typeof anyVal === 'object' || typeof anyVal === 'function') &&
      Array.isArray(anyVal.enumValues);

    if (isEnum) {
      const name = anyVal.enumName ?? anyVal[Symbol.for('drizzle:Name')] ?? exportName;
      enums.set(String(name), { exportName, labels: anyVal.enumValues.map(String) });
      continue;
    }

    let cfg: any;
    try {
      cfg = getTableConfig(anyVal);
    } catch {
      continue;
    }
    if (!cfg?.columns?.length || !cfg.name) continue;

    const columns = new Map<string, DeclaredColumn>();
    for (const col of cfg.columns) {
      let sqlType = '?';
      try {
        sqlType = canonType(String(col.getSQLType()));
      } catch {
        /* leave as ? */
      }
      let defaultText: string | null = null;
      let hasDefault = false;
      // `hasDefault()` is not available on this Drizzle version, so read `default`
      // directly. Only its *presence* is compared: PG reports `now()` where Drizzle holds
      // an SQL chunk, so comparing the rendered text would flag every default as a diff.
      try {
        hasDefault = (col as any).default !== undefined && (col as any).default !== null;
        if (hasDefault) defaultText = String((col as any).default);
      } catch {
        /* ignore */
      }
      columns.set(col.name, {
        sqlType,
        notNull: Boolean(col.notNull),
        hasDefault,
        defaultText,
        isPrimaryKey: Boolean(col.primary),
      });
    }

    const uniqueIndexes: string[] = [];
    try {
      for (const u of cfg.uniqueConstraints ?? []) {
        uniqueIndexes.push(`unique(${(u.columns ?? []).map((c: any) => c.name).join(', ')})`);
      }
      for (const idx of cfg.indexes ?? []) {
        uniqueIndexes.push(
          `${idx.config?.unique ? 'unique ' : ''}index(${(idx.config?.columns ?? [])
            .map((c: any) => c.name)
            .join(', ')})`
        );
      }
    } catch {
      /* ignore */
    }

    tables.set(cfg.name, { sqlName: cfg.name, exportName, columns, uniqueIndexes });
  }

  return { tables, enums };
}

async function main() {
  const sql = postgres(readDatabaseUrl(), { ssl: 'require', max: 1 });

  try {
    const { tables: declared, enums: declaredEnums } = collectDeclared();

    const liveColRows = await sql<any[]>`
      select table_name, column_name, data_type, udt_name, is_nullable,
             column_default, ordinal_position
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `;

    const liveTables = new Map<string, Map<string, any>>();
    for (const c of liveColRows) {
      if (c.table_name.startsWith('drizzle')) continue;
      if (!liveTables.has(c.table_name)) liveTables.set(c.table_name, new Map());
      liveTables.get(c.table_name)!.set(c.column_name, c);
    }

    const pkRows = await sql<any[]>`
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'
      order by tc.table_name, kcu.ordinal_position
    `;
    const pkMap = new Map<string, string[]>();
    for (const r of pkRows) {
      if (!pkMap.has(r.table_name)) pkMap.set(r.table_name, []);
      pkMap.get(r.table_name)!.push(r.column_name);
    }

    const fkRows = await sql<any[]>`
      select tc.table_name, kcu.column_name, ccu.table_name as ref_table,
             ccu.column_name as ref_column, rc.delete_rule
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      join information_schema.referential_constraints rc
        on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.constraint_type = 'FOREIGN KEY'
      order by tc.table_name, kcu.column_name
    `;
    const fkMap = new Map<string, string[]>();
    for (const r of fkRows) {
      if (r.table_name.startsWith('drizzle')) continue;
      if (!fkMap.has(r.table_name)) fkMap.set(r.table_name, []);
      fkMap
        .get(r.table_name)!
        .push(`${r.column_name} -> ${r.ref_table}.${r.ref_column} ON DELETE ${r.delete_rule}`);
    }

    const uniqRows = await sql<any[]>`
      select tc.table_name, tc.constraint_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.constraint_type = 'UNIQUE'
      order by tc.table_name, tc.constraint_name, kcu.ordinal_position
    `;
    const uniqMap = new Map<string, string[]>();
    for (const r of uniqRows) {
      if (!uniqMap.has(r.table_name)) uniqMap.set(r.table_name, []);
      const list = uniqMap.get(r.table_name)!;
      const last = list[list.length - 1];
      if (last && last.startsWith(r.constraint_name)) {
        list[list.length - 1] = `${last}, ${r.column_name}`;
      } else {
        list.push(`${r.constraint_name}(${r.column_name}`);
      }
    }
    for (const [t, list] of uniqMap)
      uniqMap.set(
        t,
        list.map((s) => (s.includes('(') && !s.endsWith(')') ? s + ')' : s))
      );

    const idxRows = await sql<any[]>`
      select tablename, indexname, indexdef from pg_indexes
      where schemaname = 'public' order by tablename, indexname
    `;
    const idxMap = new Map<string, string[]>();
    for (const r of idxRows) {
      if (!idxMap.has(r.tablename)) idxMap.set(r.tablename, []);
      idxMap.get(r.tablename)!.push(`${r.indexname} :: ${r.indexdef.replace(/^CREATE /, '')}`);
    }

    const rowCounts = new Map<string, number>();
    for (const table of liveTables.keys()) {
      try {
        const r = await sql`select count(*)::int as n from ${sql(table)}`;
        rowCounts.set(table, r[0].n as number);
      } catch {
        rowCounts.set(table, -1);
      }
    }
    const rows = (t: string) => {
      const n = rowCounts.get(t);
      return n === undefined || n < 0 ? '?' : String(n);
    };

    const dumpDdl = (table: string) => {
      const pk = pkMap.get(table);
      if (pk) console.log(`      PK       (${pk.join(', ')})`);
      for (const f of fkMap.get(table) ?? []) console.log(`      FK       ${f}`);
      for (const u of uniqMap.get(table) ?? []) console.log(`      UNIQUE   ${u}`);
      for (const i of idxMap.get(table) ?? []) console.log(`      INDEX    ${i}`);
    };

    // ── 1 ─────────────────────────────────────────────────────────────────────
    console.log('\n############################################################');
    console.log('# 1. TABLES IN LIVE DB BUT NOT IN schema.ts  -> PUSH WOULD DROP');
    console.log('############################################################');
    let n1 = 0;
    for (const [table, cols] of liveTables) {
      if (declared.has(table)) continue;
      n1++;
      console.log(`\n  *** ${table}  (${rows(table)} rows) ***`);
      for (const [name, c] of cols) {
        console.log(
          `      ${name.padEnd(20)} ${canonType(c.udt_name).padEnd(22)} ${
            c.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'
          }${c.column_default ? ` default=${c.column_default}` : ''}`
        );
      }
      dumpDdl(table);
    }
    if (!n1) console.log('  (none)');

    // ── 2 ─────────────────────────────────────────────────────────────────────
    console.log('\n############################################################');
    console.log('# 2. TABLES IN schema.ts BUT NOT IN LIVE DB -> PUSH WOULD CREATE');
    console.log('############################################################');
    let n2 = 0;
    for (const [name, table] of declared) {
      if (liveTables.has(name)) continue;
      n2++;
      console.log(`\n  *** ${name}  (declared as ${table.exportName}) ***`);
      for (const [colName, c] of table.columns) {
        console.log(
          `      ${colName.padEnd(20)} ${c.sqlType.padEnd(22)} ${
            c.notNull ? 'NOT NULL' : 'nullable'
          }${c.hasDefault ? ` default=${c.defaultText}` : ''}`
        );
      }
      for (const u of table.uniqueIndexes) console.log(`      ${u}`);
    }
    if (!n2) console.log('  (none)');

    // ── 3 ─────────────────────────────────────────────────────────────────────
    console.log('\n############################################################');
    console.log('# 3. REAL COLUMN DIFFERENCES (type aliases collapsed)');
    console.log('############################################################');
    let n3 = 0;
    for (const [table, liveColMap] of liveTables) {
      const decl = declared.get(table);
      if (!decl) continue;

      const lines: string[] = [];
      for (const [name, lc] of liveColMap) {
        if (!decl.columns.has(name)) {
          lines.push(`      DROP     ${name.padEnd(20)} ${canonType(lc.udt_name)}`);
        }
      }
      for (const [name, dc] of decl.columns) {
        const lc = liveColMap.get(name);
        if (!lc) {
          lines.push(
            `      ADD      ${name.padEnd(20)} ${dc.sqlType}${dc.notNull ? ' NOT NULL' : ''}${
              dc.hasDefault ? ` default=${dc.defaultText}` : ''
            }`
          );
          continue;
        }
        const liveType = canonType(lc.udt_name);
        if (dc.sqlType !== '?' && dc.sqlType !== liveType) {
          lines.push(`      TYPE     ${name.padEnd(20)} live=${liveType}  schema=${dc.sqlType}`);
        }
        const liveNotNull = lc.is_nullable === 'NO';
        if (liveNotNull !== dc.notNull) {
          lines.push(
            `      NULL     ${name.padEnd(20)} live=${
              liveNotNull ? 'NOT NULL' : 'nullable'
            }  schema=${dc.notNull ? 'NOT NULL' : 'nullable'}`
          );
        }
        const liveIsPk = (pkMap.get(table) ?? []).includes(name);
        if (liveIsPk !== dc.isPrimaryKey) {
          lines.push(`      PK       ${name.padEnd(20)} live=${liveIsPk}  schema=${dc.isPrimaryKey}`);
        }
        const liveHasDefault = lc.column_default != null;
        if (liveHasDefault !== dc.hasDefault) {
          lines.push(
            `      DEFAULT  ${name.padEnd(20)} presence differs — live=${
              lc.column_default ?? '(none)'
            }  schema=${dc.hasDefault ? 'present' : '(none)'}`
          );
        }
      }

      if (!lines.length) continue;
      n3++;
      console.log(`\n  === ${table}  (${rows(table)} rows) ===`);
      for (const l of lines) console.log(l);
    }
    if (!n3) console.log('  (none)');

    // ── 4 ─────────────────────────────────────────────────────────────────────
    console.log('\n############################################################');
    console.log('# 4. ENUM DIFFERENCES');
    console.log('############################################################');
    const liveEnums = await sql<any[]>`
      select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      group by t.typname order by t.typname
    `;
    const liveEnumMap = new Map<string, string[]>(
      liveEnums.map((e) => [e.typname, e.labels as string[]])
    );
    let n4 = 0;
    for (const [name, { exportName, labels }] of declaredEnums) {
      const live = liveEnumMap.get(name);
      if (!live) {
        n4++;
        console.log(`  ${name} (${exportName}): NOT IN LIVE DB — schema=[${labels.join(', ')}]`);
      } else if (JSON.stringify(live) !== JSON.stringify(labels)) {
        n4++;
        console.log(`  ${name} (${exportName}): MISMATCH`);
        console.log(`      live   = [${live.join(', ')}]`);
        console.log(`      schema = [${labels.join(', ')}]`);
      }
    }
    for (const [name, labels] of liveEnumMap) {
      if (!declaredEnums.has(name)) {
        n4++;
        console.log(`  ${name}: NOT IN schema.ts — live=[${labels.join(', ')}]`);
      }
    }
    if (!n4) console.log('  (all match)');

    console.log('\nDone.');
  } catch (err) {
    console.error('Audit failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

void main();
