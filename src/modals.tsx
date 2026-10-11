import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useStore, useUI, poTotal, empName } from './store'
import { DESIGNATIONS, DEPARTMENTS, SYSTEM_ROLES, TODAY, salaryParts, fobOf, type POItem } from './data'
import { DatePicker, FormField, Modal, Money, Select, fmt, money, usd } from './ui'

const useF = <T extends Record<string, any>>(init: T) => {
  const [f, setF] = useState(init)
  return { f, set: <K extends keyof T>(k: K, v: T[K]) => setF((p) => ({ ...p, [k]: v })) }
}
const SUPPLIER_TYPES = ['Fabric Manufacturer', 'Fabric Supplier', 'Thread Supplier', 'Accessories Supplier', 'Packaging Supplier']

function ReceiveModal({ poId, materialId }: { poId?: string; materialId?: string }) {
  const { s, a } = useStore()
  const openPOs = s.pos.filter((p) => p.status === 'Ordered' || p.status === 'Partially Received')
  const initPO = poId ? s.pos.find((p) => p.id === poId) : undefined
  const initMat = materialId || initPO?.items.find((i) => i.received < i.qty)?.materialId || initPO?.items[0].materialId || ''
  const { f, set } = useF({ poId: poId || '', supplierId: initPO?.supplierId || '', warehouse: initPO?.warehouse || 'RM-WH', materialId: initMat, qty: (() => { const it = initPO?.items.find((i) => i.materialId === initMat); return it ? String(it.qty - it.received) : '' })() as string, batch: `LOT-${TODAY.replace(/-/g, '')}-01`, date: TODAY, quality: 'Passed', notes: '' })
  const po = s.pos.find((p) => p.id === f.poId)
  const item = po?.items.find((i) => i.materialId === f.materialId)
  const mat = s.materials.find((m) => m.id === f.materialId)
  const pending = item ? Math.max(0, item.qty - item.received) : 0
  const pickPO = (id: string) => {
    const p = s.pos.find((x) => x.id === id)
    const it = p?.items.find((i) => i.received < i.qty) || p?.items[0]
    set('poId', id)
    if (p) { set('supplierId', p.supplierId); set('warehouse', p.warehouse); if (it) { set('materialId', it.materialId); set('qty', String(it.qty - it.received)) } }
  }
  const qty = parseFloat(f.qty) || 0
  const ok = f.materialId && qty > 0
  return (
    <Modal title="Receive Material" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button>
      <button className="btn-primary" disabled={!ok} onClick={() => { a.receiveMaterial({ materialId: f.materialId, qty, poId: f.poId || undefined, warehouse: f.warehouse, batch: f.batch, quality: f.quality, supplierId: f.supplierId }); a.closeModal() }}>Receive Material</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Purchase Order"><Select value={f.poId} onChange={pickPO} placeholder="— Direct receipt (no PO) —" options={openPOs.map((p) => ({ value: p.id, label: `${p.id} · ${s.suppliers.find((x) => x.id === p.supplierId)?.name}` }))} /></FormField>
        <FormField label="Supplier"><Select value={f.supplierId} onChange={(v) => set('supplierId', v)} placeholder="Select supplier" options={s.suppliers.map((x) => ({ value: x.id, label: x.name }))} /></FormField>
        <FormField label="Warehouse"><Select value={f.warehouse} onChange={(v) => set('warehouse', v)} options={s.warehouses.map((w) => ({ value: w.code, label: `${w.name} (${w.code})` }))} /></FormField>
        <FormField label="Material" required><Select value={f.materialId} onChange={(v) => { set('materialId', v); const it = po?.items.find((i) => i.materialId === v); if (it) set('qty', String(it.qty - it.received)) }} placeholder="Select material" options={(po ? po.items.map((i) => i.materialId) : s.materials.map((m) => m.id)).map((id) => ({ value: id, label: s.materials.find((m) => m.id === id)!.name }))} /></FormField>
        <FormField label="Ordered Quantity"><input className="input bg-slate-50" readOnly value={item ? `${fmt(item.qty)} ${mat?.unit} (${fmt(item.received)} already received)` : '—'} /></FormField>
        <FormField label={`Received Quantity${mat ? ` (${mat.unit})` : ''}`} required hint={item ? `${fmt(pending)} ${mat?.unit} still pending on this PO` : undefined}><input type="number" className="input" value={f.qty} onChange={(e) => set('qty', e.target.value)} placeholder="0" /></FormField>
        <FormField label="Unit"><input className="input bg-slate-50" readOnly value={mat?.unit || '—'} /></FormField>
        <FormField label="Batch / Lot"><input className="input" value={f.batch} onChange={(e) => set('batch', e.target.value)} /></FormField>
        <FormField label="Receiving Date"><DatePicker value={f.date} onChange={(v) => set('date', v)} /></FormField>
        <FormField label="Quality Status"><Select value={f.quality} onChange={(v) => set('quality', v)} options={['Passed', 'Passed with Remarks', 'Rejected']} /></FormField>
        <FormField label="Notes" className="sm:col-span-2"><textarea className="input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Delivered by truck, 2 cartons slightly damaged" /></FormField>
      </div>
      {mat && qty > 0 && f.quality !== 'Rejected' && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{mat.name} stock will go from <b>{fmt(mat.onHand)}</b> to <b>{fmt(mat.onHand + qty)} {mat.unit}</b>.</div>}
    </Modal>
  )
}

function AdjustModal({ materialId }: { materialId?: string }) {
  const { s, a } = useStore()
  const { f, set } = useF({ materialId: materialId || s.materials[0].id, dir: 'Increase', qty: '', reason: 'Stock count correction' })
  const m = s.materials.find((x) => x.id === f.materialId)!
  const q = parseFloat(f.qty) || 0
  return (
    <Modal title="Adjust Inventory" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" disabled={q <= 0} onClick={() => { a.adjustInventory({ materialId: f.materialId, delta: f.dir === 'Increase' ? q : -q, reason: f.reason }); a.closeModal() }}>Save Adjustment</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Material" className="sm:col-span-2"><Select value={f.materialId} onChange={(v) => set('materialId', v)} options={s.materials.map((x) => ({ value: x.id, label: `${x.name} (${x.sku})` }))} /></FormField>
        <FormField label="Adjustment"><Select value={f.dir} onChange={(v) => set('dir', v)} options={['Increase', 'Decrease']} /></FormField>
        <FormField label={`Quantity (${m.unit})`}><input type="number" className="input" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></FormField>
        <FormField label="Reason" className="sm:col-span-2"><Select value={f.reason} onChange={(v) => set('reason', v)} options={['Stock count correction', 'Damaged goods', 'Sample usage', 'Found in stock', 'Expired / unusable']} /></FormField>
      </div>
      <div className="mt-3 text-xs text-slate-500">Current stock: <b>{fmt(m.onHand)} {m.unit}</b></div>
    </Modal>
  )
}

function RequirementModal({ materialId, qty, reason }: { materialId?: string; qty?: number; reason?: string }) {
  const { s, a } = useStore()
  const first = s.materials.find((m) => m.id === materialId) || s.materials[0]
  const { f, set } = useF({ materialId: first.id, qty: String(qty ?? Math.max(first.reorder * 2 - first.onHand, 100)), reason: reason || `Reorder – below reorder level`, supplierId: first.supplierId, expected: '2026-10-20', priority: 'Normal', notes: '' })
  const m = s.materials.find((x) => x.id === f.materialId)!
  return (
    <Modal title="Create Purchase Requirement" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button>
      <button className="btn-primary" disabled={!(parseFloat(f.qty) > 0)} onClick={() => { a.addRequirement({ materialId: f.materialId, qty: parseFloat(f.qty), reason: f.reason, supplierId: f.supplierId, expected: f.expected, priority: f.priority, notes: f.notes }); a.closeModal() }}>Save Requirement</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Material"><Select value={f.materialId} onChange={(v) => { set('materialId', v); set('supplierId', s.materials.find((x) => x.id === v)!.supplierId) }} options={s.materials.map((x) => ({ value: x.id, label: x.name }))} /></FormField>
        <FormField label={`Required Quantity (${m.unit})`}><input type="number" className="input" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></FormField>
        <FormField label="Reason" className="sm:col-span-2"><input className="input" value={f.reason} onChange={(e) => set('reason', e.target.value)} /></FormField>
        <FormField label="Preferred Supplier"><Select value={f.supplierId} onChange={(v) => set('supplierId', v)} options={s.suppliers.filter((x) => x.status === 'Active').map((x) => ({ value: x.id, label: x.name }))} /></FormField>
        <FormField label="Expected Date"><DatePicker value={f.expected} onChange={(v) => set('expected', v)} /></FormField>
        <FormField label="Priority"><Select value={f.priority} onChange={(v) => set('priority', v)} options={['Low', 'Normal', 'High', 'Urgent']} /></FormField>
        <FormField label="Notes"><input className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" /></FormField>
      </div>
      <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">This requirement will be saved as <b>Pending Purchase</b> and appear under Procurement → Purchase Requirements.</div>
    </Modal>
  )
}

function POModal({ reqId }: { reqId?: string }) {
  const { s, a } = useStore()
  const nav = useNavigate()
  const req = s.reqs.find((r) => r.id === reqId)
  const reqMat = req && s.materials.find((m) => m.id === req.materialId)
  const [supplierId, setSupplier] = useState(req?.supplierId || s.suppliers[0].id)
  const [expected, setExpected] = useState(req?.expected || '2026-10-20')
  const [warehouse, setWarehouse] = useState('RM-WH')
  const [notes, setNotes] = useState(req ? `Created from ${req.id} – ${req.reason}` : '')
  const [items, setItems] = useState<{ materialId: string; qty: string; price: string }[]>(req && reqMat ? [{ materialId: reqMat.id, qty: String(req.qty), price: String(reqMat.unitCost) }] : [{ materialId: s.materials[0].id, qty: '', price: String(s.materials[0].unitCost) }])
  const total = items.reduce((t, i) => t + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0)
  const upd = (i: number, k: string, v: string) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === 'materialId' ? { price: String(s.materials.find((m) => m.id === v)!.unitCost) } : {}) } : x)))
  return (
    <Modal wide title="Create Purchase Order" onClose={a.closeModal} footer={<><span className="mr-auto self-center text-sm text-slate-500">Total: <b className="text-slate-900">{money(total)}</b></span><button className="btn-secondary" onClick={a.closeModal}>Cancel</button>
      <button className="btn-primary" disabled={!total} onClick={() => {
        const clean: POItem[] = items.filter((i) => parseFloat(i.qty) > 0).map((i) => ({ materialId: i.materialId, qty: parseFloat(i.qty), price: parseFloat(i.price) || 0, received: 0 }))
        a.createPO({ supplierId, items: clean, expected, warehouse, notes, reqId }); a.closeModal(); nav('/procurement/orders')
      }}>Create Purchase Order</button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Supplier"><Select value={supplierId} onChange={setSupplier} options={s.suppliers.filter((x) => x.status === 'Active').map((x) => ({ value: x.id, label: x.name }))} /></FormField>
        <FormField label="Expected Delivery"><DatePicker value={expected} onChange={setExpected} /></FormField>
        <FormField label="Warehouse"><Select value={warehouse} onChange={setWarehouse} options={s.warehouses.map((w) => ({ value: w.code, label: w.name }))} /></FormField>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm"><thead><tr><th className="th">Item</th><th className="th">Quantity</th><th className="th">Unit Price (৳)</th><th className="th text-right">Line Total</th><th className="th w-8" /></tr></thead>
          <tbody>{items.map((it, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="p-2"><Select value={it.materialId} onChange={(v) => upd(i, 'materialId', v)} options={s.materials.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))} /></td>
              <td className="p-2"><input type="number" className="input w-28" value={it.qty} onChange={(e) => upd(i, 'qty', e.target.value)} /></td>
              <td className="p-2"><input type="number" className="input w-28" value={it.price} onChange={(e) => upd(i, 'price', e.target.value)} /></td>
              <td className="p-2 text-right tabular-nums">{money((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0))}</td>
              <td className="p-2">{items.length > 1 && <button className="text-slate-400 hover:text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={15} /></button>}</td>
            </tr>))}</tbody></table>
      </div>
      <button className="btn-ghost btn-sm mt-2" onClick={() => setItems([...items, { materialId: s.materials[0].id, qty: '', price: String(s.materials[0].unitCost) }])}><Plus size={13} />Add item</button>
      <FormField label="Notes" className="mt-3"><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
    </Modal>
  )
}

function EmployeeModal() {
  const { a } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', dept: 'Sewing', designation: 'Sewing Operator', role: 'Production Worker', basic: '18000', type: 'Permanent', joined: TODAY })
  const desigs = DESIGNATIONS[f.dept]
  const sal = salaryParts(parseFloat(f.basic) || 0)
  return (
    <Modal wide title="Add Employee" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button>
      <button className="btn-primary" disabled={!f.name.trim() || !sal.basic} onClick={() => { const id = a.addEmployee({ ...f, basic: sal.basic }); a.closeModal(); nav(`/hr/employees/${id}`) }}>Save Employee</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Full Name" required className="sm:col-span-2"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Shamim Chowdhury" /></FormField>
        <FormField label="Department"><Select value={f.dept} onChange={(v) => { const d = DESIGNATIONS[v][DESIGNATIONS[v].length - 1]; setF({ ...f, dept: v, designation: d[0], role: d[2], basic: String(d[1]) }) }} options={DEPARTMENTS} /></FormField>
        <FormField label="Job Designation"><Select value={f.designation} onChange={(v) => { const d = desigs.find((x) => x[0] === v)!; setF({ ...f, designation: v, role: d[2], basic: String(d[1]) }) }} options={desigs.map((d) => d[0])} /></FormField>
        <FormField label="System Role" hint="Controls what this person can do in the software – separate from job designation."><Select value={f.role} onChange={(v) => setF({ ...f, role: v })} options={SYSTEM_ROLES} /></FormField>
        <FormField label="Employment Type"><Select value={f.type} onChange={(v) => setF({ ...f, type: v })} options={['Permanent', 'Contract', 'Probation']} /></FormField>
        <FormField label="Joining Date"><DatePicker value={f.joined} onChange={(v) => setF({ ...f, joined: v })} /></FormField>
        <FormField label="Basic Salary (৳)"><input type="number" className="input" value={f.basic} onChange={(e) => setF({ ...f, basic: e.target.value })} /></FormField>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-5">
        {[['Basic', sal.basic], ['House (25%)', sal.house], ['Medical (10%)', sal.medical], ['Transport (10%)', sal.transport], ['Gross', sal.gross]].map(([l, v]) => <div key={l as string}><div className="text-xs text-slate-500">{l}</div><Money v={v as number} className="font-semibold text-slate-900" /></div>)}
      </div>
    </Modal>
  )
}

function WarehouseModal() {
  const { a } = useStore()
  const { f, set } = useF({ code: '', name: '', location: '', type: 'Raw Material' })
  return (
    <Modal title="Add Warehouse" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" disabled={!f.name || !f.code} onClick={() => { a.addWarehouse({ ...f, status: 'Active' }); a.closeModal() }}>Create Warehouse</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Warehouse Code" required><input className="input" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="e.g. SC-WH" /></FormField>
        <FormField label="Type"><Select value={f.type} onChange={(v) => set('type', v)} options={['Raw Material', 'Finished Goods', 'Production Floor Store', 'Returns']} /></FormField>
        <FormField label="Warehouse Name" required className="sm:col-span-2"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></FormField>
        <FormField label="Location" className="sm:col-span-2"><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="City / Area" /></FormField>
      </div>
    </Modal>
  )
}

function SupplierModal() {
  const { a } = useStore()
  const { f, set } = useF({ name: '', type: SUPPLIER_TYPES[0], contact: '', location: 'Dhaka' })
  return (
    <Modal title="Add Supplier" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" disabled={!f.name} onClick={() => { a.addSupplier({ ...f, phone: '+880 17XX-XXXXXX', rating: 4, status: 'Active' }); a.closeModal() }}>Save Supplier</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Supplier Name" required className="sm:col-span-2"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></FormField>
        <FormField label="Supplier Type"><Select value={f.type} onChange={(v) => set('type', v)} options={SUPPLIER_TYPES} /></FormField>
        <FormField label="Contact Person"><input className="input" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></FormField>
        <FormField label="Location"><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} /></FormField>
      </div>
    </Modal>
  )
}

function LeaveModal() {
  const { s, a } = useStore()
  const { f, set } = useF({ empId: 'EMP-003', type: 'Casual' as 'Casual' | 'Sick' | 'Annual', from: '2026-10-12', to: '2026-10-13', reason: '' })
  const days = Math.max(1, Math.round((new Date(f.to).getTime() - new Date(f.from).getTime()) / 86400000) + 1)
  return (
    <Modal title="New Leave Request" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" onClick={() => { a.addLeave({ ...f, days, reason: f.reason || 'Personal reasons' }); a.closeModal() }}>Submit Request</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Employee" className="sm:col-span-2"><Select value={f.empId} onChange={(v) => set('empId', v)} options={s.employees.map((e) => ({ value: e.id, label: `${e.name} (${e.id})` }))} /></FormField>
        <FormField label="Leave Type"><Select value={f.type} onChange={(v) => set('type', v as any)} options={['Casual', 'Sick', 'Annual']} /></FormField>
        <FormField label="Days"><input className="input bg-slate-50" readOnly value={days} /></FormField>
        <FormField label="From"><DatePicker value={f.from} onChange={(v) => set('from', v)} /></FormField>
        <FormField label="To"><DatePicker value={f.to} onChange={(v) => set('to', v)} /></FormField>
        <FormField label="Reason" className="sm:col-span-2"><input className="input" value={f.reason} onChange={(e) => set('reason', e.target.value)} /></FormField>
      </div>
    </Modal>
  )
}

function OrderModal({ buyer }: { buyer?: string }) {
  const { s, a } = useStore()
  const nav = useNavigate()
  const [buyerId, setBuyer] = useState(buyer || s.buyers[0].id)
  const b = s.buyers.find((x) => x.id === buyerId)!
  const [po, setPo] = useState(`PO-${Math.floor(10000 + Math.random() * 89999)}`)
  const [pid, setPid] = useState(s.products[0].id)
  const p = s.products.find((x) => x.id === pid)!
  const [sku, setSku] = useState(p.variants[0]?.sku || '')
  const [qty, setQty] = useState('1000')
  const [country, setCountry] = useState('')
  const [shipDate, setShipDate] = useState('2026-11-25')
  const [term, setTerm] = useState('')
  const v = p.variants.find((x) => x.sku === sku) || p.variants[0]
  const price = fobOf(p)
  const q = parseInt(qty) || 0
  return (
    <Modal wide title="Create Buyer Order" onClose={a.closeModal} footer={<><span className="mr-auto self-center text-sm text-slate-500">Order value: <b className="text-slate-900">{usd(q * price)}</b></span><button className="btn-secondary" onClick={a.closeModal}>Cancel</button>
      <button className="btn-primary" disabled={!v || q <= 0 || !po} onClick={() => { const id = a.addOrder({ buyerPO: po, buyer: buyerId, date: TODAY, shipDate, country: country || b.country, merchandiser: b.merchandiser, term: term || b.term, lines: [{ productId: p.id, sku: v.sku, variant: v.name, qty: q, price }] }); a.closeModal(); nav(`/merchandising/orders?open=${id}`) }}>Create Order</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Buyer" required><Select value={buyerId} onChange={setBuyer} options={s.buyers.map((x) => ({ value: x.id, label: `${x.name} · ${x.country}` }))} /></FormField>
        <FormField label="Buyer PO Number" required><input className="input" value={po} onChange={(e) => setPo(e.target.value)} /></FormField>
        <FormField label="Style"><Select value={pid} onChange={(v2) => { setPid(v2); setSku(s.products.find((x) => x.id === v2)!.variants[0]?.sku || '') }} options={s.products.filter((x) => x.status === 'Active').map((x) => ({ value: x.id, label: x.name }))} /></FormField>
        <FormField label="Color / Size"><Select value={sku} onChange={setSku} options={p.variants.map((x) => ({ value: x.sku, label: `${x.name} · ${x.sku}` }))} /></FormField>
        <FormField label="Quantity (pcs)" hint={`${fmt(p.stock)} pcs finished stock on hand`}><input type="number" className="input" value={qty} onChange={(e) => setQty(e.target.value)} /></FormField>
        <FormField label="FOB Price (USD / pc)"><input className="input bg-slate-50" readOnly value={usd(price, 2)} /></FormField>
        <FormField label="Destination Country"><Select value={country || b.country} onChange={setCountry} options={s.countries.map((c) => ({ value: c.code, label: c.name }))} /></FormField>
        <FormField label="Ex-factory (Ship) Date"><DatePicker value={shipDate} onChange={setShipDate} /></FormField>
        <FormField label="Payment Terms"><Select value={term || b.term} onChange={setTerm} options={['LC at sight', 'LC 90 days', 'TT 30 days', 'TT 60 days']} /></FormField>
        <FormField label="Merchandiser"><input className="input bg-slate-50" readOnly value={empName(s, b.merchandiser)} /></FormField>
      </div>
    </Modal>
  )
}

function BuyerModal() {
  const { s, a } = useStore()
  const merch = s.employees.filter((e) => e.dept === 'Merchandising')
  const { f, set } = useF({ name: '', type: 'Brand', country: 'US', contact: '', email: '', merchandiser: merch[0]?.id || '', term: 'LC at sight' })
  return (
    <Modal title="Add Buyer" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" disabled={!f.name} onClick={() => { a.addBuyer(f); a.closeModal() }}>Save Buyer</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Buyer Name" required className="sm:col-span-2"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></FormField>
        <FormField label="Country" required><Select value={f.country} onChange={(v) => set('country', v)} options={s.countries.map((c) => ({ value: c.code, label: c.name }))} /></FormField>
        <FormField label="Buyer Type"><Select value={f.type} onChange={(v) => set('type', v)} options={['Brand', 'Retail Chain', 'Wholesaler', 'Buying House']} /></FormField>
        <FormField label="Contact Person"><input className="input" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></FormField>
        <FormField label="Email"><input className="input" value={f.email} onChange={(e) => set('email', e.target.value)} /></FormField>
        <FormField label="Assigned Merchandiser"><Select value={f.merchandiser} onChange={(v) => set('merchandiser', v)} options={merch.map((e) => ({ value: e.id, label: `${e.name} · ${e.designation}` }))} /></FormField>
        <FormField label="Payment Terms"><Select value={f.term} onChange={(v) => set('term', v)} options={['LC at sight', 'LC 90 days', 'TT 30 days', 'TT 60 days']} /></FormField>
      </div>
    </Modal>
  )
}

function CountryModal() {
  const { s, a } = useStore()
  const { f, set } = useF({ code: '', name: '', region: 'Europe', currency: 'EUR', port: '' })
  const dup = s.countries.some((c) => c.code === f.code.toUpperCase())
  return (
    <Modal title="Add Country" onClose={a.closeModal} footer={<><button className="btn-secondary" onClick={a.closeModal}>Cancel</button><button className="btn-primary" disabled={!f.name || f.code.length < 2 || dup} onClick={() => { a.addCountry({ ...f, code: f.code.toUpperCase() }); a.closeModal() }}>Add Country</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Country Name" required className="sm:col-span-2"><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Denmark" /></FormField>
        <FormField label="Country Code" required hint={dup ? 'This code already exists' : '2-letter ISO code'}><input className="input uppercase" maxLength={2} value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="DK" /></FormField>
        <FormField label="Region"><Select value={f.region} onChange={(v) => set('region', v)} options={['Europe', 'North America', 'Asia Pacific', 'Middle East', 'Africa', 'South America']} /></FormField>
        <FormField label="Currency"><input className="input uppercase" maxLength={3} value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} /></FormField>
        <FormField label="Main Discharge Port"><input className="input" value={f.port} onChange={(e) => set('port', e.target.value)} placeholder="e.g. Aarhus" /></FormField>
      </div>
    </Modal>
  )
}

export function ModalHost() {
  const { modal } = useUI()
  if (!modal) return null
  const p = modal.props || {}
  switch (modal.type) {
    case 'receive': return <ReceiveModal {...p} />
    case 'adjust': return <AdjustModal {...p} />
    case 'requirement': return <RequirementModal {...p} />
    case 'po': return <POModal {...p} />
    case 'employee': return <EmployeeModal />
    case 'warehouse': return <WarehouseModal />
    case 'supplier': return <SupplierModal />
    case 'leave': return <LeaveModal />
    case 'order': return <OrderModal {...p} />
    case 'buyer': return <BuyerModal />
    case 'country': return <CountryModal />
  }
  return null
}
export { poTotal }
