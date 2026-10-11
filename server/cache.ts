/** Minimal LRU cache with per-entry TTL (server-side caching of expensive results). */
export class LruCache<V> {
  private map = new Map<string, { v: V; exp: number }>()
  constructor(private max = 200, private ttlMs = 5 * 60_000) {}
  get(key: string): V | undefined {
    const e = this.map.get(key)
    if (!e) return undefined
    if (e.exp < Date.now()) { this.map.delete(key); return undefined }
    this.map.delete(key); this.map.set(key, e) // refresh recency
    return e.v
  }
  set(key: string, v: V, ttlMs = this.ttlMs) {
    this.map.delete(key)
    this.map.set(key, { v, exp: Date.now() + ttlMs })
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string)
  }
  clear() { this.map.clear() }
  get size() { return this.map.size }
}

/** Runs `fn` once per key at a time; concurrent callers share the same promise. */
export function singleFlight<T>() {
  const inflight = new Map<string, Promise<T>>()
  return (key: string, fn: () => Promise<T>): Promise<T> => {
    const hit = inflight.get(key)
    if (hit) return hit
    const p = fn().finally(() => inflight.delete(key))
    inflight.set(key, p)
    return p
  }
}
