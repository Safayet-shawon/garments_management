import { useMemo, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useStore, orderTotal, poTotal, supplierName, matStatus } from '../store'
import { DEPARTMENTS, TODAY, seedSalesSeries } from '../data'
import { Card, Money, PageHeader, ProgressBar, StatCard, Tabs, fmt, money, StatusBadge, DataTable } from '../ui'

const C = ['#d4a21f', '#4a67d6', '#10b981', '#ef4444', '#8b5cf6', '#64748b']
const axis = { tick: { fontSize: 11, fill: '#94a3b8' }, tickLine: false, axisLine: false } as const
const Chart = ({ children, h = 260 }: { children: ReactNode; h?: number }) => <div style={{ height: h }}><ResponsiveContainer>{children as any}</ResponsiveContainer></div>
const tip = { contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' } }

export default function Reports() {
  const { kind } = useParams()
  const nav = useNavigate()
  const { s } = useStore()
  const series = useMemo(seedSalesSeries, [])
  const kinds = ['sales', 'production', 'inventory', 'procurement', 'hr']
  if (!kind || !kinds.includes(kind)) return <Navigate to="/reports/sales" replace />
  const pname = (id: string) => s.products.find((p) => p.id === id)?.name || id
  let body: ReactNode = null

  if (kind === 'sales') {
    const live = s.orders.filter((o) => !o.cancelled)
    const revenue = 107100 + s.salesAdj
    const pcs = live.reduce((t, o) => t + o.lines.reduce((x, l) => x + l.qty, 0), 0)
    const orderValue = live.reduce((t, o) => t + orderTotal(o), 0)
    const topStyles = s.products.map((p) => ({ name: p.name.replace('Premium ', '').replace('Classic ', ''), revenue: Math.round(live.flatMap((o) => o.lines).filter((l) => l.productId === p.id).reduce((t, l) => t + l.qty * l.price, 0)) })).sort((a, b) => b.revenue - a.revenue)
    const byCountry = s.countries.map((c) => ({ name: c.code, full: c.name, value: Math.round(live.filter((o) => o.country === c.code).reduce((t, o) => t + orderTotal(o), 0)) })).filter((x) => x.value).sort((a, b) => b.value - a.value)
    const byBuyer = s.buyers.map((b) => ({ name: b.name.split(' ')[0], value: Math.round(live.filter((o) => o.buyer === b.id).reduce((t, o) => t + orderTotal(o), 0)) })).filter((x) => x.value).sort((a, b) => b.value - a.value)
    const daily = series.map((d) => ({ date: d.date, revenue: Math.round(d.revenue / 120) }))
    const u = (v: any) => `$ ${Number(v).toLocaleString('en-US')}`
    body = <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Export Revenue (Month)" value={<Money v={revenue} cur="USD" />} accent="green" /><StatCard label="Order Book Value" value={<Money v={Math.round(orderValue)} cur="USD" />} /><StatCard label="Pieces Ordered" value={fmt(pcs)} accent="blue" /><StatCard label="Avg. FOB / pc" value={<Money v={orderValue / pcs} d={2} cur="USD" />} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Daily export revenue (USD)" className="lg:col-span-2"><Chart><LineChart data={daily} margin={{ left: -10 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="date" {...axis} interval={4} /><YAxis {...axis} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip {...tip} formatter={u} /><Line dataKey="revenue" stroke="#d4a21f" strokeWidth={2.5} dot={false} /></LineChart></Chart></Card>
        <Card title="Top styles by order value"><Chart><BarChart data={topStyles} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke="#eef2f7" horizontal={false} /><XAxis type="number" {...axis} tickFormatter={(v) => `$${v / 1000}k`} /><YAxis type="category" dataKey="name" {...axis} width={90} /><Tooltip {...tip} formatter={u} /><Bar dataKey="revenue" fill="#4a67d6" radius={[0, 4, 4, 0]} /></BarChart></Chart></Card>
        <Card title="Order value by country"><Chart><BarChart data={byCountry} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip {...tip} formatter={u} labelFormatter={(l: any) => byCountry.find((x) => x.name === l)?.full || l} /><Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>{byCountry.map((_, i) => <Cell key={i} fill={i === 0 ? '#d4a21f' : '#4a67d6'} />)}</Bar></BarChart></Chart></Card>
        <Card title="Order value by buyer" className="lg:col-span-2"><Chart><BarChart data={byBuyer} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" {...axis} interval={0} /><YAxis {...axis} tickFormatter={(v) => `$${v / 1000}k`} /><Tooltip {...tip} formatter={u} /><Bar dataKey="value" fill="#d4a21f" radius={[4, 4, 0, 0]} maxBarSize={52} /></BarChart></Chart></Card>
      </div></>
  }
  if (kind === 'production') {
    const act = s.plans.filter((p) => p.status !== 'Cancelled')
    const planned = act.reduce((t, p) => t + p.target, 0), produced = act.reduce((t, p) => t + p.sewn, 0), rejected = act.reduce((t, p) => t + p.qcRejected + p.sewReject, 0)
    const byStage = [{ stage: 'Cut', qty: act.reduce((t, p) => t + p.cut, 0) }, { stage: 'Sewn', qty: produced }, { stage: 'Finished', qty: act.reduce((t, p) => t + p.finished, 0) }, { stage: 'QC Passed', qty: act.reduce((t, p) => t + p.qcPassed, 0) }]
    body = <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Planned" value={`${fmt(planned)} pcs`} /><StatCard label="Produced" value={`${fmt(produced)} pcs`} accent="green" /><StatCard label="Rejected" value={`${fmt(rejected)} pcs`} accent="red" /><StatCard label="Efficiency" value={`${Math.round((produced / planned) * 100)}%`} accent="blue" /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Production by stage (pcs)"><Chart><BarChart data={byStage} margin={{ left: -10 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="stage" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="qty" radius={[4, 4, 0, 0]} maxBarSize={56}>{byStage.map((_, i) => <Cell key={i} fill={C[i === 3 ? 2 : 0]} />)}</Bar></BarChart></Chart></Card>
        <Card title="Plan progress">{act.slice(0, 7).map((p) => <div key={p.id} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-xs"><span className="font-medium">{p.id} · {pname(p.productId)}</span><span className="text-slate-400">{fmt(p.sewn)} / {fmt(p.target)}</span></div><ProgressBar value={(p.sewn / p.target) * 100} /></div>)}</Card>
      </div></>
  }
  if (kind === 'inventory') {
    const rm = s.materials.reduce((t, m) => t + m.onHand * m.unitCost, 0)
    const byMat = s.materials.map((m) => ({ name: m.name, value: Math.round(m.onHand * m.unitCost) })).sort((a, b) => b.value - a.value).slice(0, 8)
    const types = Object.entries(s.movements.reduce<Record<string, number>>((a, m) => ((a[m.type] = (a[m.type] || 0) + 1), a), {})).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    body = <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Raw Material Value" value={<Money v={Math.round(rm)} />} /><StatCard label="Finished Goods" value={`${fmt(s.products.reduce((t, p) => t + p.stock, 0))} pcs`} accent="green" /><StatCard label="Low Stock Items" value={s.materials.filter((m) => matStatus(m) !== 'Healthy').length} accent="red" /><StatCard label="Stock Movements" value={s.movements.length} accent="blue" sub="recorded this month" /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Raw material value by item (৳)"><Chart><BarChart data={byMat} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" {...axis} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis {...axis} tickFormatter={(v) => `${v / 1e6}M`} /><Tooltip {...tip} formatter={(v: any) => money(v)} /><Bar dataKey="value" fill="#4a67d6" radius={[4, 4, 0, 0]} /></BarChart></Chart></Card>
        <Card title="Stock movement by type"><Chart><PieChart><Pie data={types} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{types.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></Chart></Card>
      </div></>
  }
  if (kind === 'procurement') {
    const bySup = s.suppliers.map((x) => ({ name: x.name.split(' ').slice(0, 2).join(' '), value: s.pos.filter((p) => p.supplierId === x.id).reduce((t, p) => t + poTotal(p), 0) })).filter((x) => x.value).sort((a, b) => b.value - a.value)
    body = <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Purchase Value" value={<Money v={s.pos.reduce((t, p) => t + poTotal(p), 0)} />} /><StatCard label="Suppliers Used" value={bySup.length} /><StatCard label="Pending Orders" value={s.pos.filter((p) => ['Draft', 'Approved', 'Ordered', 'Partially Received'].includes(p.status)).length} accent="amber" /><StatCard label="Received Materials" value={`${s.movements.filter((m) => m.type === 'RECEIPT').length} receipts`} accent="green" /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Supplier spending (৳)"><Chart><BarChart data={bySup} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" {...axis} interval={0} /><YAxis {...axis} tickFormatter={(v) => `${v / 1e6}M`} /><Tooltip {...tip} formatter={(v: any) => money(v)} /><Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={52} /></BarChart></Chart></Card>
        <Card title="Purchase orders" pad={false}><table className="w-full"><tbody className="divide-y divide-slate-100">{s.pos.slice(0, 7).map((p) => <tr key={p.id}><td className="td font-medium">{p.id}</td><td className="td">{supplierName(s, p.supplierId)}</td><td className="td text-right"><Money v={poTotal(p)} /></td><td className="td"><StatusBadge status={p.status} /></td></tr>)}</tbody></table></Card>
      </div></>
  }
  if (kind === 'hr') {
    const today = s.attendance.filter((x) => x.date === TODAY)
    const att = ['Present', 'Late', 'Absent', 'Leave'].map((n) => ({ name: n, value: today.filter((x) => x.status === n).length }))
    const pay = [...s.payrollHistory].reverse().map((p) => ({ month: p.month.split(' ')[0].slice(0, 3), net: p.net }))
    const gross = s.employees.reduce((t, e) => t + e.basic * 1.45, 0)
    body = <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Employees" value={s.employees.length} /><StatCard label="Attendance Today" value={`${Math.round(((att[0].value + att[1].value) / today.length) * 100)}%`} accent="green" /><StatCard label="Leave Days (Approved)" value={s.leaves.filter((l) => l.status === 'Approved').reduce((t, l) => t + l.days, 0)} accent="blue" /><StatCard label="Monthly Payroll" value={<Money v={Math.round(gross)} />} accent="amber" /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Attendance today"><Chart><PieChart><Pie data={att} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{att.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444', '#4a67d6'][i]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></Chart></Card>
        <Card title="Headcount by department"><Chart><BarChart data={DEPARTMENTS.map((d) => ({ name: d.slice(0, 5), count: s.employees.filter((e) => e.dept === d).length }))} margin={{ left: -20 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" {...axis} interval={0} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="count" fill="#4a67d6" radius={[4, 4, 0, 0]} /></BarChart></Chart></Card>
        <Card title="Net payroll trend (৳)"><Chart><LineChart data={pay} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} domain={['dataMin - 100000', 'dataMax + 100000']} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} /><Tooltip {...tip} formatter={(v: any) => money(v)} /><Line dataKey="net" stroke="#10b981" strokeWidth={2} /></LineChart></Chart></Card>
      </div></>
  }
  return (
    <>
      <PageHeader title="Reports" subtitle="Business performance across the company" actions={<button className="btn-secondary" onClick={() => void 0}>Export</button>} />
      <Tabs tabs={['Export', 'Production', 'Inventory', 'Procurement', 'HR']} active={kind === 'hr' ? 'HR' : kind === 'sales' ? 'Export' : kind[0].toUpperCase() + kind.slice(1)} onChange={(t) => nav(`/reports/${t === 'Export' ? 'sales' : t.toLowerCase()}`)} />
      {body}
    </>
  )
}
export { orderTotal, DataTable }
