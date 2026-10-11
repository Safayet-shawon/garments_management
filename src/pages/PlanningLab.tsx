import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Calculator, CheckCircle2, Download, Server, Cpu } from 'lucide-react'
import { api } from '../api'
import { assignLines, sizeColorMatrix, type AssignResult, type JobInput, type LineInput, type MrpResult, type MrpInput, type RankResult, type SizeColorResult } from '../../shared/planning'
import { DEFAULT_CRITERIA, SUPPLIER_CATEGORIES, buildMrp, rankForCategory, type PlanningData, type SupplierCategory } from '../../shared/scenario'
import { typeForCategory, type GarmentType } from '../../shared/site'
import { useStore, useUI, orderTotal } from '../store'
import { Card, EmptyState, FormField, PageHeader, ProgressBar, Select, StatCard, StatusBadge, Tabs, cx, fmt, money, Money } from '../ui'
import { useDebounced } from '../hooks'
import { TODAY } from '../data'

// ---------- hook: ask the API (matrix engine on the server); fall back to the same maths in the browser ----------
function useCompute<I, O>(kind: 'mrp' | 'assignment' | 'suppliers' | 'size-matrix', input: I, local: (i: I) => O, normalize?: (r: any) => O) {
  const live = useUI().sync.mode === 'live'
  const dIn = useDebounced(input, 300)
  const key = JSON.stringify(dIn)
  const localRef = useRef(local); localRef.current = local
  const [out, setOut] = useState<O | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'server' | 'browser'>('browser')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let on = true
    const runLocal = () => { try { const o = localRef.current(JSON.parse(key)); if (on) { setOut(o); setError(null); setSource('browser') } } catch (e) { if (on) { setOut(null); setError(e instanceof Error ? e.message : 'Could not compute') } } }
    if (!live) { runLocal(); return () => { on = false } }
    setLoading(true)
    api.compute<any>(kind, JSON.parse(key)).then((r) => { if (on) { setOut(normalize ? normalize(r) : r); setError(null); setSource('server') } })
      .catch((e) => { if (!on) return; if (e?.status === 422) { setOut(null); setError(e.message) } else runLocal() })
      .finally(() => on && setLoading(false))
    return () => { on = false }
  }, [key, live, kind, normalize])
  return { out, error, source, loading }
}

const SourceTag = ({ source, loading }: { source: 'server' | 'browser'; loading: boolean }) => (
  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset', source === 'server' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20')}>
    {source === 'server' ? <Server size={12} /> : <Cpu size={12} />}{loading ? 'Calculating…' : source === 'server' ? 'Calculated on the server' : 'Calculated in your browser'}
  </span>
)
const heat = (v: number, max: number) => (max > 0 && v > 0 ? { backgroundColor: `rgba(212,162,31,${0.08 + 0.4 * (v / max)})` } : undefined)
const Formula = ({ children }: { children: React.ReactNode }) => <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-600">{children}</div>

// =============== 1. MRP ===============
function MrpTab() {
  const { s, a } = useStore()
  const styles = useMemo(() => s.products.filter((p) => (s.bom[p.id]?.length ?? 0) > 0), [s.products, s.bom])
  const [qty, setQty] = useState<Record<string, number>>({ p1: 5000 })
  const [onOrder, setOnOrder] = useState(true)
  const [waste, setWaste] = useState(false)
  const data: PlanningData = useMemo(() => ({ products: s.products, materials: s.materials, bom: s.bom, pos: s.pos, suppliers: s.suppliers }), [s.products, s.materials, s.bom, s.pos, s.suppliers])
  const { out, error, source, loading } = useCompute<{ qty: Record<string, number>; includeOnOrder: boolean; withWaste: boolean }, { input: MrpInput; result: MrpResult }>(
    'mrp', { qty, includeOnOrder: onOrder, withWaste: waste }, (i) => buildMrp(data, i.qty, { includeOnOrder: i.includeOnOrder, withWaste: i.withWaste }),
  )
  const fromOrders = () => {
    const need: Record<string, number> = {}
    for (const o of s.orders) if (!o.cancelled && o.step < 6) for (const l of o.lines) need[l.productId] = (need[l.productId] ?? 0) + l.qty
    const next: Record<string, number> = {}
    for (const p of styles) { const avail = p.stock - s.orders.filter((o) => !o.cancelled && o.step >= 4 && o.step <= 5).reduce((t, o) => t + o.lines.filter((l) => l.productId === p.id).reduce((x, l) => x + l.qty, 0), 0); next[p.id] = Math.max(0, (need[p.id] ?? 0) - Math.max(0, avail)) }
    setQty(next)
  }
  const result = out?.result
  const input = out?.input
  const maxC = result ? Math.max(...result.contribution.flat(), 1) : 1
  const short = result?.rows.filter((r) => r.status === 'Short') ?? []
  const raise = () => {
    if (!result || !input) return
    let n = 0
    for (const r of short) { const m = s.materials.find((x) => x.id === r.id); if (!m) continue; a.addRequirement({ materialId: m.id, qty: Math.ceil(r.shortage), reason: 'Planning Lab scenario (MRP)', supplierId: m.supplierId, expected: '2026-10-25', priority: 'Normal', notes: '' }); n++ }
    a.toast(`${n} purchase requirement${n === 1 ? '' : 's'} raised`)
  }
  return (
    <div className="space-y-4">
      <Formula>gross requirement  r = qᵀ · B · diag(1 + waste)<br />shortage  s = max(0, r − stock − on order)    purchase cost = s · price<br />q = pieces per style · B = styles × materials bill-of-materials matrix</Formula>
      <Card title="Scenario: pieces to produce per style" action={<div className="flex gap-2"><button className="btn-secondary btn-sm" onClick={() => setQty({ p1: 5000 })}>PP-2026-001 (5,000 tees)</button><button className="btn-secondary btn-sm" onClick={fromOrders}>Open buyer orders</button></div>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((p) => <FormField key={p.id} label={p.name}><input type="number" min={0} className="input" value={qty[p.id] ?? 0} onChange={(e) => setQty({ ...qty, [p.id]: Math.max(0, Number(e.target.value) || 0) })} /></FormField>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" checked={onOrder} onChange={(e) => setOnOrder(e.target.checked)} />Count open purchase orders as available</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={waste} onChange={(e) => setWaste(e.target.checked)} />Add cutting and sewing waste (fabric 4%, thread 3%)</label>
        </div>
      </Card>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {result && input && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Pieces planned" value={fmt(result.totals.pieces)} icon={<Calculator size={18} />} />
          <StatCard label="Materials short" value={result.totals.shortMaterials} accent={result.totals.shortMaterials ? 'red' : 'green'} icon={result.totals.shortMaterials ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} />
          <StatCard label="Material cost" value={<Money v={Math.round(result.totals.materialCost)} />} />
          <StatCard label="To purchase" value={<Money v={Math.round(result.totals.purchaseCost)} />} accent="amber" />
        </div>
        <Card title="Requirement matrix: pieces × bill of materials" pad={false} action={<SourceTag source={source} loading={loading} />}>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr><th className="th">Style</th><th className="th text-right">Pieces (q)</th>{input.materials.map((m) => <th key={m.id} className="th text-right">{m.name}<div className="font-normal normal-case text-slate-400">{m.unit}</div></th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {input.styles.map((st, i) => (
                <tr key={st.id}><td className="td font-medium text-slate-900">{st.name}</td><td className="td text-right tabular-nums">{fmt(input.qty[i])}</td>
                  {input.materials.map((m, j) => <td key={m.id} className="td text-right tabular-nums" style={heat(result.contribution[i][j], maxC)}>{result.contribution[i][j] ? fmt(result.contribution[i][j], 1) : <span className="text-slate-300">·</span>}<div className="text-[10px] text-slate-400">B = {input.bom[i][j] || 0}</div></td>)}</tr>
              ))}
              <tr className="bg-slate-50 font-semibold"><td className="td">Gross requirement</td><td className="td" />{result.gross.map((g, j) => <td key={j} className="td text-right tabular-nums">{fmt(g, 1)}</td>)}</tr>
              <tr><td className="td">In stock</td><td className="td" />{input.materials.map((m) => <td key={m.id} className="td text-right tabular-nums text-slate-600">{fmt(m.stock)}</td>)}</tr>
              {onOrder && <tr><td className="td">On order</td><td className="td" />{input.materials.map((m) => <td key={m.id} className="td text-right tabular-nums text-slate-600">{fmt(m.onOrder ?? 0)}</td>)}</tr>}
              <tr className="bg-slate-50 font-semibold"><td className="td">Shortage</td><td className="td" />{result.shortage.map((x, j) => <td key={j} className={cx('td text-right tabular-nums', x > 0 ? 'text-red-600' : 'text-emerald-600')}>{x > 0 ? fmt(x, 1) : 'OK'}</td>)}</tr>
              <tr><td className="td">Coverage</td><td className="td" />{result.coverage.map((c, j) => <td key={j} className="td"><ProgressBar value={c * 100} showLabel={false} h="h-1.5" color={c < 1 ? 'amber' : 'brand'} /></td>)}</tr>
            </tbody></table></div>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" disabled={!short.length} onClick={raise}>Create purchase requirements for {short.length} short material{short.length === 1 ? '' : 's'}</button>
          {!short.length && <span className="text-sm text-emerald-700">Everything for this scenario is covered by stock and open orders.</span>}
        </div>
      </>}
    </div>
  )
}

// =============== 2. Line assignment ===============
const SAM: Record<GarmentType, number> = { tee: 7.5, polo: 11, hoodie: 22, shirt: 18, chino: 20, sweatshirt: 14 }
const DEFAULT_LINES: LineInput[] = [
  { id: 'A', name: 'Line A', operators: 40, efficiency: 0.82, hoursPerDay: 9, specialty: ['tee', 'sweatshirt'] },
  { id: 'B', name: 'Line B', operators: 36, efficiency: 0.78, hoursPerDay: 9, specialty: ['polo'] },
  { id: 'C', name: 'Line C', operators: 44, efficiency: 0.72, hoursPerDay: 9, specialty: ['hoodie', 'sweatshirt'] },
  { id: 'D', name: 'Line D', operators: 38, efficiency: 0.75, hoursPerDay: 9, specialty: ['shirt'] },
  { id: 'E', name: 'Line E', operators: 34, efficiency: 0.74, hoursPerDay: 9, specialty: ['chino'] },
]
const dayDiff = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

function AssignTab() {
  const { s } = useStore()
  const [lines, setLines] = useState(DEFAULT_LINES)
  const jobs: JobInput[] = useMemo(() => s.orders.filter((o) => !o.cancelled && o.step < 6).map((o) => {
    const byType: Record<string, number> = {}
    let minutes = 0
    for (const l of o.lines) { const p = s.products.find((x) => x.id === l.productId); const t = typeForCategory(p?.category ?? ''); byType[t] = (byType[t] ?? 0) + l.qty; minutes += l.qty * SAM[t] }
    const qty = o.lines.reduce((t, l) => t + l.qty, 0)
    const category = Object.entries(byType).sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'tee'
    return { id: o.id, label: `${o.id} · ${s.buyers.find((b) => b.id === o.buyer)?.name ?? ''}`, qty, sam: Math.round((minutes / Math.max(1, qty)) * 10) / 10, category, dueInDays: Math.max(1, dayDiff(TODAY, o.shipDate) - 7) }
  }).slice(0, 8), [s.orders, s.products, s.buyers])
  const { out, error, source, loading } = useCompute<{ lines: LineInput[]; jobs: JobInput[] }, AssignResult>('assignment', { lines, jobs }, (i) => assignLines(i))
  const setLine = (i: number, patch: Partial<LineInput>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  if (!jobs.length) return <Card><EmptyState title="No open buyer orders to schedule" text="Create a buyer order in Merchandising and it will appear here." /></Card>
  const maxCost = out ? Math.max(...out.cost.flat()) : 1
  const horizon = out ? Math.max(out.makespan, ...jobs.map((j) => j.dueInDays), 1) : 1
  return (
    <div className="space-y-4">
      <Formula>days(i,j) = pieces(j) · SAM(j) ÷ (60 · operators(i) · efficiency(i) · hours/day) + changeover if line i is not a specialist<br />cost(i,j) = days(i,j) + 4 · lateness(i,j)    minimise Σ cost with the Hungarian algorithm (O(n²m))</Formula>
      <Card title="Sewing lines">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="th">Line</th><th className="th">Operators</th><th className="th">Efficiency</th><th className="th">Hours / day</th><th className="th">Specialist in</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={l.id}><td className="td font-medium">{l.name}</td>
            <td className="td"><input type="number" min={1} className="input w-20 py-1" value={l.operators} onChange={(e) => setLine(i, { operators: Number(e.target.value) || 1 })} /></td>
            <td className="td"><input type="number" step={0.01} min={0.1} max={1} className="input w-20 py-1" value={l.efficiency} onChange={(e) => setLine(i, { efficiency: Math.min(1, Math.max(0.1, Number(e.target.value) || 0.1)) })} /></td>
            <td className="td"><input type="number" min={1} max={24} className="input w-20 py-1" value={l.hoursPerDay} onChange={(e) => setLine(i, { hoursPerDay: Number(e.target.value) || 1 })} /></td>
            <td className="td text-slate-500">{l.specialty.join(', ')}</td></tr>)}</tbody></table></div>
      </Card>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {out && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Optimal cost" value={fmt(out.optimalCost, 1)} sub="days + lateness penalty" />
          <StatCard label="Naive pairing" value={fmt(out.baselineCost, 1)} sub="job k → line k" />
          <StatCard label="Improvement" value={`${out.savingsPct}%`} accent="green" />
          <StatCard label="Late jobs" value={out.lateJobs} accent={out.lateJobs ? 'red' : 'green'} sub={`makespan ${out.makespan} days`} />
        </div>
        <Card title="Cost matrix (rows: lines, columns: orders)" pad={false} action={<SourceTag source={source} loading={loading} />}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="th">Line</th>{jobs.map((j) => <th key={j.id} className="th text-right">{j.id.slice(-4)}<div className="font-normal normal-case text-slate-400">{fmt(j.qty)} pcs · {j.category}</div></th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{lines.map((l, i) => <tr key={l.id}><td className="td font-medium">{l.name}</td>{jobs.map((_, j) => { const chosen = out.assignment[i] === j; return <td key={j} className={cx('td text-right tabular-nums', chosen && 'font-bold text-brand-700 ring-2 ring-inset ring-gold-500')} style={chosen ? { backgroundColor: 'rgba(212,162,31,.22)' } : heat(maxCost - out.cost[i][j], maxCost)}>{out.cost[i][j]}<div className="text-[10px] font-normal text-slate-400">{out.days[i][j]} d</div></td> })}</tr>)}</tbody></table></div>
        </Card>
        <Card title="Resulting schedule (days from today)">
          <div className="space-y-3">{out.schedule.map((l) => (
            <div key={l.lineId} className="grid grid-cols-[70px_1fr] items-center gap-3">
              <div className="text-sm font-medium">{l.lineName}</div>
              <div className="relative h-9 rounded-md bg-slate-100">
                {l.jobs.map((j) => <div key={j.id} title={`${j.label}: day ${j.startDay} to ${j.endDay}${j.late ? `, ${j.late} days late` : ''}`} className={cx('absolute top-1 flex h-7 items-center overflow-hidden rounded px-2 text-[11px] font-medium text-white', j.late ? 'bg-red-500' : 'bg-brand-600')} style={{ left: `${(j.startDay / horizon) * 100}%`, width: `${Math.max(4, (j.days / horizon) * 100)}%` }}>{j.id.slice(-4)}</div>)}
              </div>
            </div>))}
            <div className="grid grid-cols-[70px_1fr] gap-3 text-[11px] text-slate-400"><span /><div className="flex justify-between"><span>day 0</span><span>day {Math.round(horizon)}</span></div></div>
          </div>
          {out.unassignedBeforeQueue.length > 0 && <p className="mt-3 text-xs text-slate-500">{out.unassignedBeforeQueue.length} order(s) were queued behind the line that frees up first.</p>}
        </Card>
      </>}
    </div>
  )
}

// =============== 3. Supplier scoring ===============
function SupplierTab() {
  const { s } = useStore()
  const [category, setCategory] = useState<SupplierCategory>('Fabric')
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(DEFAULT_CRITERIA.map((c) => [c.key, c.weight])))
  const [detail, setDetail] = useState(false)
  const { out, error, source, loading } = useCompute<{ category: SupplierCategory; weights: Record<string, number> }, { rows: { id: string; name: string; values: Record<string, number> }[]; result: RankResult }>(
    'suppliers', { category, weights },
    (i) => rankForCategory(s.suppliers, i.category, DEFAULT_CRITERIA.map((c) => ({ ...c, weight: i.weights[c.key] ?? c.weight }))),
  )
  return (
    <div className="space-y-4">
      <Formula>TOPSIS: normalise each criterion  r = x ÷ √Σx²  →  weight  v = r · w  →  distance to the best (d⁺) and worst (d⁻) supplier<br />score = d⁻ ÷ (d⁺ + d⁻)    1.00 is the best overall balance of price, quality, lead time, reliability and MOQ</Formula>
      <Card title="Weights">
        <div className="mb-4 max-w-xs"><FormField label="Material category"><Select value={category} onChange={(v) => setCategory(v as SupplierCategory)} options={[...SUPPLIER_CATEGORIES]} /></FormField></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{DEFAULT_CRITERIA.map((c) => <label key={c.key} className="block text-sm"><span className="flex justify-between text-slate-600"><span>{c.label}</span><b>{weights[c.key]}</b></span><input type="range" min={0} max={100} value={weights[c.key]} onChange={(e) => setWeights({ ...weights, [c.key]: Number(e.target.value) })} className="mt-2 w-full accent-[#d4a21f]" /><span className="text-[11px] text-slate-400">{c.benefit ? 'higher is better' : 'lower is better'}</span></label>)}</div>
      </Card>
      {error && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {out && <Card title="Ranking" pad={false} action={<SourceTag source={source} loading={loading} />}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="th">Rank</th><th className="th">Supplier</th>{DEFAULT_CRITERIA.map((c) => <th key={c.key} className="th text-right">{c.label}</th>)}<th className="th w-48">Score</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{out.result.ranking.map((r) => { const row = out.rows.find((x) => x.id === r.id)!; return <tr key={r.id}><td className="td"><span className={cx('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', r.rank === 1 ? 'bg-gold-500 text-brand-900' : 'bg-slate-100 text-slate-600')}>{r.rank}</span></td><td className="td font-medium text-slate-900">{r.name}</td>{DEFAULT_CRITERIA.map((c) => <td key={c.key} className="td text-right tabular-nums">{row.values[c.key]}</td>)}<td className="td"><ProgressBar value={r.score * 100} showLabel={false} /><div className="mt-0.5 text-xs tabular-nums text-slate-500">{r.score.toFixed(3)}</div></td></tr> })}</tbody></table></div>
        <div className="border-t border-slate-100 p-3"><button className="btn-ghost btn-sm" onClick={() => setDetail(!detail)}>{detail ? 'Hide' : 'Show'} normalised and weighted matrices</button>
          {detail && <div className="mt-3 grid gap-4 lg:grid-cols-2">{[['Normalised matrix R', out.result.normalized], ['Weighted matrix V', out.result.weighted]].map(([t, m]) => <div key={t as string}><div className="mb-1 text-xs font-semibold text-slate-500">{t as string}</div><table className="w-full text-xs"><tbody>{(m as number[][]).map((r, i) => <tr key={i}><td className="py-1 pr-2 text-slate-500">{out.rows[i].name.split(' ')[0]}</td>{r.map((x, j) => <td key={j} className="py-1 text-right font-mono">{x.toFixed(3)}</td>)}</tr>)}</tbody></table></div>)}</div>}</div>
      </Card>}
    </div>
  )
}

// =============== 4. Size x colour matrix ===============
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
function SizeTab() {
  const { s } = useStore()
  const [total, setTotal] = useState(5000)
  const [styleId, setStyleId] = useState('p1')
  const [ratio, setRatio] = useState([0.5, 1, 2, 2, 1, 0.5])
  const [colors, setColors] = useState([{ name: 'Green', share: 40 }, { name: 'White', share: 30 }, { name: 'Black', share: 30 }])
  const [carton, setCarton] = useState(48)
  const [allowance, setAllowance] = useState(3)
  const base = useMemo(() => (s.bom[styleId] ?? []).filter((l) => /fabric/i.test(s.materials.find((m) => m.id === l.materialId)?.name ?? '')).reduce((t, l) => t + l.qty, 0) || 1, [s.bom, s.materials, styleId])
  const factors = [0.88, 0.94, 1, 1.07, 1.14, 1.21]
  const consumptionKg = factors.map((f) => Math.round(base * f * 1000) / 1000)
  const input = { total, sizes: SIZES, ratio, colors: colors.map((c) => c.name), colorShare: colors.map((c) => c.share), consumptionKg, piecesPerCarton: carton, cuttingAllowancePct: allowance }
  const { out, error, source, loading } = useCompute<typeof input, SizeColorResult>('size-matrix', input, (i) => sizeColorMatrix(i))
  const max = out ? Math.max(...out.matrix.flat(), 1) : 1
  const csv = () => {
    if (!out) return
    const rows = [['Colour', ...SIZES, 'Total'], ...out.matrix.map((r, i) => [colors[i].name, ...r, out.rowTotals[i]]), ['Total', ...out.colTotals, out.grandTotal], ['Cut quantity', ...out.cutQty, out.cutTotal]]
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = 'size-colour-matrix.csv'; el.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-4">
      <Formula>colour totals = apportion(total, shares)    cell(c,z) = apportion(colour total c, size ratio)  (largest remainder, so every row and the grand total are exact)<br />cut plan = ⌈size total · (1 + allowance)⌉    fabric = cut plan · consumption vector</Formula>
      <Card title="Order breakdown">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Style"><Select value={styleId} onChange={setStyleId} options={s.products.filter((p) => s.bom[p.id]?.length).map((p) => ({ value: p.id, label: p.name }))} /></FormField>
          <FormField label="Order quantity (pcs)"><input type="number" min={1} className="input" value={total} onChange={(e) => setTotal(Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></FormField>
          <FormField label="Pieces per carton"><input type="number" min={1} className="input" value={carton} onChange={(e) => setCarton(Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></FormField>
          <FormField label="Cutting allowance %"><input type="number" min={0} max={30} step={0.5} className="input" value={allowance} onChange={(e) => setAllowance(Math.min(30, Math.max(0, Number(e.target.value) || 0)))} /></FormField>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div><div className="mb-2 text-xs font-semibold uppercase text-slate-500">Size ratio</div><div className="grid grid-cols-6 gap-2">{SIZES.map((z, i) => <label key={z} className="block text-center text-xs text-slate-500">{z}<input type="number" min={0} step={0.5} className="input mt-1 px-1 text-center" value={ratio[i]} onChange={(e) => setRatio(ratio.map((r, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : r)))} /></label>)}</div></div>
          <div><div className="mb-2 text-xs font-semibold uppercase text-slate-500">Colour share %</div><div className="space-y-2">{colors.map((c, i) => <div key={i} className="flex gap-2"><input className="input" value={c.name} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /><input type="number" min={0} className="input w-24" value={c.share} onChange={(e) => setColors(colors.map((x, j) => (j === i ? { ...x, share: Math.max(0, Number(e.target.value) || 0) } : x)))} />{colors.length > 1 && <button className="btn-ghost btn-sm" onClick={() => setColors(colors.filter((_, j) => j !== i))} aria-label="Remove colour">×</button>}</div>)}<button className="btn-ghost btn-sm" onClick={() => setColors([...colors, { name: 'Navy', share: 10 }])}>+ Add colour</button></div></div>
        </div>
      </Card>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {out && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Pieces" value={fmt(out.grandTotal)} /><StatCard label="Cut quantity" value={fmt(out.cutTotal)} sub={`+${allowance}% allowance`} /><StatCard label="Fabric needed" value={`${fmt(out.fabricKg, 1)} kg`} accent="amber" /><StatCard label="Cartons" value={fmt(out.cartonsTotal)} accent="blue" /></div>
        <Card title="Size × colour matrix" pad={false} action={<div className="flex items-center gap-2"><SourceTag source={source} loading={loading} /><button className="btn-secondary btn-sm" onClick={csv}><Download size={13} />CSV</button></div>}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="th">Colour</th>{SIZES.map((z) => <th key={z} className="th text-right">{z}</th>)}<th className="th text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {out.matrix.map((r, i) => <tr key={i}><td className="td font-medium">{colors[i].name}</td>{r.map((v, j) => <td key={j} className="td text-right tabular-nums" style={heat(v, max)}>{fmt(v)}</td>)}<td className="td text-right font-semibold tabular-nums">{fmt(out.rowTotals[i])}</td></tr>)}
              <tr className="bg-slate-50 font-semibold"><td className="td">Total</td>{out.colTotals.map((v, j) => <td key={j} className="td text-right tabular-nums">{fmt(v)}</td>)}<td className="td text-right tabular-nums">{fmt(out.grandTotal)}</td></tr>
              <tr><td className="td">Cut quantity</td>{out.cutQty.map((v, j) => <td key={j} className="td text-right tabular-nums text-slate-600">{fmt(v)}</td>)}<td className="td text-right tabular-nums text-slate-600">{fmt(out.cutTotal)}</td></tr>
              <tr><td className="td">Fabric kg / piece</td>{consumptionKg.map((v, j) => <td key={j} className="td text-right tabular-nums text-slate-500">{v}</td>)}<td className="td" /></tr>
              <tr><td className="td">Cartons</td>{out.cartons.map((v, j) => <td key={j} className="td text-right tabular-nums text-slate-600">{fmt(v)}</td>)}<td className="td text-right tabular-nums text-slate-600">{fmt(out.cartonsTotal)}</td></tr>
            </tbody></table></div>
        </Card>
      </>}
    </div>
  )
}

export default function PlanningLab() {
  const [tab, setTab] = useState('Material requirements')
  return (
    <>
      <PageHeader title="Planning Lab" subtitle="Matrix mathematics for materials, sewing lines, suppliers and size breakdowns" />
      <Tabs tabs={['Material requirements', 'Line assignment', 'Supplier scoring', 'Size × colour']} active={tab} onChange={setTab} />
      {tab === 'Material requirements' && <MrpTab />}
      {tab === 'Line assignment' && <AssignTab />}
      {tab === 'Supplier scoring' && <SupplierTab />}
      {tab === 'Size × colour' && <SizeTab />}
    </>
  )
}
export { StatusBadge, money, orderTotal }
