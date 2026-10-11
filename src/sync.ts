import { COLLECTIONS, KV_KEYS, idOf, type Bootstrap, type SyncPayload } from '../shared/collections'
import type { DataState } from './seedState'

type Wire = { collections: Record<string, any[]>; kv: Record<string, unknown> }

/** State → flat lists of documents (the bom map becomes one document per style). */
export function toWire(s: DataState): Wire {
  const collections: Record<string, any[]> = {}
  for (const name of COLLECTIONS) {
    collections[name] = name === 'bom' ? Object.entries(s.bom).map(([id, lines]) => ({ id, lines })) : (s as any)[name]
  }
  const kv: Record<string, unknown> = {}
  for (const k of KV_KEYS) kv[k] = (s as any)[k]
  return { collections, kv }
}

export function fromWire(b: Bootstrap, fallback: DataState): DataState {
  const out: any = { ...fallback }
  for (const name of COLLECTIONS) {
    const docs = b.collections[name]
    if (!docs) continue
    out[name] = name === 'bom' ? Object.fromEntries(docs.map((d: any) => [d.id, d.lines])) : docs
  }
  for (const k of KV_KEYS) if (b.kv[k] !== undefined) out[k] = b.kv[k]
  return out as DataState
}

/** Remembers what the server already has, so only changed documents are sent. */
export class Syncer {
  private seen = new Map<string, Map<string, string>>()
  private kvSeen = new Map<string, string>()
  private orderSeen = new Map<string, string>()

  reset(w: Wire) {
    this.seen.clear(); this.kvSeen.clear(); this.orderSeen.clear()
    for (const [name, docs] of Object.entries(w.collections)) { this.seen.set(name, new Map(docs.map((d) => [idOf(name, d), JSON.stringify(d)]))); this.orderSeen.set(name, docs.map((d) => idOf(name, d)).join('|')) }
    for (const [k, v] of Object.entries(w.kv)) this.kvSeen.set(k, JSON.stringify(v))
  }

  /** Returns the changes since the last commit, or null when nothing differs. */
  diff(w: Wire): { payload: SyncPayload; commit: () => void } | null {
    const payload: SyncPayload = { changes: {}, kv: {}, order: {} }
    const orderNext = new Map<string, string>()
    const next = new Map<string, Map<string, string>>()
    let count = 0
    for (const [name, docs] of Object.entries(w.collections)) {
      const before = this.seen.get(name) ?? new Map<string, string>()
      const after = new Map<string, string>()
      const upsert: any[] = []
      for (const d of docs) {
        const id = idOf(name, d)
        const json = JSON.stringify(d)
        after.set(id, json)
        if (before.get(id) !== json) upsert.push(d)
      }
      const remove = [...before.keys()].filter((id) => !after.has(id))
      next.set(name, after)
      const orderKey = docs.map((d) => idOf(name, d)).join('|')
      orderNext.set(name, orderKey)
      if (this.orderSeen.get(name) !== orderKey) { payload.order![name] = docs.map((d) => idOf(name, d)); count++ }
      if (upsert.length || remove.length) { payload.changes[name] = { upsert, remove }; count += upsert.length + remove.length }
    }
    const kvNext = new Map<string, string>()
    for (const [k, v] of Object.entries(w.kv)) {
      const json = JSON.stringify(v)
      kvNext.set(k, json)
      if (this.kvSeen.get(k) !== json) { payload.kv[k] = v; count++ }
    }
    if (!count) return null
    return { payload, commit: () => { for (const [n, m] of next) this.seen.set(n, m); this.kvSeen = kvNext; this.orderSeen = orderNext } }
  }
}
