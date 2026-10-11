import type { Bootstrap, SyncPayload } from '../shared/collections'

const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
export const API_ENABLED = (import.meta.env.VITE_API as string | undefined) !== 'off'

const TOKEN_KEY = 'wa-token'
export const getToken = (): string | null => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } }

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message) }
}

async function request<T>(path: string, init: RequestInit & { timeoutMs?: number; auth?: boolean } = {}): Promise<T> {
  const { timeoutMs = 12000, auth = true, ...rest } = init
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  const headers = new Headers(rest.headers)
  if (rest.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (auth && token) headers.set('Authorization', `Bearer ${token}`)
  try {
    const res = await fetch(BASE + path, { ...rest, headers, signal: ctl.signal })
    const text = await res.text()
    let body: any = null
    if (text) { try { body = JSON.parse(text) } catch { throw new ApiError(res.status, 'Server returned a non-JSON response') } }
    if (!res.ok) {
      if (res.status === 401 && auth) window.dispatchEvent(new Event('wa:unauthorized'))
      throw new ApiError(res.status, body?.error || res.statusText, body?.details)
    }
    return body as T
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(0, e instanceof DOMException && e.name === 'AbortError' ? 'Request timed out' : 'Network error')
  } finally { clearTimeout(timer) }
}

// ---- tiny stale-while-revalidate cache for public GETs (kept in memory + sessionStorage)
const memo = new Map<string, { at: number; data: unknown }>()
export async function cachedGet<T>(path: string, ttlMs = 60_000, onFresh?: (d: T) => void): Promise<T> {
  const hit = memo.get(path)
  const now = Date.now()
  if (hit && now - hit.at < ttlMs) return hit.data as T
  let stale = hit?.data as T | undefined
  if (stale === undefined) { try { const raw = sessionStorage.getItem('wa-c:' + path); if (raw) stale = JSON.parse(raw) } catch { /* ignore */ } }
  const fresh = request<T>(path, { auth: false }).then((d) => { memo.set(path, { at: Date.now(), data: d }); try { sessionStorage.setItem('wa-c:' + path, JSON.stringify(d)) } catch { /* quota */ } onFresh?.(d); return d })
  if (stale !== undefined) { fresh.catch(() => undefined); return stale }
  return fresh
}

export interface Health { ok: boolean; db: 'postgres' | 'memory'; demo: boolean; version: string }
export interface Me { email: string; name: string; role: string }
export interface PublicProduct { slug: string; name: string; category: string; type: string; description: string; colors: string[]; sizes: string[]; variants: number; image: string; leadTimeDays: number; moq: number }
export interface Inquiry { id: number; name: string; email: string; company: string; country: string; interest: string; quantity: number | null; message: string; status: string; created_at: string }

export const api = {
  health: () => request<Health>('/api/health', { auth: false, timeoutMs: 5000 }),
  login: (email: string, password: string) => request<{ token: string; user: Me }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), auth: false }),
  me: () => request<Me>('/api/auth/me'),
  bootstrap: () => request<Bootstrap>('/api/bootstrap', { timeoutMs: 20000 }),
  sync: (payload: SyncPayload, keepalive = false) => request<{ rev: number; applied: number }>('/api/sync', { method: 'POST', body: JSON.stringify(payload), keepalive }),
  reset: () => request<{ rev: number }>('/api/admin/reset', { method: 'POST' }),
  catalog: (onFresh?: (d: { products: PublicProduct[]; countries: { code: string; name: string }[] }) => void) => cachedGet<{ products: PublicProduct[]; countries: { code: string; name: string }[] }>('/api/public/catalog', 5 * 60_000, onFresh),
  inquire: (body: Record<string, unknown>) => request<{ id: number }>('/api/public/inquiries', { method: 'POST', body: JSON.stringify(body), auth: false }),
  inquiries: (q: { page: number; limit: number; search: string; status: string }) => request<{ items: Inquiry[]; total: number; page: number; pages: number }>(`/api/inquiries?${new URLSearchParams({ page: String(q.page), limit: String(q.limit), search: q.search, status: q.status })}`),
  setInquiryStatus: (id: number, status: string) => request<{ ok: true }>(`/api/inquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  compute: <T>(kind: 'mrp' | 'assignment' | 'suppliers' | 'size-matrix', body: unknown) => request<T>(`/api/compute/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
}
