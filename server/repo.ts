import { COLLECTIONS, KV_KEYS, idOf, type Bootstrap, type CollectionName, type SyncPayload } from '../shared/collections.js'
import type { Db } from './db.js'
import { REGISTRY } from './registry.js'

type Q = Db['query']
const CHUNK = 150

export async function currentRev(q: Q): Promise<number> {
  const r = await q<{ n: string | number }>("select n from meta where key = 'rev'")
  return Number(r.rows[0]?.n ?? 1)
}

/** Reads every collection (in parallel) and restores the user's list order. */
export async function loadAll(q: Q): Promise<Bootstrap> {
  const rev = await currentRev(q)
  const [lists, orders, kvRows] = await Promise.all([
    Promise.all(COLLECTIONS.map(async (name) => [name, (await q<{ data: any }>(`select data from ${REGISTRY[name].table}`)).rows.map((r) => r.data)] as const)),
    q<{ name: string; ids: string[] }>('select name, ids from collection_order'),
    q<{ key: string; data: unknown }>('select key, data from kv'),
  ])
  const orderOf = new Map(orders.rows.map((r) => [r.name, r.ids]))
  const collections: Record<string, any[]> = {}
  for (const [name, docs] of lists) {
    const ids = orderOf.get(name)
    if (!ids) { collections[name] = docs; continue }
    const pos = new Map(ids.map((id, i) => [id, i]))
    collections[name] = [...docs].sort((a, b) => (pos.get(idOf(name, a)) ?? 1e9) - (pos.get(idOf(name, b)) ?? 1e9))
  }
  const kv: Record<string, unknown> = {}
  for (const r of kvRows.rows) if (!r.key.startsWith('_')) kv[r.key] = r.data
  return { rev, collections, kv }
}

async function upsertDocs(q: Q, name: CollectionName, docs: any[]) {
  const { table, cols } = REGISTRY[name]
  const names = ['id', ...cols.map((c) => c.name), 'data', 'updated_at']
  for (let i = 0; i < docs.length; i += CHUNK) {
    const part = docs.slice(i, i + CHUNK)
    const params: unknown[] = []
    const rows = part.map((d) => {
      const base = params.length
      params.push(idOf(name, d), ...cols.map((c) => c.pick(d)), JSON.stringify(d))
      const ph = Array.from({ length: names.length - 1 }, (_, k) => `$${base + k + 1}`)
      ph[ph.length - 1] += '::jsonb'
      return `(${ph.join(', ')}, now())`
    })
    const sets = names.slice(1).map((n) => `${n} = excluded.${n}`).join(', ')
    await q(`insert into ${table} (${names.join(', ')}) values ${rows.join(', ')} on conflict (id) do update set ${sets}`, params)
  }
}

/** Applies one browser sync inside a single transaction and bumps the revision counter. */
export async function applySync(db: Db, payload: SyncPayload): Promise<{ rev: number; applied: number }> {
  return db.tx(async (q) => {
    let applied = 0
    for (const [name, ch] of Object.entries(payload.changes)) {
      const n = name as CollectionName
      if (ch.remove.length) {
        for (let i = 0; i < ch.remove.length; i += 500) {
          const ids = ch.remove.slice(i, i + 500)
          await q(`delete from ${REGISTRY[n].table} where id in (${ids.map((_, k) => `$${k + 1}`).join(', ')})`, ids)
        }
        applied += ch.remove.length
      }
      if (ch.upsert.length) { await upsertDocs(q, n, ch.upsert); applied += ch.upsert.length }
    }
    for (const [name, ids] of Object.entries(payload.order ?? {})) {
      await q('insert into collection_order (name, ids) values ($1, $2::jsonb) on conflict (name) do update set ids = excluded.ids', [name, JSON.stringify(ids)])
    }
    for (const [k, v] of Object.entries(payload.kv)) {
      if (!(KV_KEYS as readonly string[]).includes(k)) continue
      await q('insert into kv (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data', [k, JSON.stringify(v)])
      applied++
    }
    const r = await q<{ n: string | number }>("update meta set n = n + 1 where key = 'rev' returning n")
    return { rev: Number(r.rows[0].n), applied }
  })
}

/** Replaces the entire data set (used by `db:seed` and the admin reset button). */
export async function replaceAll(db: Db, data: Record<string, any>) {
  await db.tx(async (q) => {
    for (const name of COLLECTIONS) await q(`delete from ${REGISTRY[name].table}`)
    await q('delete from collection_order')
    for (const k of KV_KEYS) await q('delete from kv where key = $1', [k])
    for (const name of COLLECTIONS) {
      const docs: any[] = name === 'bom' ? Object.entries(data.bom as Record<string, unknown>).map(([id, lines]) => ({ id, lines })) : data[name]
      await upsertDocs(q, name, docs)
      await q('insert into collection_order (name, ids) values ($1, $2::jsonb)', [name, JSON.stringify(docs.map((d) => idOf(name, d)))])
    }
    for (const k of KV_KEYS) await q('insert into kv (key, data) values ($1, $2::jsonb)', [k, JSON.stringify(data[k])])
    await q("update meta set n = n + 1 where key = 'rev'")
  })
}

export async function isSeeded(q: Q): Promise<boolean> {
  const r = await q<{ c: string | number }>('select count(*) as c from products')
  return Number(r.rows[0].c) > 0
}
