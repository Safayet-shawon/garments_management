import type { CollectionName } from '../shared/collections'

/**
 * Every synchronised collection is stored as one table:
 *   id text primary key, <a few indexed columns copied out of the document>, data jsonb, updated_at
 * The indexed columns power filtering/sorting in SQL; `data` keeps the full document.
 * The DDL lives in supabase/migrations/0001_init.sql and must match this registry (see tests/api.test.ts).
 */
export interface Col { name: string; pick: (d: any) => string | number | null }
export interface Entry { table: string; cols: Col[] }

const s = (v: unknown) => (v === undefined || v === null ? null : String(v))

export const REGISTRY: Record<CollectionName, Entry> = {
  products: { table: 'products', cols: [{ name: 'name', pick: (d) => s(d.name) }, { name: 'sku', pick: (d) => s(d.sku) }, { name: 'category', pick: (d) => s(d.category) }, { name: 'status', pick: (d) => s(d.status) }] },
  materials: { table: 'materials', cols: [{ name: 'name', pick: (d) => s(d.name) }, { name: 'sku', pick: (d) => s(d.sku) }, { name: 'warehouse', pick: (d) => s(d.warehouse) }] },
  warehouses: { table: 'warehouses', cols: [{ name: 'code', pick: (d) => s(d.code) }] },
  movements: { table: 'movements', cols: [{ name: 'sku', pick: (d) => s(d.sku) }, { name: 'type', pick: (d) => s(d.type) }, { name: 'mv_date', pick: (d) => s(d.date) }] },
  suppliers: { table: 'suppliers', cols: [{ name: 'name', pick: (d) => s(d.name) }, { name: 'status', pick: (d) => s(d.status) }] },
  reqs: { table: 'requirements', cols: [{ name: 'material_id', pick: (d) => s(d.materialId) }, { name: 'status', pick: (d) => s(d.status) }] },
  pos: { table: 'purchase_orders', cols: [{ name: 'supplier_id', pick: (d) => s(d.supplierId) }, { name: 'status', pick: (d) => s(d.status) }] },
  plans: { table: 'plans', cols: [{ name: 'product_id', pick: (d) => s(d.productId) }, { name: 'status', pick: (d) => s(d.status) }, { name: 'stage', pick: (d) => s(d.stage) }] },
  employees: { table: 'employees', cols: [{ name: 'name', pick: (d) => s(d.name) }, { name: 'dept', pick: (d) => s(d.dept) }, { name: 'status', pick: (d) => s(d.status) }] },
  attendance: { table: 'attendance', cols: [{ name: 'emp_id', pick: (d) => s(d.empId) }, { name: 'att_date', pick: (d) => s(d.date) }, { name: 'status', pick: (d) => s(d.status) }] },
  leaves: { table: 'leaves', cols: [{ name: 'emp_id', pick: (d) => s(d.empId) }, { name: 'status', pick: (d) => s(d.status) }] },
  buyers: { table: 'buyers', cols: [{ name: 'name', pick: (d) => s(d.name) }, { name: 'country', pick: (d) => s(d.country) }] },
  countries: { table: 'countries', cols: [{ name: 'name', pick: (d) => s(d.name) }] },
  orders: { table: 'orders', cols: [{ name: 'buyer', pick: (d) => s(d.buyer) }, { name: 'country', pick: (d) => s(d.country) }, { name: 'step', pick: (d) => (typeof d.step === 'number' ? d.step : null) }, { name: 'ship_date', pick: (d) => s(d.shipDate) }] },
  activities: { table: 'activities', cols: [] },
  bom: { table: 'bom', cols: [] },
}
