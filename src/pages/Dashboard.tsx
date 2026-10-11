import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Anchor, Boxes, Factory, Globe, Package, Shirt, TrendingUp, Users } from 'lucide-react'
import { useStore, matStatus, planDisplayStatus, planProgress, orderStatus, orderTotal } from '../store'
import { seedSalesSeries } from '../data'
import { ActivityFeed, Card, Money, PageHeader, ProgressBar, StatCard, StatusBadge, Usd, fmt, fmtDate, usd } from '../ui'

export default function Dashboard() {
  const { s } = useStore()
  const series = useMemo(seedSalesSeries, [])
  const fg = s.products.reduce((t, p) => t + p.stock, 0)
  const rmValue = s.materials.reduce((t, m) => t + m.onHand * m.unitCost, 0)
  const lowMats = s.materials.filter((m) => matStatus(m) !== 'Healthy')
  const lowCount = lowMats.length + s.products.filter((p) => p.stock <= p.reorder).length
  const active = s.plans.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled').length
  const live = s.orders.filter((o) => !o.cancelled)
  const inHand = live.filter((o) => o.step < 6)
  const monthExport = 107100 + s.salesAdj
  const chart = series.map((d, i, arr) => ({ ...d, revenue: i === arr.length - 1 ? Math.round(monthExport / 26) : Math.round(d.revenue / 120) }))
  const showPlans = s.plans.filter((p) => ['PP-2026-001', 'PP-2026-002', 'PP-2026-003', 'PP-2026-004'].includes(p.id))
  const byCountry = s.countries.map((c) => ({ name: c.name.replace('United Kingdom', 'UK').replace('United States', 'USA').replace('United Arab Emirates', 'UAE'), value: Math.round(live.filter((o) => o.country === c.code).reduce((t, o) => t + orderTotal(o), 0)) })).filter((x) => x.value).sort((a, b) => b.value - a.value)
  const upcoming = [...inHand].sort((a, b) => a.shipDate.localeCompare(b.shipDate)).slice(0, 5)
  return (
    <>
      <PageHeader title="Executive Dashboard" subtitle="Thursday, 8 October 2026 · Winner Apparels · Gazipur factory" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Export Revenue (Month)" value={<Usd v={monthExport} />} sub={`≈ ৳ ${fmt(monthExport * 120)}`} icon={<TrendingUp size={18} />} accent="green" to="/reports/sales" />
        <StatCard label="Orders in Hand" value={inHand.length} sub={`${fmt(inHand.reduce((t, o) => t + o.lines.reduce((a, l) => a + l.qty, 0), 0))} pcs from buyers`} icon={<Package size={18} />} to="/merchandising/orders" />
        <StatCard label="Buyers · Countries" value={`${s.buyers.length} · ${new Set(s.buyers.map((b) => b.country)).size}`} sub="Active export markets" icon={<Globe size={18} />} accent="blue" to="/merchandising/buyers" />
        <StatCard label="Finished Goods" value={`${fmt(fg)} pcs`} sub="Ready in FG warehouse" icon={<Shirt size={18} />} to="/inventory/finished-goods" />
        <StatCard label="Active Production" value={active} sub="Plans in the pipeline" icon={<Factory size={18} />} accent="blue" to="/manufacturing" />
        <StatCard label="Raw Material Value" value={<Money v={Math.round(rmValue)} />} sub={`${s.materials.length} materials in stock`} icon={<Boxes size={18} />} to="/inventory/raw-materials" />
        <StatCard label="Workforce" value={s.employees.length} sub="11 departments" icon={<Users size={18} />} to="/hr/employees" />
        <StatCard label="Low Stock Items" value={lowCount} sub="Need attention" icon={<AlertTriangle size={18} />} accent="red" to="/inventory/low-stock" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Export revenue – last 30 days (USD)" className="xl:col-span-2" action={<div className="flex gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-gold-500" />Revenue</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand-500" />Orders</span></div>}>
          <div className="h-72">
            <ResponsiveContainer>
              <ComposedChart data={chart} margin={{ left: -10, right: 4, top: 8 }}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4a21f" stopOpacity={0.4} /><stop offset="100%" stopColor="#d4a21f" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: any) => `$${v / 1000}k`} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any, n: any) => (n === 'Revenue' ? usd(v) : v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area yAxisId="l" type="monotone" dataKey="revenue" name="Revenue" stroke="#d4a21f" strokeWidth={2.5} fill="url(#rev)" />
                <Line yAxisId="r" type="monotone" dataKey="orders" name="Orders" stroke="#4a67d6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Inventory Alerts" action={<Link to="/inventory/low-stock" className="text-xs text-brand-600 hover:underline">View all</Link>} pad={false}>
          {lowMats.length ? <ul className="divide-y divide-slate-100">
            {lowMats.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{m.name}</div><div className="text-xs text-slate-500">{fmt(m.onHand)} {m.unit} on hand · reorder at {fmt(m.reorder)}</div></div>
                <StatusBadge status={matStatus(m)} label={matStatus(m) === 'Critical' ? 'Critical' : 'Reorder Required'} />
              </li>))}
          </ul> : <div className="p-6 text-center text-sm text-slate-500">All materials are above reorder level.</div>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Production Overview" className="xl:col-span-2" action={<Link to="/manufacturing/plans" className="text-xs text-brand-600 hover:underline">All plans</Link>} pad={false}>
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr><th className="th">Style</th><th className="th text-right">Target</th><th className="th text-right">Produced</th><th className="th w-44">Progress</th><th className="th">Stage</th><th className="th">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {showPlans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50"><td className="td"><Link to={`/manufacturing/plans/${p.id}`} className="font-medium text-slate-900 hover:text-brand-600">{s.products.find((x) => x.id === p.productId)?.name}</Link></td>
                  <td className="td text-right tabular-nums">{fmt(p.target)}</td><td className="td text-right tabular-nums">{fmt(p.sewn)}</td>
                  <td className="td"><ProgressBar value={planProgress(p)} /></td><td className="td">{p.stage === 'Completed' ? '—' : p.stage}</td><td className="td"><StatusBadge status={planDisplayStatus(s, p)} /></td></tr>
              ))}
            </tbody></table></div>
        </Card>
        <Card title="Upcoming shipments" action={<Link to="/merchandising/shipments" className="text-xs text-brand-600 hover:underline">Shipments</Link>} pad={false}>
          <ul className="divide-y divide-slate-100">{upcoming.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-900">{s.buyers.find((b) => b.id === o.buyer)?.name}</div><div className="text-xs text-slate-500"><span className="mr-1 rounded bg-brand-50 px-1 font-mono text-[10px] font-semibold text-brand-600">{o.country}</span>{o.id} · {usd(Math.round(orderTotal(o)))}</div></div>
              <div className="text-right"><div className="text-sm font-semibold tabular-nums">{fmtDate(o.shipDate)}</div><StatusBadge status={orderStatus(o)} /></div>
            </li>))}</ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Export value by destination (USD)" className="xl:col-span-2" action={<Link to="/merchandising" className="text-xs text-brand-600 hover:underline">Merchandising</Link>}>
          <div className="h-60"><ResponsiveContainer><BarChart data={byCountry} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: any) => `$${v / 1000}k`} /><Tooltip formatter={(v: any) => usd(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={48}>{byCountry.map((_, i) => <Cell key={i} fill={i === 0 ? '#d4a21f' : '#4a67d6'} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Recent Activities"><div className="max-h-[260px] overflow-y-auto"><ActivityFeed items={s.activities.slice(0, 8)} /></div></Card>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Anchor size={13} />Sample data for demonstration · Actions you take update this dashboard in real time.</div>
    </>
  )
}
