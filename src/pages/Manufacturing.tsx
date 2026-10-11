import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, ChevronRight, ClipboardCheck, Factory, FastForward, Layers, Play, Scissors, Shirt, Sparkles, Timer, Truck } from 'lucide-react'
import { useStore, planDisplayStatus, planProgress, planReady, planRequirements, productOf, type State } from '../store'
import { STAGES, TODAY, type Plan } from '../data'
import { Card, DataTable, Drawer, EmptyState, FormField, Modal, Money, PageHeader, ProgressBar, Select, DatePicker, StatCard, StatusBadge, Stepper, cx, fmt, fmtDate, useConfirm, Qty } from '../ui'

const pname = (s: State, p: Plan) => productOf(s, p.productId)?.name || p.productId
const REASONS = ['Stitching defect', 'Fabric defect', 'Wrong size', 'Color mismatch', 'Print defect', 'Packaging defect', 'Other']
const TEAMS = ['Line A', 'Line B', 'Line C', 'Line D', 'Line E']
const SUPERVISORS = ['Rahim Ahmed', 'Karim Hasan', 'Tanvir Hossain', 'Mehedi Hasan', 'Sadia Rahman']
const matsLabel = (s: State, p: Plan) => (p.matIssued ? 'Issued' : planReady(s, p) ? 'Ready' : 'Short')

function MaterialTable({ s, productId, target, reason, compact }: { s: ReturnType<typeof useStore>['s']; productId: string; target: number; reason: string; compact?: boolean }) {
  const { a } = useStore()
  const rows = planRequirements(s, productId, target)
  if (!rows.length) return <EmptyState title="No bill of materials configured" text="Add a BOM to this product so material requirements can be calculated." action={<Link to={`/products/${productId}`} className="btn-primary">Configure BOM</Link>} />
  return (
    <div className="overflow-x-auto"><table className="w-full">
      <thead><tr><th className="th">Material</th><th className="th text-right">Per unit</th><th className="th text-right">Required</th><th className="th text-right">Available</th><th className="th text-right">Shortage</th><th className="th">Status</th>{!compact && <th className="th" />}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((r) => {
        const pend = s.reqs.find((q) => q.materialId === r.mat.id && q.status === 'Pending Purchase' && q.reason === reason)
        return (
          <tr key={r.mat.id} className={r.shortage ? 'bg-amber-50/40' : ''}>
            <td className="td font-medium text-slate-900">{r.mat.name}</td>
            <td className="td text-right text-slate-500 tabular-nums">{r.line.qty} {r.line.unit}</td>
            <td className="td text-right tabular-nums">{fmt(target)} × {r.line.qty} = <b>{fmt(r.required)} {r.line.unit}</b></td>
            <td className="td text-right tabular-nums">{fmt(r.available)} {r.mat.unit}</td>
            <td className={cx('td text-right tabular-nums font-semibold', r.shortage ? 'text-red-600' : 'text-slate-400')}>{r.shortage ? `${fmt(r.shortage)} ${r.mat.unit}` : '0'}</td>
            <td className="td"><StatusBadge status={r.status} /></td>
            {!compact && <td className="td text-right">{r.shortage > 0 && (pend ? <span className="text-xs text-slate-500">{pend.id} pending · <Link className="text-brand-600 hover:underline" to="/procurement/requirements">view</Link></span> : <button className="btn-primary btn-sm" onClick={() => a.openModal('requirement', { materialId: r.mat.id, qty: r.shortage, reason })}>Create Purchase Requirement</button>)}</td>}
          </tr>)
      })}</tbody></table></div>
  )
}

function Pipeline({ s, plans, onStage }: { s: State; plans?: Plan[]; onStage?: (st: string) => void }) {
  const icons = [<ClipboardCheck size={18} />, <Layers size={18} />, <Scissors size={18} />, <Shirt size={18} />, <Sparkles size={18} />, <Check size={18} />, <Truck size={18} />]
  const live = plans?.filter((p) => p.status !== 'Cancelled')
  const count = (st: string) => live ? live.filter((p) => (p.status === 'Completed' ? 'Completed' : p.stage) === st).length : 0
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      {STAGES.map((st, i) => {
        const n = count(st)
        return (
          <div key={st} className="flex flex-1 items-center gap-2 lg:flex-col lg:gap-0">
            <button onClick={() => onStage?.(st)} className={cx('relative flex w-full flex-1 items-center gap-3 rounded-lg border p-3 text-left transition lg:flex-col lg:items-start lg:gap-2', n ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white', onStage && 'hover:border-brand-500')}>
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', i === 6 ? 'bg-emerald-100 text-emerald-700' : n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>{icons[i]}</span>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{st}</div><div className="text-2xl font-semibold tabular-nums text-slate-900">{n}<span className="ml-1 text-xs font-normal text-slate-400">plans</span></div></div>
            </button>
            {i < STAGES.length - 1 && <ChevronRight size={18} className="hidden shrink-0 text-slate-300 lg:hidden" />}
          </div>
        )
      })}
    </div>
  )
}

export function ManufacturingDashboard() {
  const { s } = useStore()
  const nav = useNavigate()
  const active = s.plans.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled')
  const shortages = s.plans.filter((p) => (p.status === 'Planned' || p.status === 'Ready' || !p.matIssued) && p.status !== 'Completed' && p.status !== 'Cancelled' && !planReady(s, p)).length
  const inStage = (st: string) => s.plans.filter((p) => p.status === 'In Progress' && p.stage === st).length
  return (
    <>
      <PageHeader title="Manufacturing" subtitle="From planned order to finished goods – live production pipeline" actions={<><Link to="/manufacturing/plans" className="btn-secondary">All Plans</Link><Link to="/manufacturing/plans/new" className="btn-primary">Create Production Plan</Link></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Active Production" value={active.length} icon={<Factory size={18} />} to="/manufacturing/plans" />
        <StatCard label="Today's Output" value={`${fmt(s.outputToday)}`} sub="pcs sewn / finished" icon={<Timer size={18} />} accent="green" />
        <StatCard label="Material Shortages" value={shortages} sub="plans affected" icon={<AlertTriangle size={18} />} accent={shortages ? 'red' : 'green'} to="/manufacturing/requirements" />
        <StatCard label="Cutting" value={inStage('Cutting')} sub="batches" icon={<Scissors size={18} />} accent="blue" to="/manufacturing/cutting" />
        <StatCard label="Sewing" value={inStage('Sewing')} sub="batches" icon={<Shirt size={18} />} accent="blue" to="/manufacturing/sewing" />
        <StatCard label="Finishing" value={inStage('Finishing')} sub="batches" icon={<Sparkles size={18} />} accent="blue" to="/manufacturing/finishing" />
        <StatCard label="QC Pending" value={s.plans.filter((p) => p.qcStatus === 'Pending').length} sub="batches" icon={<ClipboardCheck size={18} />} accent="amber" to="/manufacturing/qc" />
      </div>
      <Card title="Production Pipeline" className="mt-4" action={<span className="text-xs text-slate-400">Click a stage to filter plans</span>}>
        <Pipeline s={s} plans={s.plans} onStage={() => nav('/manufacturing/plans')} />
        <div className="mt-3 text-xs text-slate-400">Raw Material → Cutting → Sewing → Finishing → Quality Control → Finished Goods → Inventory</div>
      </Card>
      <Card title="Plans in progress" className="mt-4" pad={false} action={<Link to="/manufacturing/plans" className="text-xs text-brand-600 hover:underline">View all</Link>}>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Plan</th><th className="th">Product</th><th className="th">Stage</th><th className="th w-56">Progress</th><th className="th">Materials</th><th className="th">Due</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{active.slice(0, 7).map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => nav(`/manufacturing/plans/${p.id}`)}>
              <td className="td font-medium text-brand-600">{p.id}</td><td className="td">{pname(s, p)}</td><td className="td">{p.stage}</td>
              <td className="td"><ProgressBar value={planProgress(p)} /></td><td className="td"><StatusBadge status={matsLabel(s, p)} /></td><td className="td">{fmtDate(p.end)}</td></tr>))}</tbody></table></div>
      </Card>
    </>
  )
}

export function Plans() {
  const { s, a } = useStore()
  const nav = useNavigate()
  const { ask, el } = useConfirm()
  return (
    <>
      <PageHeader title="Production Plans" subtitle="Plan, track and complete manufacturing runs" actions={<Link to="/manufacturing/plans/new" className="btn-primary">Create Production Plan</Link>} />
      <DataTable rows={s.plans} rowKey={(p) => p.id} pageSize={10} onRowClick={(p) => nav(`/manufacturing/plans/${p.id}`)} searchPlaceholder="Search plan or product…" defaultSort={{ key: 'id', dir: 1 }}
        filters={[{ label: 'Status', options: ['Planned', 'Ready', 'In Progress', 'Completed', 'Cancelled'], get: (p) => planDisplayStatus(s, p) }, { label: 'Stage', options: [...STAGES], get: (p) => p.stage }]}
        columns={[
          { key: 'id', header: 'Plan', sort: (p) => p.id, search: (p) => p.id, render: (p) => <b className="text-brand-600">{p.id}</b> },
          { key: 'product', header: 'Product', sort: (p) => pname(s, p), search: (p) => pname(s, p), render: (p) => pname(s, p) },
          { key: 'target', header: 'Target', align: 'right', sort: (p) => p.target, render: (p) => fmt(p.target) },
          { key: 'prod', header: 'Produced', align: 'right', sort: (p) => p.sewn, render: (p) => fmt(p.sewn) },
          { key: 'prog', header: 'Progress', className: 'w-36', sort: (p) => planProgress(p), render: (p) => <ProgressBar value={planProgress(p)} /> },
          { key: 'start', header: 'Start', sort: (p) => p.start, render: (p) => fmtDate(p.start) },
          { key: 'end', header: 'End', sort: (p) => p.end, render: (p) => fmtDate(p.end) },
          { key: 'stage', header: 'Stage', sort: (p) => STAGES.indexOf(p.stage), render: (p) => p.stage },
          { key: 'mat', header: 'Materials', render: (p) => (p.status === 'Completed' || p.status === 'Cancelled' ? '—' : <StatusBadge status={matsLabel(s, p)} />) },
          { key: 'status', header: 'Status', sort: (p) => p.status, render: (p) => <StatusBadge status={planDisplayStatus(s, p)} /> },
        ]}
        actions={(p) => [{ label: 'View', onClick: () => nav(`/manufacturing/plans/${p.id}`) }, ...(p.status === 'Planned' || p.status === 'Ready' ? [{ label: 'Start Production', onClick: () => (planReady(s, p) ? a.startProduction(p.id) : a.toast('Materials are short – create purchase requirements first', 'error')) }] : []), ...(p.status !== 'Completed' && p.status !== 'Cancelled' ? [{ label: 'Cancel Production', danger: true, onClick: () => ask({ title: 'Cancel Production?', message: `${p.id} will be marked as cancelled.`, confirmLabel: 'Cancel Production', danger: true, onConfirm: () => a.cancelPlan(p.id) }) }] : [])]}
        empty={<EmptyState title="No production plans found." action={<Link to="/manufacturing/plans/new" className="btn-primary">Create Production Plan</Link>} />} />
      {el}
    </>
  )
}

export function PlanNew() {
  const { s, a } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState({ productId: 'p1', variant: 'All variants', target: '5000', warehouse: 'MF-WH', start: '2026-10-12', end: '2026-10-28', supervisor: 'Rahim Ahmed', priority: 'Normal', notes: '' })
  const prod = productOf(s, f.productId)!
  const target = parseInt(f.target) || 0
  const nextId = `PP-2026-${String(s.plans.length + 1).padStart(3, '0')}`
  const rows = planRequirements(s, f.productId, target)
  const short = rows.filter((r) => r.shortage > 0)
  const save = () => {
    const id = a.addPlan({
      productId: f.productId, variant: f.variant, target, issued: 0, cut: 0, sewn: 0, finished: 0, wasteKg: 0, sewReject: 0, stage: 'Material Check', status: 'Planned', start: f.start, end: f.end,
      supervisor: f.supervisor, priority: f.priority as Plan['priority'], notes: f.notes, warehouse: f.warehouse, team: 'Unassigned', cuttingStarted: false, sewingStarted: false, qcStatus: 'Not Ready', qcInspected: 0, qcPassed: 0, qcRejected: 0, qcInspector: 'Nusrat Jahan', qcReasons: {}, matIssued: false,
    })
    nav(`/manufacturing/plans/${id}`)
  }
  return (
    <>
      <PageHeader title="Create Production Plan" subtitle="Choose a product and quantity – we'll check your materials instantly" back="/manufacturing/plans" />
      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Plan details" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Product" required className="sm:col-span-2"><Select value={f.productId} onChange={(v) => setF({ ...f, productId: v, variant: 'All variants' })} options={s.products.map((p) => ({ value: p.id, label: p.name }))} /></FormField>
            <FormField label="Variant"><Select value={f.variant} onChange={(v) => setF({ ...f, variant: v })} options={['All variants', ...prod.variants.map((v) => v.name)]} /></FormField>
            <FormField label="Target Quantity (pcs)" required><input type="number" className="input" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></FormField>
            <FormField label="Production Warehouse"><Select value={f.warehouse} onChange={(v) => setF({ ...f, warehouse: v })} options={s.warehouses.map((w) => ({ value: w.code, label: w.name }))} /></FormField>
            <FormField label="Supervisor"><Select value={f.supervisor} onChange={(v) => setF({ ...f, supervisor: v })} options={SUPERVISORS} /></FormField>
            <FormField label="Start Date"><DatePicker value={f.start} onChange={(v) => setF({ ...f, start: v })} /></FormField>
            <FormField label="Expected End Date"><DatePicker value={f.end} onChange={(v) => setF({ ...f, end: v })} /></FormField>
            <FormField label="Priority"><Select value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={['Low', 'Normal', 'High', 'Urgent']} /></FormField>
            <FormField label="Notes"><input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" /></FormField>
          </div>
          <div className="mt-5 flex gap-2"><button className="btn-primary" disabled={!target || !rows.length} onClick={save}>Create Plan {nextId}</button><Link className="btn-secondary" to="/manufacturing/plans">Cancel</Link></div>
        </Card>
        <Card title="Material Requirement Preview" className="xl:col-span-3" pad={false} action={rows.length ? short.length ? <StatusBadge status="Short" label={`${short.length} material${short.length > 1 ? 's' : ''} short`} /> : <StatusBadge status="Ready" label="All materials available" /> : undefined}>
          <div className="p-4 pb-2 text-xs text-slate-500">Bill of materials × target quantity, checked against current inventory</div>
          <MaterialTable s={s} productId={f.productId} target={target} reason={`New Production Plan (${nextId})`} />
          {short.length > 0 && <div className="m-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />You can still save this plan. Create purchase requirements for the shortages, then production becomes ready once materials are received.</div>}
        </Card>
      </div>
    </>
  )
}

export function PlanDetail() {
  const { id } = useParams()
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  const p = s.plans.find((x) => x.id === id)
  if (!p) return <EmptyState title="Production plan not found" action={<Link to="/manufacturing/plans" className="btn-primary">Back to plans</Link>} />
  const prod = productOf(s, p.productId)
  const ready = planReady(s, p)
  const canStart = (p.status === 'Planned' || p.status === 'Ready') && ready
  const reason = `Production Plan ${p.id}`
  const reqs = s.reqs.filter((r) => r.reason.includes(p.id))
  const pos = s.pos.filter((o) => reqs.some((r) => r.poId === o.id))
  const stageIdx = p.status === 'Completed' ? 6 : STAGES.indexOf(p.stage)
  const stat = (l: string, v: ReactNode, sub?: string) => <div className="card p-3"><div className="text-xs uppercase text-slate-500">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div>{sub && <div className="text-xs text-slate-400">{sub}</div>}</div>
  return (
    <>
      <PageHeader back="/manufacturing/plans" title={`${p.id} · ${prod?.name}`} subtitle={`${fmtDate(p.start)} → ${fmtDate(p.end)} · Supervisor ${p.supervisor} · ${p.priority} priority`}
        actions={<>
          <StatusBadge status={planDisplayStatus(s, p)} />
          {(p.status === 'In Progress' || p.status === 'Ready') && p.qcStatus === 'Not Ready' && <button className="btn-secondary" onClick={() => ask({ title: 'Complete all stages (demo shortcut)?', message: `This fast-forwards ${p.id} to 100% across cutting, sewing and finishing and sends the batch to Quality Control.`, confirmLabel: 'Fast-forward', onConfirm: () => a.fastForward(p.id) })}><FastForward size={14} />Demo: finish all stages</button>}
          {p.status !== 'Completed' && p.status !== 'Cancelled' && p.status !== 'In Progress' && <button className="btn-primary" disabled={!canStart} onClick={() => ask({ title: 'Start Production?', message: `${fmt(p.target)} pcs of ${prod?.name} will move to the Cutting stage.`, confirmLabel: 'Start Production', onConfirm: () => a.startProduction(p.id) })}><Play size={14} />Start Production</button>}
          {p.qcStatus === 'Pending' && <Link to="/manufacturing/qc" className="btn-primary">Open QC Inspection</Link>}
        </>} />

      {!p.matIssued && p.status !== 'Completed' && p.status !== 'Cancelled' && (ready
        ? <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={16} />Production Ready – all required materials are available in inventory.</div>
        : <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5" /><div><b>Material shortage.</b> {planRequirements(s, p.productId, p.target).filter((r) => r.shortage).map((r) => `${r.mat.name} (${fmt(r.shortage)} ${r.mat.unit})`).join(', ')}. Create purchase requirements below, order, and receive the material.</div></div>)}

      <Card className="mb-4"><Stepper steps={[...STAGES]} current={stageIdx} /></Card>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {stat('Target', fmt(p.target))}{stat('Cut', fmt(p.cut), `${Math.round((p.cut / p.target) * 100)}%`)}{stat('Sewn', fmt(p.sewn), `${Math.round((p.sewn / p.target) * 100)}%`)}{stat('Finished', fmt(p.finished), `${Math.round((p.finished / p.target) * 100)}%`)}
        {stat('QC Passed', p.qcPassed ? fmt(p.qcPassed) : '—', p.qcRejected ? `${p.qcRejected} rejected` : p.qcStatus)}{stat('Team', p.team, p.supervisor)}
      </div>

      <Card title="Material availability" className="mb-4" pad={false} action={<Link to={`/products/${p.productId}`} className="text-xs text-brand-600 hover:underline">Bill of Materials</Link>}>
        {p.matIssued ? <div className="p-4 text-sm text-emerald-700"><Check size={14} className="mr-1 inline" />Materials for this plan have been issued to the production floor.</div> : null}
        <MaterialTable s={s} productId={p.productId} target={p.target} reason={reason} compact={!!p.matIssued} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Procurement for this plan">
          {reqs.length ? <ul className="divide-y divide-slate-100">{reqs.map((r) => { const po = s.pos.find((o) => o.id === r.poId); return <li key={r.id} className="flex items-center justify-between py-2 text-sm"><span><b>{r.id}</b> · {s.materials.find((m) => m.id === r.materialId)?.name} · {fmt(r.qty)}</span><span className="flex items-center gap-2">{po && <Link to={`/procurement/orders?open=${po.id}`} className="text-xs text-brand-600 hover:underline">{po.id}</Link>}<StatusBadge status={po ? po.status : r.status} /></span></li> })}</ul> : <p className="text-sm text-slate-500">No purchase requirements raised for this plan yet.</p>}
          {pos.length > 0 && <Link to="/procurement/orders" className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600">Go to purchase orders <ArrowRight size={14} /></Link>}
        </Card>
        <Card title="Stage modules">
          <div className="grid grid-cols-2 gap-2">{[['Cutting', '/manufacturing/cutting', p.cut], ['Sewing', '/manufacturing/sewing', p.sewn], ['Finishing', '/manufacturing/finishing', p.finished], ['Quality Control', '/manufacturing/qc', p.qcPassed]].map(([l, to, v]) => <Link key={l as string} to={to as string} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm hover:border-brand-500"><span>{l}</span><b className="tabular-nums">{fmt(v as number)}</b></Link>)}</div>
          {p.notes && <p className="mt-3 text-sm text-slate-500">Notes: {p.notes}</p>}
        </Card>
      </div>
      {el}
    </>
  )
}

export function MaterialRequirements() {
  const { s, a } = useStore()
  const active = s.plans.filter((p) => ['Planned', 'Ready', 'In Progress'].includes(p.status) && !p.matIssued)
  const agg = new Map<string, { mat: ReturnType<typeof planRequirements>[number]['mat']; required: number; plans: string[] }>()
  active.forEach((p) => planRequirements(s, p.productId, p.target).forEach((r) => { const e = agg.get(r.mat.id) || { mat: r.mat, required: 0, plans: [] }; e.required += r.required; e.plans.push(p.id.replace('PP-2026-', '')); agg.set(r.mat.id, e) }))
  const rows = [...agg.values()].map((e) => ({ ...e, short: Math.max(0, Math.round((e.required - e.mat.onHand) * 100) / 100) }))
  return (
    <>
      <PageHeader title="Material Requirements" subtitle={`Combined demand from ${active.length} plans awaiting material`} />
      <DataTable rows={rows} rowKey={(r) => r.mat.id} filters={[{ label: 'Status', options: ['Short', 'Ready'], get: (r) => (r.short ? 'Short' : 'Ready') }]}
        columns={[
          { key: 'm', header: 'Material', sort: (r) => r.mat.name, search: (r) => r.mat.name, render: (r) => <b className="text-slate-900">{r.mat.name}</b> },
          { key: 'plans', header: 'Plans', render: (r) => r.plans.map((x) => `PP-${x}`).join(', ') },
          { key: 'req', header: 'Required', align: 'right', sort: (r) => r.required, render: (r) => <Qty v={r.required} unit={r.mat.unit} /> },
          { key: 'av', header: 'Available', align: 'right', sort: (r) => r.mat.onHand, render: (r) => <Qty v={r.mat.onHand} unit={r.mat.unit} /> },
          { key: 'sh', header: 'Shortage', align: 'right', sort: (r) => r.short, render: (r) => <span className={r.short ? 'font-semibold text-red-600' : 'text-slate-400'}>{r.short ? fmt(r.short) : 0}</span> },
          { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.short ? 'Short' : 'Ready'} /> },
          { key: 'a', header: '', render: (r) => r.short > 0 ? <button className="btn-primary btn-sm" onClick={() => a.openModal('requirement', { materialId: r.mat.id, qty: r.short, reason: `Production Plans ${r.plans.map((x) => 'PP-2026-' + x).join(', ')}` })}>Create Purchase Requirement</button> : null },
        ]} empty={<EmptyState title="No outstanding material demand" />} />
    </>
  )
}

// ---------- stage modules ----------
type OutKind = { title: string; fields: { key: string; label: string; max?: number; hint?: string }[]; submit: (v: Record<string, number>) => void }
function OutputModal({ k, onClose }: { k: OutKind; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>({})
  const n = (key: string) => parseFloat(v[key]) || 0
  const bad = k.fields.some((f) => f.max !== undefined && n(f.key) > f.max)
  return (
    <Modal title={k.title} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={bad || !k.fields.some((f) => n(f.key) > 0)} onClick={() => { k.submit(Object.fromEntries(k.fields.map((f) => [f.key, n(f.key)]))); onClose() }}>Save</button></>}>
      <div className="grid gap-3">{k.fields.map((f) => <FormField key={f.key} label={f.label} hint={f.hint ?? (f.max !== undefined ? `Up to ${fmt(f.max)}` : undefined)}><input type="number" className={cx('input', n(f.key) > (f.max ?? Infinity) && 'border-red-400')} value={v[f.key] || ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /></FormField>)}</div>
    </Modal>
  )
}

function StageShell({ title, subtitle, filter, children }: { title: string; subtitle: string; filter?: (p: Plan) => boolean; children: (p: Plan, openOut: (k: OutKind) => void) => ReactNode }) {
  const { s } = useStore()
  const [k, setK] = useState<OutKind | null>(null)
  const plans = s.plans.filter((p) => p.status === 'In Progress' && (filter ? filter(p) : true))
  const waiting = s.plans.filter((p) => (p.status === 'Planned' || p.status === 'Ready'))
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<Link to="/manufacturing/plans" className="btn-secondary">Production Plans</Link>} />
      {plans.length ? <div className="grid gap-4 xl:grid-cols-2">{plans.map((p) => children(p, setK))}</div> : <Card><EmptyState title="No active batches" text="Start production on a plan to open this stage." action={<Link to="/manufacturing/plans" className="btn-primary">Go to Production Plans</Link>} /></Card>}
      {waiting.length > 0 && <p className="mt-4 text-sm text-slate-500">{waiting.length} plan{waiting.length > 1 ? 's are' : ' is'} waiting to start: {waiting.map((w) => w.id).join(', ')}.</p>}
      {k && <OutputModal k={k} onClose={() => setK(null)} />}
    </>
  )
}
const Stat = ({ l, v, tone }: { l: string; v: ReactNode; tone?: string }) => <div><div className="text-[11px] uppercase text-slate-500">{l}</div><div className={cx('text-base font-semibold tabular-nums', tone)}>{v}</div></div>

export function Cutting() {
  const { s, a } = useStore()
  return (
    <StageShell title="Cutting" subtitle="Fabric issued, cut pieces and waste per production batch" filter={(p) => p.stage !== 'Planned'}>
      {(p, open) => {
        const st = p.cut >= p.target ? 'Completed' : p.cuttingStarted ? 'In Progress' : 'Pending'
        return (
          <Card key={p.id} title={<span>{p.id} · {pname(s, p)}</span>} action={<StatusBadge status={st} />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat l="Target" v={fmt(p.target)} /><Stat l="Issued" v={fmt(p.issued)} /><Stat l="Cut" v={fmt(p.cut)} /><Stat l="Waste" v={`${fmt(p.wasteKg)} kg`} tone="text-amber-600" /></div>
            <div className="my-4"><ProgressBar value={(p.cut / p.target) * 100} /></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" disabled={p.cuttingStarted} onClick={() => a.startCutting(p.id)}><Play size={14} />Start Cutting</button>
              <button className="btn-primary" disabled={p.cut >= p.target} onClick={() => open({ title: `Record cutting output – ${p.id}`, fields: [{ key: 'qty', label: 'Pieces cut', max: p.target - p.cut }, { key: 'waste', label: 'Waste (kg)', hint: 'Optional' }], submit: (v) => a.recordCutting(p.id, v.qty || 0, v.waste || 0) })}>Record Output</button>
              <button className="btn-secondary" onClick={() => open({ title: `Record fabric waste – ${p.id}`, fields: [{ key: 'waste', label: 'Waste (kg)' }], submit: (v) => a.recordCutting(p.id, 0, v.waste || 0) })}>Record Waste</button>
            </div>
          </Card>)
      }}
    </StageShell>
  )
}

export function Sewing() {
  const { s, a } = useStore()
  const [team, setTeam] = useState<Plan | null>(null)
  const [t, setT] = useState({ team: 'Line A', sup: 'Rahim Ahmed' })
  return (
    <>
      <StageShell title="Sewing" subtitle="Sewing lines, output and rejected pieces" filter={(p) => p.cut > 0}>
        {(p, open) => (
          <Card key={p.id} title={<span>{p.id} · {pname(s, p)}</span>} action={<StatusBadge status={p.sewn >= p.target ? 'Completed' : p.sewingStarted ? 'In Progress' : 'Pending'} />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat l="Target" v={fmt(p.target)} /><Stat l="Cut" v={fmt(p.cut)} /><Stat l="Sewn" v={fmt(p.sewn)} /><Stat l="Team" v={p.team} /><Stat l="Supervisor" v={p.supervisor} /></div>
            <div className="my-4"><ProgressBar value={(p.sewn / p.target) * 100} /><div className="mt-1 text-xs text-slate-400">{fmt(p.sewReject)} rejected pieces · {fmt(p.cut - p.sewn)} cut pieces waiting to be sewn</div></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => { setT({ team: p.team === 'Unassigned' ? 'Line A' : p.team, sup: p.supervisor }); setTeam(p) }}>Assign Team</button>
              <button className="btn-secondary" disabled={p.sewingStarted} onClick={() => a.startSewing(p.id)}><Play size={14} />Start Sewing</button>
              <button className="btn-primary" disabled={p.cut - p.sewn <= 0} onClick={() => open({ title: `Record sewing output – ${p.id}`, fields: [{ key: 'qty', label: 'Pieces sewn', max: p.cut - p.sewn }, { key: 'rej', label: 'Rejected pieces', hint: 'Optional' }], submit: (v) => a.recordSewing(p.id, v.qty || 0, v.rej || 0) })}>Record Output</button>
              <button className="btn-secondary" onClick={() => open({ title: `Record rejected pieces – ${p.id}`, fields: [{ key: 'rej', label: 'Rejected pieces' }], submit: (v) => a.recordSewing(p.id, 0, v.rej || 0) })}>Record Rejected</button>
            </div>
          </Card>)}
      </StageShell>
      {team && <Modal title={`Assign team – ${team.id}`} onClose={() => setTeam(null)} footer={<><button className="btn-secondary" onClick={() => setTeam(null)}>Cancel</button><button className="btn-primary" onClick={() => { a.assignTeam(team.id, t.team, t.sup); setTeam(null) }}>Assign</button></>}>
        <div className="grid gap-3 sm:grid-cols-2"><FormField label="Sewing line"><Select value={t.team} onChange={(v) => setT({ ...t, team: v })} options={TEAMS} /></FormField><FormField label="Supervisor"><Select value={t.sup} onChange={(v) => setT({ ...t, sup: v })} options={SUPERVISORS} /></FormField></div></Modal>}
    </>
  )
}

export function Finishing() {
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  return (
    <>
      <StageShell title="Finishing" subtitle="Trimming, ironing, labeling, folding, packaging and tagging" filter={(p) => p.sewn > 0}>
        {(p, open) => {
          const acts: [string, number][] = [['Thread trimming', Math.min(p.sewn, p.finished + 250)], ['Ironing', Math.min(p.sewn, p.finished + 150)], ['Labeling', Math.min(p.sewn, p.finished + 80)], ['Folding', p.finished], ['Packaging', p.finished], ['Tagging', p.finished]]
          return (
            <Card key={p.id} title={<span>{p.id} · {pname(s, p)}</span>} action={<StatusBadge status={p.finished >= p.target ? 'Completed' : 'In Progress'} />}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat l="Input qty" v={fmt(p.sewn)} /><Stat l="Finished" v={fmt(p.finished)} tone="text-emerald-600" /><Stat l="Rejected" v={fmt(p.sewReject)} tone="text-red-600" /><Stat l="Pending" v={fmt(p.sewn - p.finished)} tone="text-amber-600" /></div>
              <div className="my-4 space-y-2">{acts.map(([l, v]) => <div key={l} className="grid grid-cols-[110px_1fr_70px] items-center gap-2 text-xs text-slate-600"><span>{l}</span><ProgressBar showLabel={false} h="h-1.5" value={(v / p.target) * 100} /><span className="text-right tabular-nums">{fmt(v)}</span></div>)}</div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={p.sewn - p.finished <= 0} onClick={() => open({ title: `Record finishing output – ${p.id}`, fields: [{ key: 'qty', label: 'Pieces finished & packed', max: p.sewn - p.finished }], submit: (v) => a.recordFinishing(p.id, v.qty || 0) })}>Record Output</button>
                <button className="btn-secondary" disabled={p.finished <= 0 || p.qcStatus !== 'Not Ready'} onClick={() => ask({ title: 'Send to Quality Control?', message: `${fmt(p.finished)} finished pieces from ${p.id} will be queued for inspection.`, confirmLabel: 'Send to QC', onConfirm: () => a.sendToQC(p.id) })}>{p.qcStatus === 'Not Ready' ? 'Send to QC' : 'In QC queue'}</button>
              </div>
            </Card>)
        }}
      </StageShell>
      {el}
    </>
  )
}

// ---------- QC ----------
const defaultReasons = (inspected: number) => { const w = [32, 14, 8, 10, 6, 6, 4]; const tot = Math.round(inspected * 0.016); return Object.fromEntries(REASONS.map((r, i) => [r, Math.round((w[i] / 80) * tot)])) as Record<string, number> }

export function QualityControl() {
  const { s } = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = s.plans.filter((p) => p.qcStatus !== 'Not Ready')
  const pass = rows.reduce((t, p) => t + p.qcPassed, 0), insp = rows.reduce((t, p) => t + p.qcInspected, 0)
  return (
    <>
      <PageHeader title="Quality Control" subtitle="Inspection queue – approved units move to Finished Goods" />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Awaiting inspection" value={rows.filter((p) => p.qcStatus === 'Pending').length} accent="amber" icon={<ClipboardCheck size={18} />} />
        <StatCard label="Passed – ready to move" value={rows.filter((p) => p.qcStatus === 'Passed').length} accent="green" icon={<Check size={18} />} />
        <StatCard label="Units inspected" value={fmt(insp)} icon={<Layers size={18} />} />
        <StatCard label="Overall pass rate" value={insp ? `${((pass / insp) * 100).toFixed(1)}%` : '—'} accent="blue" icon={<Sparkles size={18} />} />
      </div>
      <DataTable rows={rows} rowKey={(p) => p.id} onRowClick={(p) => setOpenId(p.id)} filters={[{ label: 'Status', options: ['Pending', 'Passed', 'Moved to Finished Goods'], get: (p) => p.qcStatus }]}
        columns={[
          { key: 'id', header: 'Batch', sort: (p) => p.id, search: (p) => p.id, render: (p) => <b className="text-brand-600">{p.id}</b> },
          { key: 'prod', header: 'Product', sort: (p) => pname(s, p), search: (p) => pname(s, p), render: (p) => pname(s, p) },
          { key: 'ins', header: 'Inspected', align: 'right', sort: (p) => p.qcInspected, render: (p) => p.qcInspected ? fmt(p.qcInspected) : <span className="text-slate-400">{fmt(p.finished)} awaiting</span> },
          { key: 'pass', header: 'Passed', align: 'right', sort: (p) => p.qcPassed, render: (p) => p.qcPassed ? fmt(p.qcPassed) : '—' },
          { key: 'rej', header: 'Rejected', align: 'right', sort: (p) => p.qcRejected, render: (p) => p.qcInspected ? fmt(p.qcRejected) : '—' },
          { key: 'rate', header: 'Pass Rate', align: 'right', sort: (p) => (p.qcInspected ? p.qcPassed / p.qcInspected : 0), render: (p) => p.qcInspected ? `${((p.qcPassed / p.qcInspected) * 100).toFixed(1)}%` : '—' },
          { key: 'insp', header: 'Inspector', sort: (p) => p.qcInspector, render: (p) => p.qcInspector },
          { key: 'st', header: 'Status', sort: (p) => p.qcStatus, render: (p) => <StatusBadge status={p.qcStatus} /> },
        ]} empty={<EmptyState title="Inspection queue is empty" text="Send a finished batch to QC from the Finishing page." action={<Link to="/manufacturing/finishing" className="btn-primary">Go to Finishing</Link>} />} />
      {openId && <QCDrawer id={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function QCDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, a } = useStore()
  const p = s.plans.find((x) => x.id === id)!
  const inspectors = s.employees.filter((e) => e.dept === 'Quality Control').map((e) => e.name)
  const [inspected, setInspected] = useState(String(p.qcInspected || p.finished))
  const [reasons, setReasons] = useState<Record<string, number>>(Object.keys(p.qcReasons).length ? p.qcReasons : defaultReasons(p.qcInspected || p.finished))
  const [inspector, setInspector] = useState(inspectors.includes(p.qcInspector) ? p.qcInspector : inspectors[0])
  const { ask, el } = useConfirm()
  const ins = Math.min(parseInt(inspected) || 0, p.finished)
  const rejected = Object.values(reasons).reduce((t, x) => t + (x || 0), 0)
  const passed = Math.max(0, ins - rejected)
  const editable = p.qcStatus === 'Pending'
  const prod = productOf(s, p.productId)
  return (
    <Drawer title={`QC Inspection · ${p.id}`} subtitle={`${prod?.name} · ${fmt(p.finished)} finished units`} onClose={onClose}
      footer={editable ? <><button className="btn-secondary" onClick={onClose}>Close</button><button className="btn-primary" disabled={!ins || rejected > ins} onClick={() => { a.completeQC(p.id, ins, rejected, reasons, inspector) }}>Complete QC</button></>
        : p.qcStatus === 'Passed' ? <><button className="btn-secondary" onClick={onClose}>Close</button><button className="btn-primary" onClick={() => ask({ title: 'Move to Finished Goods?', message: `${fmt(p.qcPassed)} units will be added to Finished Goods inventory.`, confirmLabel: 'Move to Finished Goods', onConfirm: () => { a.moveToFG(p.id) } })}>Move to Finished Goods</button></>
          : <button className="btn-secondary" onClick={onClose}>Close</button>}>
      <Stepper steps={['Production', 'QC', 'Finished Goods', 'Inventory', 'Available']} current={p.qcStatus === 'Pending' ? 1 : p.qcStatus === 'Passed' ? 2 : 5} />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Inspected</div><div className="text-lg font-semibold tabular-nums">{fmt(editable ? ins : p.qcInspected)}</div></div>
        <div className="rounded-md bg-emerald-50 p-3"><div className="text-xs text-emerald-700">Passed</div><div className="text-lg font-semibold tabular-nums text-emerald-700">{fmt(editable ? passed : p.qcPassed)}</div></div>
        <div className="rounded-md bg-red-50 p-3"><div className="text-xs text-red-700">Rejected</div><div className="text-lg font-semibold tabular-nums text-red-700">{fmt(editable ? rejected : p.qcRejected)}</div></div>
      </div>
      <div className="mt-2 text-sm text-slate-600">Pass rate: <b>{(editable ? ins : p.qcInspected) ? (((editable ? passed : p.qcPassed) / (editable ? ins : p.qcInspected)) * 100).toFixed(1) : '0.0'}%</b></div>
      {editable && <div className="mt-4 grid gap-3 sm:grid-cols-2"><FormField label="Units inspected" hint={`Up to ${fmt(p.finished)} finished units`}><input type="number" className="input" value={inspected} onChange={(e) => { setInspected(e.target.value); setReasons(defaultReasons(Math.min(parseInt(e.target.value) || 0, p.finished))) }} /></FormField><FormField label="Inspector"><Select value={inspector} onChange={setInspector} options={inspectors} /></FormField></div>}
      <h4 className="mb-2 mt-5 text-sm font-semibold">Rejection reasons</h4>
      <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {REASONS.map((r) => (
          <div key={r} className="flex items-center justify-between px-3 py-2 text-sm"><span>{r}</span>
            {editable ? <input type="number" min={0} className="input w-24 py-1 text-right" value={reasons[r] ?? 0} onChange={(e) => setReasons({ ...reasons, [r]: Math.max(0, parseInt(e.target.value) || 0) })} /> : <b className="tabular-nums">{p.qcReasons[r] ?? 0}</b>}
          </div>))}
      </div>
      {p.qcStatus === 'Moved to Finished Goods' && <div className="mt-5 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={14} className="mr-1 inline" />{fmt(p.qcPassed)} units were added to Finished Goods. <Link className="underline" to="/inventory/finished-goods">View inventory</Link></div>}
      {el}
    </Drawer>
  )
}

export { TODAY }
