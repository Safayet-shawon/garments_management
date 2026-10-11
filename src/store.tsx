import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as D from './data'
import type { Attendance, BomLine, Buyer, Country, Employee, Leave, Material, Movement, MovementType, Order, PO, Plan, Product, Requirement, Supplier, Warehouse } from './data'
import { STAGES } from './data'
import { buildSeed, type Activity, type DataState } from './seedState'
import { api } from './api'
import { useAuth } from './auth'
import { Syncer, fromWire, toWire } from './sync'
import { LoadingState } from './ui'

export type Toast = { id: number; msg: string; kind: 'success' | 'error' | 'info' }
export type { Activity }
export type State = DataState & { readNotifs: string[]; inventoryError: boolean }
export type SyncMode = 'offline' | 'loading' | 'live'
export interface SyncInfo { mode: SyncMode; pending: boolean; error: string | null }

const init = (): State => ({ ...buildSeed(), readNotifs: [], inventoryError: false })
/** keeps the offline demo data alive while the user hops between the website and the app */
let offlineMemo: State | null = null

// ---------- derived helpers ----------
export const matStatus = (m: Material): 'Critical' | 'Low' | 'Healthy' => (m.onHand <= m.critical ? 'Critical' : m.onHand <= m.reorder ? 'Low' : 'Healthy')
export const fgStatus = (p: Product, reserved: number): 'Critical' | 'Low' | 'Healthy' => { const a = p.stock - reserved; return a <= p.reorder * 0.4 ? 'Critical' : a <= p.reorder ? 'Low' : 'Healthy' }
export const reservedFor = (orders: Order[], productId: string) =>
  orders.filter((o) => !o.cancelled && o.step >= 4 && o.step <= 5).reduce((s, o) => s + o.lines.filter((l) => l.productId === productId).reduce((a, l) => a + l.qty, 0), 0)
export const orderTotal = (o: Order) => o.lines.reduce((s, l) => s + l.qty * l.price, 0)
export const poTotal = (p: PO) => p.items.reduce((s, i) => s + i.qty * i.price, 0)
export const orderStatus = (o: Order) => (o.cancelled ? 'Cancelled' : o.step <= 1 ? 'Sampling' : o.step <= 3 ? 'In Production' : o.step <= 5 ? 'Ready to Ship' : o.step === 6 ? 'Shipped' : 'Completed')
export const planProgress = (p: Plan) => Math.min(100, Math.round((p.sewn / p.target) * 100))
export const planRequirements = (state: State, productId: string, target: number) =>
  (state.bom[productId] || []).map((l) => {
    const mat = state.materials.find((x) => x.id === l.materialId)!
    const required = Math.round(l.qty * target * 100) / 100
    const available = mat.onHand // availability for a production check is measured against on-hand stock
    const shortage = Math.max(0, Math.round((required - available) * 100) / 100)
    return { line: l, mat, required, available, shortage, status: shortage > 0 ? 'Short' : 'Ready' }
  })
export const planReady = (state: State, p: Plan) => !!p.matIssued || planRequirements(state, p.productId, p.target).every((r) => r.shortage === 0)
export const planDisplayStatus = (state: State, p: Plan): string => (p.status === 'Planned' && planReady(state, p) ? 'Ready' : p.status)
export const productOf = (s: State, id: string) => s.products.find((p) => p.id === id)
export const empName = (s: State, id: string) => s.employees.find((e) => e.id === id)?.name || id
export const supplierName = (s: State, id: string) => s.suppliers.find((x) => x.id === id)?.name || '—'
const nextNum = (ids: string[], prefix: string, pad = 3) => {
  const max = ids.filter((i) => i.startsWith(prefix)).map((i) => parseInt(i.slice(prefix.length).replace(/\D/g, ''), 10) || 0).reduce((a, b) => Math.max(a, b), 0)
  return prefix + String(max + 1).padStart(pad, '0')
}

type ModalState = { type: string; props?: any } | null

function useStoreImpl() {
  const auth = useAuth()
  const live = auth.status === 'authed'
  const [s, setS] = useState<State>(() => (offlineMemo ?? init()))
  const sRef = useRef(s)
  sRef.current = s
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalState>(null)
  const [mode, setMode] = useState<SyncMode>(live ? 'loading' : 'offline')
  const [pending, setPending] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const syncer = useRef(new Syncer()).current
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const upd = useCallback((fn: (d: State) => void) => setS((prev) => { const n = structuredClone(prev); fn(n); return n }), [])
  const toast = useCallback((msg: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  const log = (d: State, text: string, icon = 'stock', by = 'Safayet Shawon') => { d.activities.unshift({ id: `ac${Date.now()}${Math.random()}`, icon, text, by, time: 'Just now' }); if (d.activities.length > 60) d.activities.length = 60 }
  const move = (d: State, mv: Omit<Movement, 'id' | 'date' | 'user'>) => { d.movements.unshift({ ...mv, id: `mv${Date.now()}${Math.random()}`, date: D.TODAY, user: 'Safayet Shawon' }); if (d.movements.length > 300) d.movements.length = 300 }

  // ---- load from the database once signed in
  const applyBootstrap = useCallback((b: Awaited<ReturnType<typeof api.bootstrap>>) => {
    const merged = { ...fromWire(b, sRef.current), readNotifs: sRef.current.readNotifs, inventoryError: false } as State
    syncer.reset(toWire(merged))
    setS(merged)
  }, [syncer])
  useEffect(() => {
    if (!live) { setMode('offline'); return }
    let cancelled = false
    setMode('loading')
    api.bootstrap().then((b) => { if (cancelled) return; applyBootstrap(b); setMode('live') })
      .catch(() => { if (cancelled) return; setMode('offline'); toast('Could not reach the database. Showing local demo data.', 'error') })
    return () => { cancelled = true }
  }, [live, applyBootstrap, toast])

  // ---- write-behind persistence: debounce, send only what changed, one request at a time
  useEffect(() => {
    if (mode !== 'live') { if (mode === 'offline') offlineMemo = s; return }
    const d = syncer.diff(toWire(s))
    if (!d) { setPending(false); return }
    setPending(true)
    const t = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        try { await api.sync(d.payload); d.commit(); setPending(false); setSyncError(null) }
        catch (e) { setSyncError(e instanceof Error ? e.message : 'Sync failed'); setTimeout(() => setRetry((x) => x + 1), 4000) }
      })
    }, 700)
    return () => clearTimeout(t)
  }, [s, mode, syncer, retry])
  // flush whatever is still pending when the user leaves the app
  useEffect(() => () => {
    if (modeRef.current !== 'live') return
    const d = syncer.diff(toWire(sRef.current))
    if (d) void api.sync(d.payload, true).catch(() => undefined)
  }, [syncer])

  const a = useMemo(() => ({
    toast,
    openModal: (type: string, props?: any) => setModal({ type, props }),
    closeModal: () => setModal(null),
    resetDemo: async () => {
      if (modeRef.current === 'live') {
        try { await api.reset(); applyBootstrap(await api.bootstrap()); toast('Database reset to the demo data set', 'info') } catch { toast('Reset failed. Check the connection.', 'error') }
      } else { offlineMemo = null; setS(init()); toast('Demo data has been reset', 'info') }
    },
    setInventoryError: (v: boolean) => upd((d) => { d.inventoryError = v }),
    markNotifRead: (id: string) => upd((d) => { if (!d.readNotifs.includes(id)) d.readNotifs.push(id) }),

    // ---- catalog
    addProduct: (p: Product) => { upd((d) => { d.products.unshift(p); log(d, `New product created: ${p.name} (${p.variants.length} variants)`, 'prod') }); toast(`Product "${p.name}" saved to catalog`) },
    patchProduct: (id: string, patch: Partial<Product>, msg?: string) => { upd((d) => { const p = d.products.find((x) => x.id === id); if (p) Object.assign(p, patch, { updated: D.TODAY }) }); if (msg) toast(msg) },
    deleteProduct: (id: string) => { upd((d) => { d.products = d.products.filter((p) => p.id !== id) }); toast('Product deleted') },
    duplicateProduct: (id: string) => { upd((d) => { const p = d.products.find((x) => x.id === id); if (!p) return; const c = structuredClone(p); c.id = `p${Date.now()}`; c.name = `${p.name} (Copy)`; c.status = 'Draft'; c.stock = 0; c.sku = `${p.sku}-C`; c.variants.forEach((v) => { v.id = `${c.id}-${v.sku}`; v.sku = `${v.sku}-C` }); d.products.unshift(c) }); toast('Product duplicated as draft') },
    setBom: (pid: string, lines: BomLine[]) => { upd((d) => { d.bom[pid] = lines }); toast('Bill of materials saved') },

    // ---- inventory
    receiveMaterial: (x: { materialId: string; qty: number; poId?: string; warehouse: string; batch: string; quality: string; supplierId: string }) => {
      upd((d) => {
        const m = d.materials.find((y) => y.id === x.materialId)!
        const accepted = x.quality !== 'Rejected'
        if (accepted) { m.onHand = Math.round((m.onHand + x.qty) * 100) / 100 }
        move(d, { sku: m.sku, item: m.name, warehouse: x.warehouse, type: 'RECEIPT', qty: accepted ? x.qty : 0, unit: m.unit, ref: `${x.poId || 'Direct'} · ${x.batch || 'No lot'}` })
        if (x.poId) {
          const po = d.pos.find((p) => p.id === x.poId)
          if (po) {
            const it = po.items.find((i) => i.materialId === x.materialId)
            if (it && accepted) it.received += x.qty
            if (accepted) {
              po.status = po.items.every((i) => i.received >= i.qty) ? 'Received' : 'Partially Received'
            }
          }
        }
        log(d, `Material received: ${x.qty.toLocaleString()} ${m.unit} ${m.name}${x.poId ? ` against ${x.poId}` : ''}`, 'po')
      })
      toast(x.quality === 'Rejected' ? 'Receipt logged – material rejected and not added to stock' : 'Material received successfully.')
    },
    adjustInventory: (x: { materialId: string; delta: number; reason: string }) => {
      upd((d) => {
        const m = d.materials.find((y) => y.id === x.materialId)!
        m.onHand = Math.max(0, Math.round((m.onHand + x.delta) * 100) / 100)
        move(d, { sku: m.sku, item: m.name, warehouse: m.warehouse, type: 'ADJUSTMENT', qty: x.delta, unit: m.unit, ref: `ADJ-${String(Math.floor(Math.random() * 900) + 100)} (${x.reason})` })
        log(d, `Stock adjustment: ${m.name} ${x.delta > 0 ? '+' : ''}${x.delta} ${m.unit} (${x.reason})`)
      })
      toast('Inventory adjusted')
    },
    addWarehouse: (w: Omit<Warehouse, 'id'>) => { upd((d) => { d.warehouses.push({ ...w, id: `w${Date.now()}` }) }); toast(`Warehouse "${w.name}" created`) },

    // ---- procurement
    addRequirement: (r: Omit<Requirement, 'id' | 'status' | 'created'>) => {
      upd((d) => { const id = nextNum(d.reqs.map((q) => q.id), 'PR-2026-', 3); d.reqs.unshift({ ...r, id, status: 'Pending Purchase', created: D.TODAY }); log(d, `Purchase requirement ${id} created`, 'po') })
      toast('Purchase requirement saved as Pending Purchase')
    },
    createPO: (x: { supplierId: string; items: PO['items']; expected: string; warehouse: string; notes: string; reqId?: string }): string => {
      let id = ''
      upd((d) => {
        id = nextNum(d.pos.map((q) => q.id), 'PO-2026-', 3)
        d.pos.unshift({ id, ...x, status: 'Draft', created: D.TODAY })
        if (x.reqId) { const r = d.reqs.find((q) => q.id === x.reqId); if (r) { r.status = 'PO Created'; r.poId = id } }
        log(d, `Purchase order ${id} created (draft)`, 'po')
      })
      toast('Purchase order created as Draft')
      return id
    },
    setPOStatus: (id: string, status: PO['status']) => { upd((d) => { const p = d.pos.find((q) => q.id === id); if (p) { p.status = status; log(d, `Purchase order ${id} → ${status}`, 'po') } }); toast(`Purchase order ${status.toLowerCase()}`) },
    addSupplier: (sp: Omit<Supplier, 'id'>) => { upd((d) => { d.suppliers.unshift({ ...sp, id: `s${Date.now()}` }); log(d, `New supplier added: ${sp.name}`, 'sup') }); toast('Supplier added') },

    // ---- manufacturing
    addPlan: (p: Omit<Plan, 'id'>): string => {
      let id = ''
      upd((d) => { id = nextNum(d.plans.map((q) => q.id), 'PP-2026-', 3); d.plans.unshift({ ...p, id }); log(d, `Production plan ${id} created`, 'prod') })
      toast('Production plan created')
      return id
    },
    startProduction: (id: string) => { upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.status = 'In Progress'; p.stage = 'Cutting'; p.matIssued = true; log(d, `Production started: ${id}`, 'prod') }); toast('Production started – cutting stage is now open') },
    cancelPlan: (id: string) => { upd((d) => { d.plans.find((q) => q.id === id)!.status = 'Cancelled' }); toast('Production plan cancelled', 'info') },
    assignTeam: (id: string, team: string, supervisor: string) => { upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.team = team; p.supervisor = supervisor }); toast(`${team} assigned`) },
    startCutting: (id: string) => { upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.cuttingStarted = true; p.issued = Math.max(p.issued, Math.round(p.target * 0.1)) }); toast('Cutting started') },
    recordCutting: (id: string, qty: number, waste: number) => {
      upd((d) => {
        const p = d.plans.find((q) => q.id === id)!
        p.cut = Math.min(p.target, p.cut + qty); p.wasteKg += waste; p.issued = Math.max(p.issued, p.cut); p.cuttingStarted = true
        if (STAGES.indexOf(p.stage) < 2) p.stage = 'Cutting'
        log(d, `Cutting output recorded: ${qty.toLocaleString()} pcs for ${id}`, 'prod')
      })
      toast('Cutting output recorded')
    },
    startSewing: (id: string) => { upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.sewingStarted = true; if (STAGES.indexOf(p.stage) < 3) p.stage = 'Sewing' }); toast('Sewing started') },
    recordSewing: (id: string, qty: number, rej: number) => {
      upd((d) => {
        const p = d.plans.find((q) => q.id === id)!
        const add = Math.min(p.cut, p.sewn + qty) - p.sewn; d.outputToday += add; p.sewn += add; p.sewReject += rej; p.sewingStarted = true
        if (STAGES.indexOf(p.stage) < 3) p.stage = 'Sewing'
        log(d, `Sewing output recorded: ${qty.toLocaleString()} pcs for ${id}`, 'prod')
      })
      toast('Sewing output recorded')
    },
    recordFinishing: (id: string, qty: number) => {
      upd((d) => {
        const p = d.plans.find((q) => q.id === id)!
        p.finished = Math.min(p.sewn, p.finished + qty)
        if (STAGES.indexOf(p.stage) < 4) p.stage = 'Finishing'
        if (p.finished >= p.target) { p.stage = 'Quality Control'; p.qcStatus = 'Pending' }
        log(d, `Finishing output recorded: ${qty.toLocaleString()} pcs for ${id}`, 'prod')
      })
      toast('Finishing output recorded')
    },
    sendToQC: (id: string) => { upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.stage = 'Quality Control'; p.qcStatus = 'Pending' }); toast('Batch sent to Quality Control') },
    fastForward: (id: string) => {
      upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.status = 'In Progress'; p.cut = p.sewn = p.finished = p.issued = p.target; p.stage = 'Quality Control'; p.qcStatus = 'Pending'; p.cuttingStarted = p.sewingStarted = true })
      toast('Demo shortcut: all stages completed – batch is waiting in QC', 'info')
    },
    completeQC: (id: string, inspected: number, rejected: number, reasons: Record<string, number>, inspector: string) => {
      upd((d) => { const p = d.plans.find((q) => q.id === id)!; p.qcInspected = inspected; p.qcRejected = rejected; p.qcPassed = inspected - rejected; p.qcReasons = reasons; p.qcInspector = inspector; p.qcStatus = 'Passed'; log(d, `${(inspected - rejected).toLocaleString()} finished units passed QC (${id})`, 'fg') })
      toast('Quality inspection completed')
    },
    moveToFG: (id: string) => {
      upd((d) => {
        const p = d.plans.find((q) => q.id === id)!
        const prod = d.products.find((x) => x.id === p.productId)!
        prod.stock += p.qcPassed; prod.updated = D.TODAY
        p.qcStatus = 'Moved to Finished Goods'; p.status = 'Completed'; p.stage = 'Completed'
        move(d, { sku: prod.variants[0]?.sku || prod.sku, item: prod.name, warehouse: 'FG-WH', type: 'PRODUCTION_OUTPUT', qty: p.qcPassed, unit: 'pcs', ref: id })
        log(d, `${p.qcPassed.toLocaleString()} ${prod.name} units added to Finished Goods`, 'fg')
      })
      toast('Finished goods inventory updated')
    },

    // ---- HR
    addEmployee: (e: { name: string; dept: string; designation: string; role: string; basic: number; type: string; joined: string }) => {
      let id = ''
      upd((d) => {
        id = nextNum(d.employees.map((q) => q.id), 'EMP-', 3)
        d.employees.unshift({ id, ...e, status: 'Active', phone: '+880 17XX-XXXXXX', email: `${e.name.toLowerCase().replace(/ /g, '.')}@winnerapparels.com`, leave: { casual: 10, sick: 14, annual: 20 }, perf: { output: 0, rejectRate: 0, efficiency: 0 } })
        d.attendance.push({ id: `a-new-${id}`, date: D.TODAY, empId: id, in: '08:12', out: '—', status: 'Present', hours: 0 })
        log(d, `New employee onboarded: ${e.name} (${e.designation})`, 'hr')
      })
      toast(`Employee ${e.name} added`)
      return id
    },
    addLeave: (l: Omit<Leave, 'id' | 'status'>) => { upd((d) => { d.leaves.unshift({ ...l, id: nextNum(d.leaves.map((q) => q.id), 'LV-', 4), status: 'Pending' }) }); toast('Leave request submitted') },
    decideLeave: (id: string, status: 'Approved' | 'Rejected') => {
      upd((d) => {
        const l = d.leaves.find((q) => q.id === id)!
        l.status = status
        if (status === 'Approved') { const e = d.employees.find((x) => x.id === l.empId)!; const k = l.type.toLowerCase() as 'casual' | 'sick' | 'annual'; e.leave[k] = Math.max(0, e.leave[k] - l.days); log(d, `Employee leave approved – ${e.name} (${l.type}, ${l.days} day${l.days > 1 ? 's' : ''})`, 'hr') }
      })
      toast(status === 'Approved' ? 'Leave approved – balance updated' : 'Leave rejected', status === 'Approved' ? 'success' : 'info')
    },
    advancePayroll: () => {
      upd((d) => { if (d.payrollStage < 5) d.payrollStage++; if (d.payrollStage === 5) log(d, 'October 2026 payroll marked as paid', 'hr') })
    },

    // ---- merchandising
    addOrder: (o: Omit<Order, 'id' | 'step' | 'cancelled'>) => {
      let id = ''
      upd((d) => { id = nextNum(d.orders.map((q) => q.id), 'WA-2026-', 4); d.orders.unshift({ ...o, id, step: 0, cancelled: false }); log(d, `New buyer order ${id} received (${o.buyerPO})`, 'po') })
      toast('Buyer order created')
      return id
    },
    advanceOrder: (id: string) => {
      const cur = sRef.current
      const o0 = cur.orders.find((q) => q.id === id)!
      if (o0.step + 1 === 4) {
        for (const pid of new Set(o0.lines.map((l) => l.productId))) {
          const p = cur.products.find((x) => x.id === pid)!
          const need = o0.lines.filter((x) => x.productId === pid).reduce((t, x) => t + x.qty, 0)
          const avail = p.stock - reservedFor(cur.orders.filter((q) => q.id !== id), pid)
          if (avail < need) { toast(`Not enough finished ${p.name}: ${avail.toLocaleString()} available, ${need.toLocaleString()} needed. Complete production first.`, 'error'); return }
        }
      }
      upd((d) => {
        const o = d.orders.find((q) => q.id === id)!
        const next = o.step + 1
        if (next === 6) {
          for (const l of o.lines) { const p = d.products.find((x) => x.id === l.productId)!; p.stock = Math.max(0, p.stock - l.qty) }
          d.salesAdj += o.lines.reduce((t, l) => t + l.qty * l.price, 0)
        }
        o.step = Math.min(7, next)
        log(d, `Order ${id} → ${D.ORDER_FLOW[o.step]}`, 'po')
      })
      toast('Order status updated')
    },
    cancelOrder: (id: string) => { upd((d) => { d.orders.find((q) => q.id === id)!.cancelled = true }); toast('Order cancelled', 'info') },
    addBuyer: (b: Omit<Buyer, 'id' | 'status'>) => { upd((d) => { d.buyers.unshift({ ...b, id: nextNum(d.buyers.map((q) => q.id), 'B-', 3), status: 'Active' }); log(d, `New buyer added: ${b.name}`, 'sup') }); toast(`Buyer ${b.name} added`) },
    addCountry: (c: Country) => { upd((d) => { d.countries.push(c); log(d, `New destination country added: ${c.name}`, 'sup') }); toast(`${c.name} added to countries`) },
  }), [upd, toast, applyBootstrap])

  const ui = useMemo(() => ({ toasts, modal, dismissToast: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)), sync: { mode, pending, error: syncError } as SyncInfo }), [toasts, modal, mode, pending, syncError])
  return { s, a, ui }
}

type Impl = ReturnType<typeof useStoreImpl>
const DataCtx = createContext<State>(null as unknown as State)
const ActCtx = createContext<Impl['a']>(null as unknown as Impl['a'])
const UICtx = createContext<Impl['ui']>(null as unknown as Impl['ui'])

/** Three separate contexts keep re-renders narrow: toasts and modals do not re-render data-heavy pages. */
export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { s, a, ui } = useStoreImpl()
  return (
    <ActCtx.Provider value={a}><UICtx.Provider value={ui}><DataCtx.Provider value={s}>
      {ui.sync.mode === 'loading' ? <div className="p-6"><LoadingState /></div> : children}
    </DataCtx.Provider></UICtx.Provider></ActCtx.Provider>
  )
}
export const useStore = () => ({ s: useContext(DataCtx), a: useContext(ActCtx) })
export const useActions = () => useContext(ActCtx)
export const useUI = () => useContext(UICtx)
export type { MovementType }
