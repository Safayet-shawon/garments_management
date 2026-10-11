// Seed data and domain types for the Winner Apparels demo. Everything here is mock data.

export const TODAY = '2026-10-08'

export type Variant = { id: string; name: string; combo: Record<string, string>; sku: string; purchase: number; selling: number; status: 'Active' | 'Inactive' }
export type Product = {
  id: string; name: string; sku: string; category: string; brand: string; description: string; type: string
  status: 'Active' | 'Draft' | 'Archived'; variants: Variant[]; stock: number; price: number; updated: string
  images: number; imageBy: string; reorder: number
}
export type Material = {
  id: string; name: string; sku: string; warehouse: string; unit: string; onHand: number; reserved: number
  reorder: number; critical: number; unitCost: number; supplierId: string
}
export type Warehouse = { id: string; code: string; name: string; location: string; type: string; status: 'Active' | 'Inactive' }
export type MovementType = 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'PRODUCTION_CONSUMPTION' | 'PRODUCTION_OUTPUT'
export type Movement = { id: string; date: string; sku: string; item: string; warehouse: string; type: MovementType; qty: number; unit: string; ref: string; user: string }
export type BomLine = { materialId: string; qty: number; unit: string }
export const STAGES = ['Planned', 'Material Check', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Completed'] as const
export type Stage = (typeof STAGES)[number]
export type Plan = {
  id: string; productId: string; variant: string; target: number; issued: number; cut: number; sewn: number; finished: number
  wasteKg: number; sewReject: number; stage: Stage; status: 'Planned' | 'Ready' | 'In Progress' | 'Completed' | 'Cancelled'
  start: string; end: string; supervisor: string; priority: 'Low' | 'Normal' | 'High' | 'Urgent'; notes: string; warehouse: string
  team: string; cuttingStarted: boolean; sewingStarted: boolean
  qcStatus: 'Not Ready' | 'Pending' | 'Passed' | 'Moved to Finished Goods'; qcInspected: number; qcPassed: number; qcRejected: number
  qcInspector: string; qcReasons: Record<string, number>; matIssued?: boolean
}
export type Requirement = { id: string; materialId: string; qty: number; reason: string; supplierId: string; expected: string; priority: string; notes: string; status: 'Pending Purchase' | 'PO Created'; created: string; poId?: string }
export const PO_FLOW = ['Draft', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Closed'] as const
export type POStatus = (typeof PO_FLOW)[number]
export type POItem = { materialId: string; qty: number; price: number; received: number }
export type PO = { id: string; supplierId: string; items: POItem[]; expected: string; warehouse: string; notes: string; status: POStatus; created: string; reqId?: string }
export type Supplier = { id: string; name: string; type: string; contact: string; phone: string; location: string; rating: number; status: 'Active' | 'Inactive' }
export type Employee = {
  id: string; name: string; dept: string; designation: string; role: string; joined: string; type: string
  status: 'Active' | 'On Leave' | 'Inactive'; basic: number; phone: string; email: string
  leave: { casual: number; sick: number; annual: number }; perf: { output: number; rejectRate: number; efficiency: number }
}
export type Attendance = { id: string; date: string; empId: string; in: string; out: string; status: 'Present' | 'Late' | 'Absent' | 'Leave'; hours: number }
export type Leave = { id: string; empId: string; type: 'Casual' | 'Sick' | 'Annual'; from: string; to: string; days: number; status: 'Pending' | 'Approved' | 'Rejected'; reason: string }
export type OrderLine = { productId: string; sku: string; variant: string; qty: number; price: number }
export const ORDER_FLOW = ['Order Received', 'Sample Approved', 'Materials Booked', 'In Production', 'Goods Allocated', 'Packed', 'Shipped', 'Payment Received'] as const
export type Order = { id: string; buyerPO: string; buyer: string; date: string; shipDate: string; country: string; merchandiser: string; term: string; lines: OrderLine[]; step: number; cancelled: boolean }
export type Buyer = { id: string; name: string; type: string; country: string; contact: string; email: string; merchandiser: string; term: string; status: 'Active' | 'Inactive' }
export type Country = { code: string; name: string; region: string; currency: string; port: string }
export const seedCountries = (): Country[] => [
  { code: 'US', name: 'United States', region: 'North America', currency: 'USD', port: 'New York / Savannah' },
  { code: 'DE', name: 'Germany', region: 'Europe', currency: 'EUR', port: 'Hamburg' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', currency: 'GBP', port: 'Felixstowe' },
  { code: 'FR', name: 'France', region: 'Europe', currency: 'EUR', port: 'Le Havre' },
  { code: 'SE', name: 'Sweden', region: 'Europe', currency: 'SEK', port: 'Gothenburg' },
  { code: 'ES', name: 'Spain', region: 'Europe', currency: 'EUR', port: 'Valencia' },
  { code: 'IT', name: 'Italy', region: 'Europe', currency: 'EUR', port: 'Genoa' },
  { code: 'NL', name: 'Netherlands', region: 'Europe', currency: 'EUR', port: 'Rotterdam' },
  { code: 'CA', name: 'Canada', region: 'North America', currency: 'CAD', port: 'Vancouver' },
  { code: 'JP', name: 'Japan', region: 'Asia Pacific', currency: 'JPY', port: 'Yokohama' },
  { code: 'AU', name: 'Australia', region: 'Asia Pacific', currency: 'AUD', port: 'Melbourne' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East', currency: 'AED', port: 'Jebel Ali' },
]
export const FOB: Record<string, number> = { p1: 4.2, p2: 5.8, p3: 11.5, p4: 8.4, p5: 9.2, p6: 7.6 }
export const fobOf = (p: { id: string; price: number }) => FOB[p.id] ?? Math.round((p.price / 190) * 20) / 20
export const USD_RATE = 120

export const salaryParts = (basic: number) => {
  const house = Math.round(basic * 0.25), medical = Math.round(basic * 0.1), transport = Math.round(basic * 0.1)
  return { basic, house, medical, transport, gross: basic + house + medical + transport }
}

// ---- deterministic random ----
const SEED0 = 20261008
let seed = SEED0
/** Restarts the pseudo-random sequence so every seed build yields identical data. */
export const resetSeed = () => { seed = SEED0 }
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]

// ---- products ----
const colorCode: Record<string, string> = { Green: 'GRN', White: 'WHT', Black: 'BLK', Blue: 'BLU', Navy: 'NVY', Grey: 'GRY', Red: 'RED', Khaki: 'KHK', Olive: 'OLV', Indigo: 'IND', Maroon: 'MRN', Beige: 'BGE', Charcoal: 'CHR' }
export const valueCode = (v: string) => {
  if (colorCode[v]) return colorCode[v]
  if (v.length <= 3 || /\d/.test(v)) return v.toUpperCase().replace(/\s/g, '')
  return v.replace(/[aeiou\s]/gi, '').slice(0, 3).toUpperCase() || v.slice(0, 3).toUpperCase()
}
export const brandCode = (b: string) => b.split(' ')[0].replace(/[aeiou]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
export const catCode = (c: string) => {
  const parts = c.split(/[-\s]/).filter(Boolean)
  return parts.length > 1 ? parts.map((p) => p[0]).join('').toUpperCase() : c.slice(0, 3).toUpperCase()
}

export function genVariants(prefix: string, attrs: Record<string, string[]>, purchase: number, selling: number): Variant[] {
  const keys = Object.keys(attrs).filter((k) => attrs[k].length)
  if (!keys.length) return []
  let combos: Record<string, string>[] = [{}]
  keys.forEach((k) => { combos = combos.flatMap((c) => attrs[k].map((v) => ({ ...c, [k]: v }))) })
  return combos.map((combo, i) => ({
    id: `v${Date.now()}${i}${Math.floor(Math.random() * 1000)}`,
    name: keys.map((k) => combo[k]).join(' / '),
    combo,
    sku: [prefix, ...keys.map((k) => valueCode(combo[k]))].join('-'),
    purchase, selling, status: 'Active' as const,
  }))
}

const SIZES6 = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const COL3 = ['Green', 'White', 'Black']
const mk = (id: string, name: string, category: string, brand: string, prefix: string, attrs: Record<string, string[]>, pur: number, sell: number, stock: number, reorder: number, desc: string, updated: string, status: Product['status'] = 'Active'): Product => ({
  id, name, sku: prefix, category, brand, description: desc, type: 'Finished Garment', status,
  variants: genVariants(prefix, attrs, pur, sell).map((v, i) => ({ ...v, id: `${id}-v${i}` })), stock, price: sell, updated, images: 12, imageBy: 'Color', reorder,
})

export const seedProducts = (): Product[] => [
  mk('p1', 'Premium Cotton T-Shirt', 'T-Shirts', 'Nexora Basics', 'NXR-TS', { Size: SIZES6, Color: COL3 }, 420, 850, 4250, 2000, '180 GSM combed cotton crew-neck tee with reinforced collar.', '2026-10-07'),
  mk('p2', 'Classic Polo Shirt', 'Polo Shirts', 'Nexora Basics', 'NXR-PL', { Size: ['S', 'M', 'L', 'XL'], Color: ['Navy', 'White', 'Black'] }, 520, 1150, 2840, 1500, 'Pique cotton polo with two-button placket.', '2026-10-06'),
  mk('p3', 'Premium Hoodie', 'Hoodies', 'Nexora Basics', 'NXR-HD', { Size: ['M', 'L', 'XL'], Color: ['Grey', 'Black', 'Navy'] }, 880, 1950, 1120, 1500, 'Fleece-lined pullover hoodie with kangaroo pocket.', '2026-10-05'),
  mk('p4', 'Denim Shirt', 'Shirts', 'Urbano Denim', 'URB-DS', { Size: ['S', 'M', 'L', 'XL'], Color: ['Blue', 'Indigo'] }, 760, 1650, 3210, 1200, 'Washed denim casual shirt with snap buttons.', '2026-10-02'),
  mk('p5', 'Casual Chino', 'Trousers', 'Urbano Denim', 'URB-CH', { Size: ['30', '32', '34', '36'], Color: ['Khaki', 'Navy', 'Olive'] }, 690, 1490, 3900, 1500, 'Slim-fit stretch chino trousers.', '2026-09-29'),
  mk('p6', 'Basic Sweatshirt', 'Sweatshirts', 'Nexora Basics', 'NXR-SW', { Size: ['S', 'M', 'L', 'XL'], Color: ['Grey', 'Maroon', 'Black'] }, 620, 1350, 3100, 1500, 'Brushed-back crew-neck sweatshirt.', '2026-09-27'),
]

// ---- materials / warehouses ----
export const seedWarehouses = (): Warehouse[] => [
  { id: 'w1', code: 'MF-WH', name: 'Main Factory Warehouse', location: 'Dhaka', type: 'Production Floor Store', status: 'Active' },
  { id: 'w2', code: 'FG-WH', name: 'Finished Goods Warehouse', location: 'Gazipur', type: 'Finished Goods', status: 'Active' },
  { id: 'w3', code: 'RM-WH', name: 'Raw Material Warehouse', location: 'Narayanganj', type: 'Raw Material', status: 'Active' },
]
const m = (id: string, name: string, sku: string, wh: string, unit: string, onHand: number, reserved: number, reorder: number, critical: number, unitCost: number, supplierId: string): Material =>
  ({ id, name, sku, warehouse: wh, unit, onHand, reserved, reorder, critical, unitCost, supplierId })
export const seedMaterials = (): Material[] => [
  m('m1', 'Cotton Fabric', 'FAB-COT-001', 'RM-WH', 'kg', 4800, 0, 5000, 2000, 595, 's1'),
  m('m2', 'Polyester Fabric', 'FAB-POL-001', 'RM-WH', 'kg', 6200, 800, 3000, 1200, 380, 's2'),
  m('m3', 'Rib Fabric', 'FAB-RIB-001', 'RM-WH', 'kg', 1850, 0, 1500, 600, 450, 's2'),
  m('m4', 'Denim Fabric', 'FAB-DEN-001', 'RM-WH', 'kg', 3100, 400, 2500, 1000, 700, 's6'),
  m('m5', 'Black Thread', 'THR-BLK-001', 'RM-WH', 'm', 80000, 10000, 40000, 15000, 0.35, 's5'),
  m('m6', 'White Thread', 'THR-WHT-001', 'RM-WH', 'm', 52000, 0, 40000, 15000, 0.35, 's5'),
  m('m7', 'Neck Label', 'LAB-NECK-001', 'RM-WH', 'pcs', 4500, 0, 5000, 1500, 3.5, 's3'),
  m('m8', 'Size Label', 'LAB-SIZE-001', 'RM-WH', 'pcs', 5500, 0, 3000, 1000, 2.5, 's3'),
  m('m9', 'Hang Tag', 'TAG-001', 'MF-WH', 'pcs', 8000, 0, 4000, 1500, 4, 's3'),
  m('m10', 'Poly Bag', 'BAG-001', 'RM-WH', 'pcs', 10000, 0, 5000, 2000, 5, 's4'),
  m('m11', 'Carton', 'CTN-001', 'MF-WH', 'pcs', 900, 0, 600, 250, 65, 's4'),
  m('m12', 'Hoodie Zipper', 'ZIP-HOD-001', 'RM-WH', 'pcs', 700, 0, 1500, 800, 28, 's3'),
  m('m13', 'Drawcord', 'ACC-DRW-001', 'RM-WH', 'm', 2200, 0, 3000, 1200, 6, 's3'),
  m('m14', 'Button (4-hole)', 'ACC-BTN-001', 'RM-WH', 'pcs', 12000, 0, 6000, 2000, 1.5, 's3'),
]

export const seedBom = (): Record<string, BomLine[]> => ({
  p1: [
    { materialId: 'm1', qty: 1.2, unit: 'kg' }, { materialId: 'm5', qty: 15, unit: 'm' }, { materialId: 'm7', qty: 1, unit: 'pcs' },
    { materialId: 'm8', qty: 1, unit: 'pcs' }, { materialId: 'm10', qty: 1, unit: 'pcs' }, { materialId: 'm9', qty: 1, unit: 'pcs' },
  ],
  p2: [{ materialId: 'm1', qty: 0.95, unit: 'kg' }, { materialId: 'm6', qty: 18, unit: 'm' }, { materialId: 'm14', qty: 2, unit: 'pcs' }, { materialId: 'm7', qty: 1, unit: 'pcs' }, { materialId: 'm10', qty: 1, unit: 'pcs' }, { materialId: 'm9', qty: 1, unit: 'pcs' }],
  p3: [{ materialId: 'm2', qty: 0.8, unit: 'kg' }, { materialId: 'm3', qty: 0.15, unit: 'kg' }, { materialId: 'm5', qty: 30, unit: 'm' }, { materialId: 'm12', qty: 1, unit: 'pcs' }, { materialId: 'm13', qty: 1.2, unit: 'm' }, { materialId: 'm10', qty: 1, unit: 'pcs' }],
  p4: [{ materialId: 'm4', qty: 1.1, unit: 'kg' }, { materialId: 'm6', qty: 25, unit: 'm' }, { materialId: 'm14', qty: 8, unit: 'pcs' }, { materialId: 'm8', qty: 1, unit: 'pcs' }, { materialId: 'm10', qty: 1, unit: 'pcs' }],
  p5: [{ materialId: 'm4', qty: 0.9, unit: 'kg' }, { materialId: 'm6', qty: 28, unit: 'm' }, { materialId: 'm14', qty: 5, unit: 'pcs' }, { materialId: 'm8', qty: 1, unit: 'pcs' }, { materialId: 'm10', qty: 1, unit: 'pcs' }],
  p6: [{ materialId: 'm2', qty: 0.7, unit: 'kg' }, { materialId: 'm3', qty: 0.12, unit: 'kg' }, { materialId: 'm5', qty: 24, unit: 'm' }, { materialId: 'm7', qty: 1, unit: 'pcs' }, { materialId: 'm10', qty: 1, unit: 'pcs' }],
})

export const seedMovements = (): Movement[] => {
  const u = ['Sadia Rahman', 'Mehedi Hasan', 'Tanvir Hossain', 'Karim Hasan']
  const rows: [string, string, string, string, MovementType, number, string, string][] = [
    ['2026-10-08', 'FAB-COT-001', 'Cotton Fabric', 'RM-WH', 'PRODUCTION_CONSUMPTION', -1250, 'kg', 'PP-2026-001'],
    ['2026-10-08', 'NXR-TS-M-BLK', 'Premium Cotton T-Shirt', 'FG-WH', 'PRODUCTION_OUTPUT', 600, 'pcs', 'PP-2026-004'],
    ['2026-10-07', 'THR-BLK-001', 'Black Thread', 'RM-WH', 'ISSUE', -10000, 'm', 'PP-2026-001'],
    ['2026-10-07', 'FAB-DEN-001', 'Denim Fabric', 'RM-WH', 'RECEIPT', 1200, 'kg', 'PO-2026-015'],
    ['2026-10-06', 'LAB-NECK-001', 'Neck Label', 'RM-WH', 'ADJUSTMENT', -120, 'pcs', 'ADJ-0042 (damaged)'],
    ['2026-10-06', 'FAB-POL-001', 'Polyester Fabric', 'RM-WH', 'RECEIPT', 2000, 'kg', 'PO-2026-014'],
    ['2026-10-05', 'CTN-001', 'Carton', 'MF-WH', 'TRANSFER', 300, 'pcs', 'TRF-0019 RM-WH → MF-WH'],
    ['2026-10-05', 'NXR-PL-L-NVY', 'Classic Polo Shirt', 'FG-WH', 'RETURN', 24, 'pcs', 'ORD-10198 return'],
    ['2026-10-04', 'ACC-BTN-001', 'Button (4-hole)', 'RM-WH', 'RECEIPT', 8000, 'pcs', 'PO-2026-013'],
    ['2026-10-03', 'FAB-COT-001', 'Cotton Fabric', 'RM-WH', 'ISSUE', -900, 'kg', 'PP-2026-002'],
    ['2026-10-02', 'URB-DS-M-BLU', 'Denim Shirt', 'FG-WH', 'PRODUCTION_OUTPUT', 1500, 'pcs', 'PP-2026-004'],
    ['2026-10-01', 'BAG-001', 'Poly Bag', 'RM-WH', 'RECEIPT', 10000, 'pcs', 'PO-2026-012'],
  ]
  return rows.map((r, i) => ({ id: `mv${i}`, date: r[0], sku: r[1], item: r[2], warehouse: r[3], type: r[4], qty: r[5], unit: r[6], ref: r[7], user: u[i % u.length] }))
}

// ---- suppliers / procurement ----
export const seedSuppliers = (): Supplier[] => [
  { id: 's1', name: 'Bengal Textile Mills', type: 'Fabric Manufacturer', contact: 'Abdul Karim', phone: '+880 17XX-XXXXXX', location: 'Dhaka', rating: 4.8, status: 'Active' },
  { id: 's2', name: 'Dhaka Fabric House', type: 'Fabric Supplier', contact: 'Shahidul Islam', phone: '+880 18XX-XXXXXX', location: 'Dhaka', rating: 4.5, status: 'Active' },
  { id: 's3', name: 'Prime Accessories Ltd.', type: 'Accessories Supplier', contact: 'Farhana Akter', phone: '+880 19XX-XXXXXX', location: 'Gazipur', rating: 4.6, status: 'Active' },
  { id: 's4', name: 'Metro Packaging', type: 'Packaging Supplier', contact: 'Jamal Uddin', phone: '+880 16XX-XXXXXX', location: 'Narayanganj', rating: 4.4, status: 'Active' },
  { id: 's5', name: 'National Thread Supply', type: 'Thread Supplier', contact: 'Rafiq Mia', phone: '+880 15XX-XXXXXX', location: 'Chattogram', rating: 4.7, status: 'Active' },
  { id: 's6', name: 'Rupsha Denim Mills', type: 'Fabric Manufacturer', contact: 'Sohel Rana', phone: '+880 17XX-XXXXXX', location: 'Narayanganj', rating: 4.3, status: 'Active' },
  { id: 's7', name: 'Padma Trims & Labels', type: 'Accessories Supplier', contact: 'Rokeya Begum', phone: '+880 13XX-XXXXXX', location: 'Dhaka', rating: 4.1, status: 'Inactive' },
  { id: 's8', name: 'Chattogram Thread Works', type: 'Thread Supplier', contact: 'Nasir Uddin', phone: '+880 18XX-XXXXXX', location: 'Chattogram', rating: 4.4, status: 'Active' },
  { id: 's9', name: 'Eastern Yarn & Thread Co.', type: 'Thread Supplier', contact: 'Rubel Khan', phone: '+880 17XX-XXXXXX', location: 'Gazipur', rating: 4.2, status: 'Active' },
  { id: 's10', name: 'Zenith Trims Ltd.', type: 'Accessories Supplier', contact: 'Salma Akter', phone: '+880 19XX-XXXXXX', location: 'Dhaka', rating: 4.5, status: 'Active' },
  { id: 's11', name: 'Hilltop Labels & Tags', type: 'Accessories Supplier', contact: 'Imran Hossain', phone: '+880 16XX-XXXXXX', location: 'Narayanganj', rating: 4.3, status: 'Active' },
  { id: 's12', name: 'Pack Bangla Ltd.', type: 'Packaging Supplier', contact: 'Jesmin Begum', phone: '+880 15XX-XXXXXX', location: 'Gazipur', rating: 4.5, status: 'Active' },
  { id: 's13', name: 'GreenPack Industries', type: 'Packaging Supplier', contact: 'Habib Rahman', phone: '+880 13XX-XXXXXX', location: 'Dhaka', rating: 4.1, status: 'Active' },
]
export const seedRequirements = (): Requirement[] => [
  { id: 'PR-2026-011', materialId: 'm12', qty: 1500, reason: 'Reorder – Premium Hoodie line', supplierId: 's3', expected: '2026-10-18', priority: 'High', notes: '', status: 'Pending Purchase', created: '2026-10-06' },
  { id: 'PR-2026-012', materialId: 'm13', qty: 2000, reason: 'Production Plan PP-2026-003', supplierId: 's3', expected: '2026-10-16', priority: 'Normal', notes: '', status: 'Pending Purchase', created: '2026-10-07' },
  { id: 'PR-2026-013', materialId: 'm3', qty: 800, reason: 'Safety stock top-up', supplierId: 's2', expected: '2026-10-20', priority: 'Low', notes: '', status: 'Pending Purchase', created: '2026-10-07' },
]
export const seedPOs = (): PO[] => [
  { id: 'PO-2026-018', supplierId: 's2', items: [{ materialId: 'm2', qty: 2000, price: 480, received: 0 }, { materialId: 'm3', qty: 1000, price: 600, received: 0 }], expected: '2026-10-22', warehouse: 'RM-WH', notes: 'Fabric for Q4 hoodie and sweatshirt runs', status: 'Draft', created: '2026-10-07' },
  { id: 'PO-2026-017', supplierId: 's5', items: [{ materialId: 'm5', qty: 60000, price: 0.35, received: 0 }, { materialId: 'm6', qty: 40000, price: 0.35, received: 0 }], expected: '2026-10-14', warehouse: 'RM-WH', notes: '', status: 'Ordered', created: '2026-10-04' },
  { id: 'PO-2026-016', supplierId: 's3', items: [{ materialId: 'm7', qty: 10000, price: 3.5, received: 4000 }, { materialId: 'm8', qty: 10000, price: 2.5, received: 4000 }], expected: '2026-10-12', warehouse: 'RM-WH', notes: '', status: 'Partially Received', created: '2026-10-01' },
  { id: 'PO-2026-015', supplierId: 's6', items: [{ materialId: 'm4', qty: 1200, price: 640, received: 1200 }], expected: '2026-10-07', warehouse: 'RM-WH', notes: '', status: 'Received', created: '2026-09-28' },
  { id: 'PO-2026-014', supplierId: 's2', items: [{ materialId: 'm2', qty: 2000, price: 380, received: 2000 }], expected: '2026-10-06', warehouse: 'RM-WH', notes: '', status: 'Closed', created: '2026-09-25' },
  { id: 'PO-2026-013', supplierId: 's3', items: [{ materialId: 'm14', qty: 8000, price: 1.5, received: 8000 }], expected: '2026-10-04', warehouse: 'RM-WH', notes: '', status: 'Closed', created: '2026-09-22' },
  { id: 'PO-2026-012', supplierId: 's4', items: [{ materialId: 'm10', qty: 10000, price: 5, received: 10000 }], expected: '2026-10-01', warehouse: 'RM-WH', notes: '', status: 'Closed', created: '2026-09-18' },
]

// ---- production ----
const plan = (id: string, productId: string, variant: string, target: number, cut: number, sewn: number, finished: number, stage: Stage, status: Plan['status'], start: string, end: string, supervisor: string, team: string, extra: Partial<Plan> = {}): Plan => ({
  id, productId, variant, target, issued: Math.min(target, Math.round(cut * 1.07)), cut, sewn, finished, wasteKg: Math.round(cut * 0.0286), sewReject: Math.round(sewn * 0.01), stage, status, start, end, supervisor,
  priority: 'Normal', notes: '', warehouse: 'MF-WH', team, cuttingStarted: cut > 0, sewingStarted: sewn > 0,
  qcStatus: 'Not Ready', qcInspected: 0, qcPassed: 0, qcRejected: 0, qcInspector: 'Nusrat Jahan', qcReasons: {}, ...extra,
})
export const seedPlans = (): Plan[] => [
  plan('PP-2026-001', 'p1', 'All variants', 5000, 4200, 3850, 3600, 'Sewing', 'In Progress', '2026-10-01', '2026-10-15', 'Rahim Ahmed', 'Line A', { priority: 'High', issued: 4500, wasteKg: 120, notes: 'Autumn collection – Nexora Basics' }),
  plan('PP-2026-002', 'p2', 'All variants', 3000, 3000, 2100, 1900, 'Finishing', 'In Progress', '2026-10-03', '2026-10-18', 'Karim Hasan', 'Line B', { matIssued: true }),
  plan('PP-2026-003', 'p3', 'All variants', 2500, 1900, 1050, 700, 'Cutting', 'In Progress', '2026-10-05', '2026-10-25', 'Tanvir Hossain', 'Line C', { priority: 'High', matIssued: true }),
  plan('PP-2026-004', 'p4', 'All variants', 1500, 1500, 1500, 1500, 'Completed', 'Completed', '2026-09-18', '2026-10-02', 'Mehedi Hasan', 'Line D', { matIssued: true, qcStatus: 'Moved to Finished Goods', qcInspected: 1500, qcPassed: 1472, qcRejected: 28 }),
  plan('PP-2026-005', 'p5', 'All variants', 2000, 1200, 800, 400, 'Sewing', 'In Progress', '2026-10-04', '2026-10-22', 'Sadia Rahman', 'Line E', { matIssued: true }),
  plan('PP-2026-006', 'p6', 'All variants', 1800, 1800, 1500, 900, 'Finishing', 'In Progress', '2026-10-02', '2026-10-17', 'Karim Hasan', 'Line B', { matIssued: true }),
  plan('PP-2026-007', 'p4', 'All variants', 1200, 0, 0, 0, 'Material Check', 'Ready', '2026-10-12', '2026-10-28', 'Mehedi Hasan', 'Unassigned'),
  plan('PP-2026-008', 'p3', 'All variants', 1500, 0, 0, 0, 'Planned', 'Planned', '2026-10-20', '2026-11-08', 'Tanvir Hossain', 'Unassigned'),
  plan('PP-2026-009', 'p2', 'All variants', 2200, 0, 0, 0, 'Planned', 'Planned', '2026-10-24', '2026-11-12', 'Karim Hasan', 'Unassigned'),
]

// ---- HR ----
export const DEPARTMENTS = ['Management', 'HR', 'Production', 'Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Warehouse', 'Procurement', 'Merchandising', 'Accounts']
const DEPT_COUNT: Record<string, number> = { Management: 4, HR: 5, Production: 10, Cutting: 14, Sewing: 40, Finishing: 18, 'Quality Control': 10, Warehouse: 8, Procurement: 5, Merchandising: 7, Accounts: 5 }
export const DESIGNATIONS: Record<string, [string, number, string][]> = {
  Management: [['Managing Director', 120000, 'Admin'], ['Factory Manager', 85000, 'Manager'], ['Operations Manager', 70000, 'Manager'], ['General Manager', 95000, 'Manager']],
  HR: [['HR Manager', 55000, 'HR Officer'], ['HR Executive', 28000, 'HR Officer'], ['Welfare Officer', 24000, 'HR Officer']],
  Production: [['Production Manager', 60000, 'Manager'], ['Line Supervisor', 32000, 'Supervisor'], ['Production Planner', 38000, 'Supervisor']],
  Cutting: [['Cutting Master', 34000, 'Supervisor'], ['Cutting Operator', 17500, 'Production Worker'], ['Fabric Spreader', 15000, 'Production Worker']],
  Sewing: [['Sewing Supervisor', 30000, 'Supervisor'], ['Line Leader', 22000, 'Supervisor'], ['Sewing Operator', 18000, 'Production Worker'], ['Helper', 13500, 'Production Worker']],
  Finishing: [['Finishing Supervisor', 28000, 'Supervisor'], ['Iron Operator', 16000, 'Production Worker'], ['Packer', 14000, 'Production Worker']],
  'Quality Control': [['QC Manager', 48000, 'QC Inspector'], ['QC Inspector', 22000, 'QC Inspector']],
  Warehouse: [['Store Manager', 42000, 'Store Keeper'], ['Store Keeper', 22000, 'Store Keeper'], ['Loader', 13000, 'Store Keeper']],
  Procurement: [['Procurement Manager', 52000, 'Manager'], ['Purchase Officer', 30000, 'Accountant']],
  Merchandising: [['Head of Merchandising', 65000, 'Manager'], ['Senior Merchandiser', 42000, 'Merchandiser'], ['Merchandiser', 30000, 'Merchandiser'], ['Assistant Merchandiser', 22000, 'Merchandiser']],
  Accounts: [['Accounts Manager', 58000, 'Accountant'], ['Accountant', 30000, 'Accountant']],
}
export const SYSTEM_ROLES = ['Admin', 'Manager', 'Supervisor', 'Production Worker', 'HR Officer', 'Store Keeper', 'Accountant', 'QC Inspector', 'Merchandiser']
const MALE = ['Rahim', 'Karim', 'Tanvir', 'Mehedi', 'Abdul', 'Rafiq', 'Jamal', 'Faruk', 'Shahidul', 'Imran', 'Sohel', 'Habib', 'Masud', 'Kamal', 'Nasir', 'Alamgir', 'Shamim', 'Rubel', 'Jahid', 'Arif', 'Sabbir', 'Anwar', 'Liton', 'Monir', 'Parvez', 'Ripon', 'Salam', 'Taslim']
const FEMALE = ['Nusrat', 'Sadia', 'Farhana', 'Shirin', 'Rokeya', 'Morjina', 'Sumaiya', 'Laboni', 'Ruma', 'Shapla', 'Taslima', 'Rina', 'Moushumi', 'Jesmin', 'Salma', 'Nasrin', 'Popy', 'Sharmin', 'Rehana', 'Khadija', 'Halima', 'Rabeya']
const ML = ['Ahmed', 'Hasan', 'Hossain', 'Islam', 'Khan', 'Mia', 'Uddin', 'Ali', 'Sarker', 'Rahman', 'Sheikh']
const FL = ['Jahan', 'Rahman', 'Akter', 'Begum', 'Khatun', 'Sultana', 'Parvin', 'Yasmin']
const FIXED: [string, string, string][] = [['Rahim Ahmed', 'Sewing', 'Sewing Operator'], ['Karim Hasan', 'Production', 'Line Supervisor'], ['Nusrat Jahan', 'Quality Control', 'QC Inspector'], ['Tanvir Hossain', 'Production', 'Production Manager'], ['Mehedi Hasan', 'Cutting', 'Cutting Master'], ['Sadia Rahman', 'Warehouse', 'Store Keeper']]
export const seedEmployees = (): Employee[] => {
  const list: Employee[] = []
  const used = new Set<string>()
  const dateOf = () => `${2018 + Math.floor(rnd() * 8)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`
  const add = (name: string, dept: string, desig: string) => {
    const d = DESIGNATIONS[dept].find((x) => x[0] === desig) || DESIGNATIONS[dept][DESIGNATIONS[dept].length - 1]
    const n = list.length + 1
    const t = rnd()
    list.push({
      id: `EMP-${String(n).padStart(3, '0')}`, name, dept, designation: d[0], role: d[2], joined: dateOf(),
      type: t < 0.82 ? 'Permanent' : t < 0.94 ? 'Contract' : 'Probation', status: 'Active',
      basic: Math.round((d[1] * (0.95 + rnd() * 0.15)) / 100) * 100, phone: `+880 1${pick([7, 8, 9, 6, 5])}XX-XXX${String(n).padStart(3, '0')}`,
      email: `${name.toLowerCase().replace(/ /g, '.')}@winnerapparels.com`, leave: { casual: 10, sick: 14, annual: 20 },
      perf: { output: Math.round(120 + rnd() * 180), rejectRate: +(0.5 + rnd() * 2.5).toFixed(1), efficiency: Math.round(78 + rnd() * 20) },
    })
    used.add(name)
  }
  FIXED.forEach(([n, d, g]) => add(n, d, g))
  const counts = { ...DEPT_COUNT }
  FIXED.forEach(([, d]) => counts[d]--)
  Object.entries(counts).forEach(([dept, c]) => {
    const desigs = DESIGNATIONS[dept]
    for (let i = 0; i < c; i++) {
      // first slot of each department is its leadership role; the rest weighted to the last (largest) designation
      const dg = desigs.length === 1 ? desigs[0] : i === 0 && !list.some((e) => e.dept === dept && e.designation === desigs[0][0]) ? desigs[0] : desigs[Math.min(desigs.length - 1, 1 + Math.floor(rnd() * (desigs.length - 1) * 1.6))]
      let name = ''
      do {
        const female = rnd() < 0.42
        name = female ? `${pick(FEMALE)} ${pick(FL)}` : `${pick(MALE)} ${pick(ML)}`
      } while (used.has(name))
      add(name, dept, dg[0])
    }
  })
  return list
}
export const seedAttendance = (emps: Employee[]): Attendance[] => {
  const days = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']
  const out: Attendance[] = []
  days.forEach((date) => emps.forEach((e, i) => {
    const r = rnd()
    const status: Attendance['status'] = r < 0.86 ? 'Present' : r < 0.93 ? 'Late' : r < 0.97 ? 'Absent' : 'Leave'
    const hh = status === 'Late' ? 9 : 8
    const mm = Math.floor(rnd() * 50)
    const oh = 17, om = Math.floor(rnd() * 40)
    const hours = status === 'Absent' || status === 'Leave' ? 0 : +((oh * 60 + om - hh * 60 - mm) / 60).toFixed(1)
    const p = (n: number) => String(n).padStart(2, '0')
    out.push({ id: `a-${date}-${i}`, date, empId: e.id, in: hours ? `${p(hh)}:${p(mm)}` : '—', out: hours ? `${p(oh)}:${p(om)}` : '—', status, hours })
  }))
  return out
}
export const seedLeaves = (): Leave[] => [
  { id: 'LV-2041', empId: 'EMP-003', type: 'Casual', from: '2026-10-10', to: '2026-10-11', days: 2, status: 'Pending', reason: 'Family function in Rajshahi' },
  { id: 'LV-2040', empId: 'EMP-002', type: 'Sick', from: '2026-10-08', to: '2026-10-09', days: 2, status: 'Approved', reason: 'Fever and rest advised by doctor' },
  { id: 'LV-2039', empId: 'EMP-010', type: 'Annual', from: '2026-10-19', to: '2026-10-23', days: 5, status: 'Pending', reason: 'Annual vacation' },
  { id: 'LV-2038', empId: 'EMP-018', type: 'Casual', from: '2026-10-14', to: '2026-10-14', days: 1, status: 'Pending', reason: 'Personal work' },
  { id: 'LV-2037', empId: 'EMP-025', type: 'Sick', from: '2026-10-05', to: '2026-10-06', days: 2, status: 'Approved', reason: 'Medical check-up' },
  { id: 'LV-2036', empId: 'EMP-033', type: 'Casual', from: '2026-10-02', to: '2026-10-02', days: 1, status: 'Rejected', reason: 'Production deadline – peak week' },
  { id: 'LV-2035', empId: 'EMP-047', type: 'Annual', from: '2026-11-02', to: '2026-11-06', days: 5, status: 'Approved', reason: 'Hometown visit' },
  { id: 'LV-2034', empId: 'EMP-060', type: 'Sick', from: '2026-10-07', to: '2026-10-07', days: 1, status: 'Approved', reason: 'Seasonal flu' },
]
export const seedPayrollHistory = () => [
  { month: 'September 2026', employees: 124, gross: 3590000, deductions: 179500, net: 3410500, status: 'Paid' },
  { month: 'August 2026', employees: 121, gross: 3482000, deductions: 171200, net: 3310800, status: 'Paid' },
  { month: 'July 2026', employees: 120, gross: 3455000, deductions: 168000, net: 3287000, status: 'Paid' },
]

// ---- merchandising ----
export const seedBuyers = (merch: string[]): Buyer[] => {
  const rows: [string, string, string, string, string, string][] = [
    ['Northwind Apparel Co.', 'Retail Chain', 'US', 'Daniel Brooks', 'daniel.brooks@northwind-apparel.com', 'LC at sight'],
    ['Nordlicht Fashion GmbH', 'Brand', 'DE', 'Katrin Vogel', 'k.vogel@nordlicht-fashion.de', 'TT 60 days'],
    ['Thames & Co. Retail', 'Retail Chain', 'GB', 'Oliver Grant', 'oliver.grant@thamesco.co.uk', 'LC 90 days'],
    ['Maison Aurelle', 'Brand', 'FR', 'Camille Laurent', 'c.laurent@maison-aurelle.fr', 'TT 30 days'],
    ['Fjord Basics AB', 'Brand', 'SE', 'Elin Larsson', 'elin@fjordbasics.se', 'TT 60 days'],
    ['Costa Moda S.A.', 'Wholesaler', 'ES', 'Lucia Romero', 'lromero@costamoda.es', 'LC at sight'],
    ['Maple Leaf Outfitters', 'Retail Chain', 'CA', 'Ethan Clarke', 'e.clarke@mapleleafoutfitters.ca', 'TT 30 days'],
    ['Sakura Casual KK', 'Brand', 'JP', 'Hiroshi Tanaka', 'h.tanaka@sakuracasual.jp', 'LC at sight'],
  ]
  return rows.map(([name, type, country, contact, email, term], i) => ({ id: `B-${String(i + 1).padStart(3, '0')}`, name, type, country, contact, email, merchandiser: merch[i % merch.length], term, status: 'Active' as const }))
}
export const seedOrders = (products: Product[], buyers: Buyer[]): Order[] => {
  const L = (pid: string, name: string, qty: number): OrderLine => { const p = products.find((x) => x.id === pid)!; const v = p.variants.find((x) => x.name === name) || p.variants[0]; return { productId: pid, sku: v.sku, variant: v.name, qty, price: FOB[pid] } }
  const raw: [string, string, string, string, string, OrderLine[], number][] = [
    ['WA-2026-0231', 'NW-PO-88412', 'B-001', '2026-10-08', '2026-11-20', [L('p1', 'M / Black', 1200), L('p1', 'L / Black', 1200), L('p1', 'XL / White', 800)], 1],
    ['WA-2026-0230', 'NL-4471-A', 'B-002', '2026-10-07', '2026-11-12', [L('p3', 'L / Grey', 450), L('p3', 'M / Navy', 450)], 0],
    ['WA-2026-0229', 'TC-PO-2210', 'B-003', '2026-10-06', '2026-11-05', [L('p2', 'M / Navy', 600), L('p2', 'L / White', 600)], 3],
    ['WA-2026-0228', 'MA-AW26-017', 'B-004', '2026-10-04', '2026-10-30', [L('p6', 'M / Grey', 500), L('p6', 'L / Maroon', 300)], 4],
    ['WA-2026-0227', 'FB-26-0933', 'B-005', '2026-10-02', '2026-10-24', [L('p1', 'S / Green', 700), L('p1', 'M / Green', 700)], 5],
    ['WA-2026-0226', 'CM-77120', 'B-006', '2026-09-28', '2026-10-12', [L('p4', 'M / Blue', 400), L('p5', '32 / Khaki', 400)], 6],
    ['WA-2026-0225', 'ML-PO-3305', 'B-007', '2026-09-24', '2026-10-06', [L('p5', '34 / Navy', 350), L('p4', 'L / Indigo', 300)], 7],
    ['WA-2026-0224', 'SC-1180', 'B-008', '2026-09-20', '2026-10-02', [L('p1', 'L / White', 900), L('p2', 'S / Black', 300)], 7],
    ['WA-2026-0223', 'NW-PO-88305', 'B-001', '2026-09-15', '2026-09-30', [L('p6', 'S / Black', 600)], 7],
    ['WA-2026-0222', 'NL-4398-B', 'B-002', '2026-09-10', '2026-09-26', [L('p2', 'XL / Navy', 500), L('p3', 'XL / Black', 200)], 7],
    ['WA-2026-0221', 'TC-PO-2188', 'B-003', '2026-10-01', '2026-11-18', [L('p5', '36 / Olive', 800)], 2],
    ['WA-2026-0220', 'MA-AW26-009', 'B-004', '2026-09-29', '2026-11-02', [L('p4', 'S / Blue', 650)], -1],
  ]
  return raw.map(([id, buyerPO, buyer, date, shipDate, lines, step]) => { const b = buyers.find((x) => x.id === buyer)!; return { id, buyerPO, buyer, date, shipDate, country: b.country, merchandiser: b.merchandiser, term: b.term, lines, step: Math.max(step, 0), cancelled: step === -1 } })
}

export const seedActivities = () => [
  { id: 'ac1', icon: 'po', text: 'Purchase order PO-2026-015 received from Rupsha Denim Mills', by: 'Sadia Rahman', time: '12 min ago' },
  { id: 'ac2', icon: 'prod', text: 'Production started for PP-2026-006 (Basic Sweatshirt)', by: 'Tanvir Hossain', time: '38 min ago' },
  { id: 'ac3', icon: 'hr', text: 'Employee leave approved – Karim Hasan (Sick, 2 days)', by: 'HR Manager', time: '1 hr ago' },
  { id: 'ac4', icon: 'fg', text: '1,472 Denim Shirts added to Finished Goods', by: 'Nusrat Jahan', time: '2 hr ago' },
  { id: 'ac7', icon: 'po', text: 'Shipment of order WA-2026-0226 left Chattogram port for Valencia', by: 'Commercial', time: '5 hr ago' },
  { id: 'ac5', icon: 'stock', text: 'Stock adjustment ADJ-0042: Neck Label −120 pcs (damaged)', by: 'Sadia Rahman', time: '3 hr ago' },
  { id: 'ac6', icon: 'sup', text: 'New supplier added: Padma Trims & Labels', by: 'Procurement', time: 'Yesterday' },
]

export const seedSalesSeries = () => {
  const vals: number[] = []
  for (let i = 0; i < 29; i++) vals.push(300000 + rnd() * 300000 + (i % 7 === 5 ? 90000 : 0))
  const total = vals.reduce((a, b) => a + b, 0)
  const scaled = vals.map((v) => Math.round(((v / total) * (12850000 - 485000)) / 1000) * 1000)
  scaled.push(485000)
  return scaled.map((revenue, i) => {
    const d = new Date(2026, 8, 9 + i)
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue, orders: Math.round(revenue / 6800 + rnd() * 6) }
  })
}
