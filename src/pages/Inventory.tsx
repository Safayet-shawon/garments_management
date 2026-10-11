import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Boxes, Lock, PackageCheck, Plus, Shirt, Warehouse as WhIcon, Layers } from 'lucide-react'
import { useStore, matStatus, fgStatus, reservedFor, orderStatus } from '../store'
import { Card, DataTable, Drawer, EmptyState, ErrorState, Money, PageHeader, ProgressBar, StatCard, StatusBadge, Tabs, fmt, fmtDate, money, Qty } from '../ui'
import type { Material } from '../data'

export function InventoryOverview() {
  const { s, a } = useStore()
  const fg = s.products.reduce((t, p) => t + p.stock, 0)
  const reservedFG = s.products.reduce((t, p) => t + reservedFor(s.orders, p.id), 0)
  const rmValue = s.materials.reduce((t, m) => t + m.onHand * m.unitCost, 0)
  const fgValue = s.products.reduce((t, p) => t + p.stock * (p.variants[0]?.purchase || 0), 0)
  const low = s.materials.filter((m) => matStatus(m) !== 'Healthy').length + s.products.filter((p) => fgStatus(p, reservedFor(s.orders, p.id)) !== 'Healthy').length
  if (s.inventoryError) return <><PageHeader title="Inventory Overview" /><ErrorState title="Unable to load inventory data." text="We couldn't reach the inventory service. Check your connection and try again." onRetry={() => { a.setInventoryError(false); a.toast('Inventory data loaded', 'success') }} /></>
  const byWh = s.warehouses.map((w) => ({ name: w.code, value: Math.round(s.materials.filter((m) => m.warehouse === w.code).reduce((t, m) => t + m.onHand * m.unitCost, 0) + (w.code === 'FG-WH' ? fgValue : 0)) }))
  return (
    <>
      <PageHeader title="Inventory Overview" subtitle="Raw materials and finished goods across all warehouses" actions={<><button className="btn-secondary" onClick={() => a.openModal('adjust')}>Adjust Inventory</button><button className="btn-primary" onClick={() => a.openModal('receive')}><Plus size={15} />Receive Material</button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Stock Value" value={<Money v={Math.round(rmValue + fgValue)} />} icon={<Boxes size={18} />} />
        <StatCard label="Available Stock" value={`${fmt(fg - reservedFG)} pcs`} sub="Finished goods" icon={<PackageCheck size={18} />} accent="green" to="/inventory/finished-goods" />
        <StatCard label="Reserved" value={`${fmt(reservedFG)} pcs`} sub="For buyer orders" icon={<Lock size={18} />} accent="blue" to="/inventory/reservations" />
        <StatCard label="Low Stock" value={low} sub="Items need action" icon={<AlertTriangle size={18} />} accent="red" to="/inventory/low-stock" />
        <StatCard label="Raw Materials" value={s.materials.length} sub={<Money v={Math.round(rmValue)} />} icon={<Layers size={18} />} to="/inventory/raw-materials" />
        <StatCard label="Finished Goods" value={`${fmt(fg)} pcs`} sub={`${s.products.length} products`} icon={<Shirt size={18} />} to="/inventory/finished-goods" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Stock value by warehouse (৳)" className="lg:col-span-2">
          <div className="h-64"><ResponsiveContainer><BarChart data={byWh} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} /><Tooltip formatter={(v: any) => money(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="value" fill="#4a67d6" radius={[4, 4, 0, 0]} maxBarSize={64} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Latest stock movements" action={<Link to="/inventory/movements" className="text-xs text-brand-600 hover:underline">View all</Link>} pad={false}>
          <ul className="divide-y divide-slate-100">{s.movements.slice(0, 6).map((m) => <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5"><div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{m.item}</div><div className="text-xs text-slate-500">{fmtDate(m.date)} · {m.ref}</div></div><div className="text-right"><div className={`text-sm font-semibold tabular-nums ${m.qty < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.qty > 0 ? '+' : ''}{fmt(m.qty)} {m.unit}</div></div></li>)}</ul>
        </Card>
      </div>
    </>
  )
}

export function RawMaterials() {
  const { s, a } = useStore()
  const [sel, setSel] = useState<Material | null>(null)
  const cur = sel && s.materials.find((m) => m.id === sel.id)
  return (
    <>
      <PageHeader title="Raw Materials" subtitle="Fabric, thread, labels and packaging on hand" actions={<><button className="btn-secondary" onClick={() => a.openModal('adjust')}>Adjust Inventory</button><button className="btn-primary" onClick={() => a.openModal('receive')}><Plus size={15} />Receive Material</button></>} />
      <DataTable rows={s.materials} rowKey={(m) => m.id} onRowClick={setSel} pageSize={10} searchPlaceholder="Search material or SKU…"
        filters={[{ label: 'Status', options: ['Critical', 'Low', 'Healthy'], get: matStatus }, { label: 'Warehouse', options: s.warehouses.map((w) => w.code), get: (m) => m.warehouse }]}
        columns={[
          { key: 'name', header: 'Material', sort: (m) => m.name, search: (m) => m.name, render: (m) => <b className="text-slate-900">{m.name}</b> },
          { key: 'sku', header: 'SKU', sort: (m) => m.sku, search: (m) => m.sku, render: (m) => <span className="font-mono text-xs">{m.sku}</span> },
          { key: 'wh', header: 'Warehouse', sort: (m) => m.warehouse, render: (m) => m.warehouse },
          { key: 'onHand', header: 'On Hand', align: 'right', sort: (m) => m.onHand, render: (m) => <Qty v={m.onHand} unit={m.unit} /> },
          { key: 'reserved', header: 'Reserved', align: 'right', sort: (m) => m.reserved, render: (m) => <Qty v={m.reserved} /> },
          { key: 'avail', header: 'Available', align: 'right', sort: (m) => m.onHand - m.reserved, render: (m) => <Qty v={m.onHand - m.reserved} /> },
          { key: 'value', header: 'Value', align: 'right', sort: (m) => m.onHand * m.unitCost, render: (m) => <Money v={Math.round(m.onHand * m.unitCost)} /> },
          { key: 'status', header: 'Status', sort: (m) => matStatus(m), render: (m) => <StatusBadge status={matStatus(m)} /> },
        ]}
        actions={(m) => [{ label: 'View', onClick: () => setSel(m) }, { label: 'Receive Material', onClick: () => a.openModal('receive', { materialId: m.id }) }, { label: 'Adjust Inventory', onClick: () => a.openModal('adjust', { materialId: m.id }) }, { label: 'Create Requirement', onClick: () => a.openModal('requirement', { materialId: m.id, qty: Math.max(m.reorder * 2 - m.onHand, m.reorder), reason: 'Reorder – below reorder level' }) }]}
      />
      {cur && (
        <Drawer title={cur.name} subtitle={<span className="font-mono">{cur.sku}</span>} onClose={() => setSel(null)}
          footer={<><button className="btn-secondary" onClick={() => a.openModal('adjust', { materialId: cur.id })}>Adjust Inventory</button><button className="btn-primary" onClick={() => a.openModal('receive', { materialId: cur.id })}>Receive Material</button></>}>
          <div className="mb-4 flex items-center gap-2"><StatusBadge status={matStatus(cur)} /><span className="text-sm text-slate-500">{cur.warehouse}</span></div>
          <div className="grid grid-cols-2 gap-3">{[['On hand', `${fmt(cur.onHand)} ${cur.unit}`], ['Reserved', fmt(cur.reserved)], ['Available', fmt(cur.onHand - cur.reserved)], ['Stock value', money(Math.round(cur.onHand * cur.unitCost))], ['Reorder level', fmt(cur.reorder)], ['Critical level', fmt(cur.critical)]].map(([l, v]) => <div key={l} className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold tabular-nums">{v}</div></div>)}</div>
          <div className="mt-4"><div className="mb-1 text-xs text-slate-500">Stock vs reorder level</div><ProgressBar value={(cur.onHand / (cur.reorder * 2)) * 100} color={matStatus(cur) === 'Healthy' ? 'brand' : matStatus(cur) === 'Low' ? 'amber' : 'red'} /></div>
          <h4 className="mb-2 mt-5 text-sm font-semibold">Recent movements</h4>
          {s.movements.filter((m) => m.sku === cur.sku).length ? <ul className="divide-y divide-slate-100">{s.movements.filter((m) => m.sku === cur.sku).slice(0, 6).map((m) => <li key={m.id} className="flex justify-between py-2 text-sm"><span><StatusBadge status={m.type} /> <span className="ml-1 text-xs text-slate-500">{fmtDate(m.date)} · {m.ref}</span></span><b className="tabular-nums">{m.qty > 0 ? '+' : ''}{fmt(m.qty)}</b></li>)}</ul> : <p className="text-sm text-slate-500">No movements recorded yet.</p>}
        </Drawer>
      )}
    </>
  )
}

export function FinishedGoods() {
  const { s } = useStore()
  const nav = useNavigate()
  return (
    <>
      <PageHeader title="Finished Goods" subtitle="Ready-to-sell garments in the Finished Goods Warehouse (Gazipur)" />
      <DataTable rows={s.products} rowKey={(p) => p.id} pageSize={10} onRowClick={(p) => nav(`/products/${p.id}`)} filters={[{ label: 'Status', options: ['Critical', 'Low', 'Healthy'], get: (p) => fgStatus(p, reservedFor(s.orders, p.id)) }]}
        columns={[
          { key: 'name', header: 'Product', sort: (p) => p.name, render: (p) => <b className="text-slate-900">{p.name}</b> },
          { key: 'sku', header: 'SKU Prefix', render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
          { key: 'v', header: 'Variants', sort: (p) => p.variants.length, render: (p) => p.variants.length },
          { key: 'stock', header: 'On Hand', align: 'right', sort: (p) => p.stock, render: (p) => <Qty v={p.stock} unit="pcs" /> },
          { key: 'res', header: 'Reserved', align: 'right', sort: (p) => reservedFor(s.orders, p.id), render: (p) => <Qty v={reservedFor(s.orders, p.id)} /> },
          { key: 'av', header: 'Available', align: 'right', sort: (p) => p.stock - reservedFor(s.orders, p.id), render: (p) => <Qty v={p.stock - reservedFor(s.orders, p.id)} /> },
          { key: 'val', header: 'Stock Value', align: 'right', sort: (p) => p.stock * (p.variants[0]?.purchase || 0), render: (p) => <Money v={p.stock * (p.variants[0]?.purchase || 0)} /> },
          { key: 'st', header: 'Status', render: (p) => <StatusBadge status={fgStatus(p, reservedFor(s.orders, p.id))} /> },
        ]} />
    </>
  )
}

export function Warehouses() {
  const { s, a } = useStore()
  return (
    <>
      <PageHeader title="Warehouses" subtitle="Storage locations for materials and finished goods" actions={<button className="btn-primary" onClick={() => a.openModal('warehouse')}><Plus size={15} />Add Warehouse</button>} />
      <DataTable rows={s.warehouses} rowKey={(w) => w.id} columns={[
        { key: 'code', header: 'Code', sort: (w) => w.code, render: (w) => <span className="font-mono text-xs font-semibold">{w.code}</span> },
        { key: 'name', header: 'Name', sort: (w) => w.name, render: (w) => <b className="text-slate-900">{w.name}</b> },
        { key: 'type', header: 'Type', sort: (w) => w.type },
        { key: 'loc', header: 'Location', sort: (w) => w.location },
        { key: 'value', header: 'Stock Value', align: 'right', sort: (w) => whValue(s, w.code), render: (w) => <Money v={whValue(s, w.code)} /> },
        { key: 'items', header: 'Active Items', align: 'right', sort: (w) => whItems(s, w.code), render: (w) => whItems(s, w.code) },
        { key: 'status', header: 'Status', render: (w) => <StatusBadge status={w.status} /> },
      ]} empty={<EmptyState title="No warehouses" action={<button className="btn-primary" onClick={() => a.openModal('warehouse')}>Add Warehouse</button>} />} />
    </>
  )
}
const whValue = (s: ReturnType<typeof useStore>['s'], code: string) => Math.round(s.materials.filter((m) => m.warehouse === code).reduce((t, m) => t + m.onHand * m.unitCost, 0) + (code === 'FG-WH' ? s.products.reduce((t, p) => t + p.stock * (p.variants[0]?.purchase || 0), 0) : 0))
const whItems = (s: ReturnType<typeof useStore>['s'], code: string) => s.materials.filter((m) => m.warehouse === code).length + (code === 'FG-WH' ? s.products.reduce((t, p) => t + p.variants.length, 0) : 0)

export function Movements() {
  const { s, a } = useStore()
  return (
    <>
      <PageHeader title="Stock Movements" subtitle="Every receipt, issue, adjustment and production transaction" actions={<><button className="btn-secondary" onClick={() => a.openModal('adjust')}>Adjust Inventory</button><button className="btn-primary" onClick={() => a.openModal('receive')}>Receive Material</button></>} />
      <DataTable rows={s.movements} rowKey={(m) => m.id} pageSize={12} searchPlaceholder="Search SKU, material or reference…" defaultSort={{ key: 'date', dir: -1 }}
        filters={[{ label: 'Type', options: ['RECEIPT', 'ISSUE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT'], get: (m) => m.type }, { label: 'Warehouse', options: s.warehouses.map((w) => w.code), get: (m) => m.warehouse }]}
        columns={[
          { key: 'date', header: 'Date', sort: (m) => m.date, render: (m) => fmtDate(m.date) },
          { key: 'sku', header: 'SKU', sort: (m) => m.sku, search: (m) => m.sku, render: (m) => <span className="font-mono text-xs">{m.sku}</span> },
          { key: 'item', header: 'Material', sort: (m) => m.item, search: (m) => m.item },
          { key: 'wh', header: 'Warehouse', sort: (m) => m.warehouse },
          { key: 'type', header: 'Type', sort: (m) => m.type, render: (m) => <StatusBadge status={m.type} /> },
          { key: 'qty', header: 'Quantity', align: 'right', sort: (m) => m.qty, render: (m) => <span className={`tabular-nums font-medium ${m.qty < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.qty > 0 ? '+' : ''}{fmt(m.qty)} {m.unit}</span> },
          { key: 'ref', header: 'Reference', search: (m) => m.ref, render: (m) => m.ref },
          { key: 'user', header: 'User', sort: (m) => m.user },
        ]} />
    </>
  )
}

export function Reservations() {
  const { s } = useStore()
  const rows = s.orders.filter((o) => !o.cancelled && o.step >= 4 && o.step <= 5).flatMap((o) => o.lines.map((l, i) => ({ id: `${o.id}-${i}`, order: o.id, customer: s.buyers.find((c) => c.id === o.buyer)?.name || '', product: s.products.find((p) => p.id === l.productId)?.name || '', sku: l.sku, qty: l.qty, status: orderStatus(o), date: o.date })))
  return (
    <>
      <PageHeader title="Reservations" subtitle="Finished goods allocated to buyer orders" />
      <DataTable rows={rows} rowKey={(r) => r.id} columns={[
        { key: 'order', header: 'Order', sort: (r) => r.order, render: (r) => <Link className="font-medium text-brand-600 hover:underline" to={`/merchandising/orders?open=${r.order}`}>{r.order}</Link>, search: (r) => r.order },
        { key: 'customer', header: 'Buyer', sort: (r) => r.customer, search: (r) => r.customer }, { key: 'product', header: 'Product', sort: (r) => r.product, search: (r) => r.product },
        { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span>, search: (r) => r.sku }, { key: 'qty', header: 'Reserved Qty', align: 'right', sort: (r) => r.qty, render: (r) => `${fmt(r.qty)} pcs` },
        { key: 'date', header: 'Order Date', sort: (r) => r.date, render: (r) => fmtDate(r.date) }, { key: 'st', header: 'Order Status', render: (r) => <StatusBadge status={r.status} /> },
      ]} empty={<EmptyState title="No active reservations" text="Stock is reserved when a buyer order reaches the 'Goods Allocated' step." />} />
    </>
  )
}

export function LowStock() {
  const { s, a } = useStore()
  const [tab, setTab] = useState('Critical')
  const rows = s.materials.map((m) => ({ m, st: matStatus(m) }))
  const counts = { Critical: rows.filter((r) => r.st === 'Critical').length, Low: rows.filter((r) => r.st === 'Low').length, Normal: rows.filter((r) => r.st === 'Healthy').length }
  const list = rows.filter((r) => (tab === 'Normal' ? r.st === 'Healthy' : r.st === tab))
  const pending = (id: string) => s.reqs.find((r) => r.materialId === id && r.status === 'Pending Purchase')
  return (
    <>
      <PageHeader title="Low Stock" subtitle="Materials at or below their reorder level" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Critical" value={counts.Critical} accent="red" icon={<AlertTriangle size={18} />} onClick={() => setTab('Critical')} />
        <StatCard label="Low" value={counts.Low} accent="amber" icon={<AlertTriangle size={18} />} onClick={() => setTab('Low')} />
        <StatCard label="Normal" value={counts.Normal} accent="green" icon={<PackageCheck size={18} />} onClick={() => setTab('Normal')} />
      </div>
      <Tabs tabs={['Critical', 'Low', 'Normal']} active={tab} onChange={setTab} />
      <DataTable rows={list} rowKey={(r) => r.m.id} pageSize={10} columns={[
        { key: 'name', header: 'Material', sort: (r) => r.m.name, search: (r) => r.m.name, render: (r) => <><b className="text-slate-900">{r.m.name}</b><div className="font-mono text-xs text-slate-400">{r.m.sku}</div></> },
        { key: 'on', header: 'On Hand', align: 'right', sort: (r) => r.m.onHand, render: (r) => <Qty v={r.m.onHand} unit={r.m.unit} /> },
        { key: 'ro', header: 'Reorder Level', align: 'right', sort: (r) => r.m.reorder, render: (r) => <Qty v={r.m.reorder} /> },
        { key: 'lvl', header: 'Stock Level', className: 'w-44', render: (r) => <ProgressBar value={(r.m.onHand / r.m.reorder) * 100} color={r.st === 'Critical' ? 'red' : r.st === 'Low' ? 'amber' : 'brand'} /> },
        { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.st} /> },
        { key: 'act', header: '', render: (r) => pending(r.m.id) ? <StatusBadge status="Pending Purchase" label="Requirement pending" /> : r.st !== 'Healthy' ? <button className="btn-primary btn-sm" onClick={() => a.openModal('requirement', { materialId: r.m.id, qty: Math.max(r.m.reorder * 2 - r.m.onHand, r.m.reorder), reason: 'Reorder – below reorder level' })}>Create Purchase Requirement</button> : null },
      ]} empty={<EmptyState title={`No ${tab.toLowerCase()} stock items`} text="Everything in this category is in good shape." />} />
    </>
  )
}
export { WhIcon }
