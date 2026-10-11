// Names of the synchronised collections (browser state ↔ Postgres tables). Shared by client and server.
export const COLLECTIONS = [
  'products', 'materials', 'warehouses', 'movements', 'suppliers', 'reqs', 'pos', 'plans',
  'employees', 'attendance', 'leaves', 'buyers', 'countries', 'orders', 'activities', 'bom',
] as const
export type CollectionName = (typeof COLLECTIONS)[number]
/** key/value settings that travel with the data set */
export const KV_KEYS = ['payrollStage', 'payrollHistory', 'salesAdj', 'outputToday'] as const
export type KvKey = (typeof KV_KEYS)[number]

export const idOf = (name: string, doc: any): string => String(name === 'countries' ? doc.code : doc.id)

export interface SyncPayload {
  changes: Record<string, { upsert: any[]; remove: string[] }>
  kv: Record<string, unknown>
}
export interface Bootstrap {
  rev: number
  collections: Record<string, any[]>
  kv: Record<string, unknown>
}
