// Turns business documents (products, BOM, stock, purchase orders, suppliers) into the matrices used by planning.ts.
import { mrp, rankSuppliers, type Criterion, type MrpInput, type MrpResult, type RankResult, type SupplierRow } from './planning'

interface ProductDoc { id: string; name: string; status?: string }
interface MaterialDoc { id: string; name: string; sku?: string; unit: string; onHand: number; unitCost: number }
interface BomLine { materialId: string; qty: number; unit: string }
interface PoDoc { status: string; items: { materialId: string; qty: number; received: number }[] }
interface SupplierDoc { id: string; name: string; type: string; rating: number; status: string }

export interface PlanningData { products: ProductDoc[]; materials: MaterialDoc[]; bom: Record<string, BomLine[]>; pos: PoDoc[]; suppliers: SupplierDoc[] }

/** Typical cutting/sewing waste per material family (applied on top of the BOM quantity). */
export const wasteFor = (name: string): number => (/fabric/i.test(name) ? 4 : /thread/i.test(name) ? 3 : /bag|carton/i.test(name) ? 1 : 0.5)

export function buildMrp(data: PlanningData, qty: Record<string, number>, opts: { includeOnOrder?: boolean; withWaste?: boolean } = {}): { input: MrpInput; result: MrpResult } {
  const { includeOnOrder = true, withWaste = true } = opts
  const styles = data.products.filter((p) => (qty[p.id] ?? 0) > 0 || (data.bom[p.id]?.length ?? 0) > 0).filter((p) => (data.bom[p.id]?.length ?? 0) > 0)
  const used = new Set<string>()
  styles.forEach((p) => data.bom[p.id].forEach((l) => used.add(l.materialId)))
  const materials = data.materials.filter((m) => used.has(m.id))
  const onOrder = new Map<string, number>()
  if (includeOnOrder) for (const po of data.pos) if (po.status === 'Ordered' || po.status === 'Partially Received') for (const it of po.items) onOrder.set(it.materialId, (onOrder.get(it.materialId) ?? 0) + Math.max(0, it.qty - it.received))
  const input: MrpInput = {
    styles: styles.map((p) => ({ id: p.id, name: p.name })),
    materials: materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit, stock: m.onHand, onOrder: onOrder.get(m.id) ?? 0, price: m.unitCost, wastePct: withWaste ? wasteFor(m.name) : 0 })),
    bom: styles.map((p) => materials.map((m) => data.bom[p.id].filter((l) => l.materialId === m.id).reduce((s, l) => s + l.qty, 0))),
    qty: styles.map((p) => Math.max(0, Math.round(qty[p.id] ?? 0))),
  }
  return { input, result: mrp(input) }
}

// ----- supplier decision matrix -----
export const SUPPLIER_CATEGORIES = ['Fabric', 'Thread', 'Accessories', 'Packaging'] as const
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number]
export const categoryOfMaterial = (name: string): SupplierCategory => (/fabric/i.test(name) ? 'Fabric' : /thread/i.test(name) ? 'Thread' : /bag|carton/i.test(name) ? 'Packaging' : 'Accessories')

export const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'price', label: 'Price index', weight: 35, benefit: false },
  { key: 'quality', label: 'Quality score', weight: 25, benefit: true },
  { key: 'leadTime', label: 'Lead time (days)', weight: 20, benefit: false },
  { key: 'onTime', label: 'On-time delivery %', weight: 15, benefit: true },
  { key: 'moq', label: 'Minimum order index', weight: 5, benefit: false },
]

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
/** Deterministic scorecard figures per supplier (stand-in for real delivery history). */
export function supplierMetrics(s: SupplierDoc): Record<string, number> {
  const h = hash(s.id + s.name)
  return {
    price: 92 + (h % 25),
    quality: Math.round(s.rating * 20),
    leadTime: 7 + ((h >> 3) % 20),
    onTime: 82 + ((h >> 5) % 17),
    moq: 80 + ((h >> 7) % 60),
  }
}
const typeMatches = (type: string, cat: SupplierCategory) => (cat === 'Fabric' ? /fabric/i.test(type) : cat === 'Thread' ? /thread/i.test(type) : cat === 'Packaging' ? /packag/i.test(type) : /accessor/i.test(type))

export function rankForCategory(suppliers: SupplierDoc[], category: SupplierCategory, criteria: Criterion[] = DEFAULT_CRITERIA): { rows: SupplierRow[]; criteria: Criterion[]; result: RankResult } {
  const rows = suppliers.filter((s) => s.status === 'Active' && typeMatches(s.type, category)).map((s) => ({ id: s.id, name: s.name, values: supplierMetrics(s) }))
  if (rows.length < 2) throw new Error(`Need at least two active ${category.toLowerCase()} suppliers to compare`)
  return { rows, criteria, result: rankSuppliers(rows, criteria) }
}
