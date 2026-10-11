import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { config } from './config.js'

export interface Db {
  kind: 'postgres' | 'memory'
  query: <T = any>(text: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>
  tx: <T>(fn: (q: Db['query']) => Promise<T>) => Promise<T>
  close: () => Promise<void>
}

/**
 * Real Postgres (Supabase) when DATABASE_URL is set, otherwise an in-process pg-mem database
 * so `npm run dev` and the test-suite work without any external service.
 */
export async function connect(url = config.databaseUrl): Promise<Db> {
  let pool: pg.Pool
  let kind: Db['kind']
  if (url) {
    kind = 'postgres'
    pool = new pg.Pool({
      connectionString: url,
      max: config.poolMax,                 // connection pooling: reuse at most N sockets per app instance
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false }, // Supabase terminates TLS
    })
    pool.on('error', (e) => console.error('[db] idle client error', e.message))
  } else {
    kind = 'memory'
    const { newDb } = await import('pg-mem')
    const mem = newDb({ autoCreateForeignKeyIndices: true })
    const adapter = mem.adapters.createPg()
    pool = new adapter.Pool() as unknown as pg.Pool
  }
  const query: Db['query'] = (text, params) => pool.query(text, params as any[]) as any
  const tx: Db['tx'] = async (fn) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const out = await fn((text, params) => client.query(text, params as any[]) as any)
      await client.query('COMMIT')
      return out
    } catch (e) {
      try { await client.query('ROLLBACK') } catch { /* connection already gone */ }
      throw e
    } finally { client.release() }
  }
  return { kind, query, tx, close: () => pool.end() }
}

/** Applies supabase/migrations/*.sql in order, once each. Files tagged `-- pg-mem: skip` are ignored by the in-memory database. */
export async function migrate(db: Db, dir = join(process.cwd(), 'supabase', 'migrations')) {
  await db.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())')
  const done = new Set((await db.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name))
  const applied: string[] = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(file)) continue
    const sql = readFileSync(join(dir, file), 'utf8')
    if (db.kind === 'memory' && /^--\s*pg-mem:\s*skip/m.test(sql)) continue
    await db.tx(async (q) => {
      for (const stmt of splitSql(sql)) await q(stmt)
      await q('insert into schema_migrations (name) values ($1)', [file])
    })
    applied.push(file)
  }
  return applied
}

/** Splits on `;` outside of $$ blocks and comments. */
export function splitSql(sql: string): string[] {
  const out: string[] = []
  let cur = '', inDollar = false
  for (const line of sql.split(/\r?\n/)) {
    if (!inDollar && /^\s*--/.test(line)) continue
    const marks = (line.match(/\$\$/g) || []).length
    cur += line + '\n'
    if (marks % 2 === 1) inDollar = !inDollar
    if (!inDollar && /;\s*$/.test(line)) { out.push(cur.trim()); cur = '' }
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean)
}
