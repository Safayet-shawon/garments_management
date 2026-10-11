import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Anchor, Globe, Package, Plus, Ship, TrendingUp, Users, Briefcase } from 'lucide-react'
import { useStore, empName, orderStatus, orderTotal, reservedFor, type State } from '../store'
import { ORDER_FLOW, TODAY, type Order } from '../data'
import { Card, DataTable, Drawer, EmptyState, PageHeader, StatCard, StatusBadge, Timeline, Usd, fmt, fmtDate, usd, useConfirm, Money } from '../ui'

const ACTION = ['Approve Sample', 'Book Materials', 'Start Production', 'Allocate Finished Goods', 'Mark as Packed', 'Ship Order (Ex-factory)', 'Confirm Payment Received']
const qtyOf = (o: Order) => o.lines.reduce((t, l) => t + l.qty, 0)
const countryName = (s: State, code: string) => s.countries.find((c) => c.code === code)?.name || code
const buyerName = (s: State, id: string) => s.buyers.find((b) => b.id === id)?.name || id
const styleNames = (s: State, o: Order) => [...new Set(o.lines.map((l) => s.products.find((p) => p.id === l.productId)?.name || ''))]
const CC = ({ code }: { code: string }) => <span className="mr-1.5 rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-600">{code}</span>
const live = (s: State) => s.orders.filter((o) => !o.cancelled)

export function MerchDashboard() {
  const { s } = useStore()
  const inHand = live(s).filter((o) => o.step < 6)
  const due = inHand.filter((o) => o.shipDate <= '2026-10-31')
  const byCountry = useMemo(() => s.countries.map((c) => ({ name: c.name.replace('United Kingdom', 'UK').replace('United States', 'USA').replace('United Arab Emirates', 'UAE'), value: Math.round(live(s).filter((o) => o.country === c.code).reduce((t, o) => t + orderTotal(o), 0)) })).filter((x) => x.value).sort((a, b) => b.value - a.value), [s])
  const merch = [...new Set(s.buyers.map((b) => b.merchandiser))].map((id) => ({ id, orders: live(s).filter((o) => o.merchandiser === id), buyers: s.buyers.filter((b) => b.merchandiser === id).length }))
  const upcoming = [...inHand].sort((a, b) => a.shipDate.localeCompare(b.shipDate)).slice(0, 5)
  return (
    <>
      <PageHeader title="Merchandising" subtitle="Buyers, purchase orders and export shipments across all destination countries" actions={<><Link to="/merchandising/buyers" className="btn-secondary">Buyers</Link><Link to="/merchandising/orders" className="btn-primary">Buyer Orders</Link></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Orders in Hand" value={inHand.length} sub={`${fmt(inHand.reduce((t, o) => t + qtyOf(o), 0))} pcs`} icon={<Package size={18} />} to="/merchandising/orders" />
        <StatCard label="Order Value in Hand" value={<Usd v={Math.round(inHand.reduce((t, o) => t + orderTotal(o), 0))} />} icon={<TrendingUp size={18} />} accent="green" />
        <StatCard label="Ship by 31 Oct" value={due.length} sub="orders due" icon={<Ship size={18} />} accent="amber" to="/merchandising/shipments" />
        <StatCard label="Active Buyers" value={s.buyers.filter((b) => b.status === 'Active').length} icon={<Users size={18} />} to="/merchandising/buyers" />
        <StatCard label="Countries" value={new Set(s.buyers.map((b) => b.country)).size} sub={`${s.countries.length} on file`} icon={<Globe size={18} />} accent="blue" to="/merchandising/countries" />
        <StatCard label="Shipped (Month)" value={<Usd v={Math.round(s.orders.filter((o) => o.step >= 6 && !o.cancelled).reduce((t, o) => t + orderTotal(o), 0))} />} icon={<Anchor size={18} />} accent="green" />
      </div>
      <Card title="Order lifecycle" className="mt-4" action={<span className="text-xs text-slate-400">Buyer PO → shipment → payment</span>}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {ORDER_FLOW.map((st, i) => { const n = live(s).filter((o) => o.step === i).length; return (
            <Link to="/merchandising/orders" key={st} className={`rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${n ? 'border-gold-400/60 bg-gold-50' : 'border-slate-200 bg-white'}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{i + 1}. {st}</div><div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{n}</div>
            </Link>) })}
        </div>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Export value by destination (USD)" className="lg:col-span-2">
          <div className="h-72"><ResponsiveContainer><BarChart data={byCountry} margin={{ left: -5 }}><CartesianGrid stroke="#eef2f7" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: any) => `$${v / 1000}k`} /><Tooltip formatter={(v: any) => usd(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} /><Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={52}>{byCountry.map((_, i) => <Cell key={i} fill={i === 0 ? '#d4a21f' : '#4a67d6'} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Next shipments" pad={false} action={<Link to="/merchandising/shipments" className="text-xs text-brand-600 hover:underline">All</Link>}>
          <ul className="divide-y divide-slate-100">{upcoming.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium text-slate-900">{buyerName(s, o.buyer)}</div><div className="text-xs text-slate-500"><CC code={o.country} />{o.id} · {fmt(qtyOf(o))} pcs</div></div><div className="text-right"><div className="text-sm font-semibold">{fmtDate(o.shipDate)}</div><StatusBadge status={orderStatus(o)} /></div></li>)}</ul>
        </Card>
      </div>
      <Card title="Merchandiser workload" className="mt-4" pad={false}>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Merchandiser</th><th className="th text-right">Buyers</th><th className="th text-right">Open orders</th><th className="th text-right">Pieces</th><th className="th text-right">Order value</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{merch.map((m) => <tr key={m.id}><td className="td"><span className="flex items-center gap-2"><Briefcase size={14} className="text-gold-500" /><b className="text-slate-900">{empName(s, m.id)}</b></span></td><td className="td text-right">{m.buyers}</td><td className="td text-right">{m.orders.filter((o) => o.step < 6).length}</td><td className="td text-right tabular-nums">{fmt(m.orders.reduce((t, o) => t + qtyOf(o), 0))}</td><td className="td text-right"><Usd v={Math.round(m.orders.reduce((t, o) => t + orderTotal(o), 0))} /></td></tr>)}</tbody></table></div>
      </Card>
    </>
  )
}

export function Buyers() {
  const { s, a } = useStore()
  return (
    <>
      <PageHeader title="Buyers" subtitle="International buyers, their destination country and assigned merchandiser" actions={<button className="btn-primary" onClick={() => a.openModal('buyer')}><Plus size={15} />Add Buyer</button>} />
      <DataTable rows={s.buyers} rowKey={(b) => b.id} searchPlaceholder="Search buyer, country, merchandiser…"
        filters={[{ label: 'Country', options: [...new Set(s.buyers.map((b) => countryName(s, b.country)))], get: (b) => countryName(s, b.country) }, { label: 'Type', options: [...new Set(s.buyers.map((b) => b.type))], get: (b) => b.type }]}
        columns={[
          { key: 'n', header: 'Buyer', sort: (b) => b.name, search: (b) => b.name, render: (b) => <div><b className="text-slate-900">{b.name}</b><div className="text-xs text-slate-400">{b.contact} · {b.email}</div></div> },
          { key: 'c', header: 'Country', sort: (b) => countryName(s, b.country), search: (b) => countryName(s, b.country), render: (b) => <span><CC code={b.country} />{countryName(s, b.country)}</span> },
          { key: 't', header: 'Type', sort: (b) => b.type, search: (b) => b.type },
          { key: 'm', header: 'Merchandiser', sort: (b) => empName(s, b.merchandiser), search: (b) => empName(s, b.merchandiser), render: (b) => empName(s, b.merchandiser) },
          { key: 'p', header: 'Payment Terms', render: (b) => b.term },
          { key: 'o', header: 'Orders', align: 'right', sort: (b) => s.orders.filter((o) => o.buyer === b.id).length, render: (b) => s.orders.filter((o) => o.buyer === b.id).length },
          { key: 'v', header: 'Order Value', align: 'right', sort: (b) => live(s).filter((o) => o.buyer === b.id).reduce((t, o) => t + orderTotal(o), 0), render: (b) => <Usd v={Math.round(live(s).filter((o) => o.buyer === b.id).reduce((t, o) => t + orderTotal(o), 0))} /> },
          { key: 's', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
        ]}
        actions={(b) => [{ label: 'Create Buyer Order', onClick: () => a.openModal('order', { buyer: b.id }) }]}
        empty={<EmptyState title="No buyers yet" action={<button className="btn-primary" onClick={() => a.openModal('buyer')}>Add Buyer</button>} />} />
    </>
  )
}

export function BuyerOrders() {
  const { s, a } = useStore()
  const [sp, setSp] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(sp.get('open'))
  useEffect(() => { if (sp.get('open')) { setOpenId(sp.get('open')); setSp({}, { replace: true }) } }, [sp, setSp])
  const { ask, el } = useConfirm()
  const o = s.orders.find((x) => x.id === openId)
  return (
    <>
      <PageHeader title="Buyer Orders" subtitle="Purchase orders from buyers – from sample approval to payment" actions={<button className="btn-primary" onClick={() => a.openModal('order')}><Plus size={15} />Create Buyer Order</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {['Sampling', 'In Production', 'Ready to Ship', 'Shipped', 'Completed'].map((st) => <StatCard key={st} label={st} value={s.orders.filter((x) => orderStatus(x) === st).length} />)}
      </div>
      <DataTable rows={s.orders} rowKey={(x) => x.id} onRowClick={(x) => setOpenId(x.id)} searchPlaceholder="Search order, buyer PO, buyer…" defaultSort={{ key: 'id', dir: -1 }}
        filters={[{ label: 'Status', options: ['Sampling', 'In Production', 'Ready to Ship', 'Shipped', 'Completed', 'Cancelled'], get: orderStatus }, { label: 'Country', options: [...new Set(s.orders.map((x) => countryName(s, x.country)))], get: (x) => countryName(s, x.country) }, { label: 'Merchandiser', options: [...new Set(s.orders.map((x) => empName(s, x.merchandiser)))], get: (x) => empName(s, x.merchandiser) }]}
        columns={[
          { key: 'id', header: 'Order', sort: (x) => x.id, search: (x) => x.id + x.buyerPO, render: (x) => <div><b className="text-brand-600">{x.id}</b><div className="text-xs text-slate-400">{x.buyerPO}</div></div> },
          { key: 'b', header: 'Buyer', sort: (x) => buyerName(s, x.buyer), search: (x) => buyerName(s, x.buyer), render: (x) => buyerName(s, x.buyer) },
          { key: 'c', header: 'Destination', sort: (x) => countryName(s, x.country), search: (x) => countryName(s, x.country), render: (x) => <span><CC code={x.country} />{countryName(s, x.country)}</span> },
          { key: 'st', header: 'Styles', search: (x) => styleNames(s, x).join(' '), render: (x) => <span>{styleNames(s, x)[0]}{styleNames(s, x).length > 1 && <span className="ml-1 text-xs text-slate-400">+{styleNames(s, x).length - 1}</span>}</span> },
          { key: 'q', header: 'Qty (pcs)', align: 'right', sort: qtyOf, render: (x) => fmt(qtyOf(x)) },
          { key: 'v', header: 'Value (FOB)', align: 'right', sort: orderTotal, render: (x) => <Usd v={Math.round(orderTotal(x))} /> },
          { key: 'sd', header: 'Ship Date', sort: (x) => x.shipDate, render: (x) => fmtDate(x.shipDate) },
          { key: 'm', header: 'Merchandiser', sort: (x) => empName(s, x.merchandiser), render: (x) => empName(s, x.merchandiser) },
          { key: 's', header: 'Status', sort: orderStatus, render: (x) => <StatusBadge status={orderStatus(x)} /> },
        ]} />
      {o && (
        <Drawer width="max-w-3xl" title={`${o.id} · ${buyerName(s, o.buyer)}`} subtitle={`Buyer PO ${o.buyerPO} · ${countryName(s, o.country)} · ship by ${fmtDate(o.shipDate)}`} onClose={() => setOpenId(null)}
          footer={<>
            <button className="btn-secondary" onClick={() => setOpenId(null)}>Close</button>
            {!o.cancelled && o.step < 6 && <button className="btn-danger" onClick={() => ask({ title: 'Cancel Buyer Order?', message: `${o.id} will be cancelled and any allocated finished goods released.`, confirmLabel: 'Cancel Order', danger: true, onConfirm: () => a.cancelOrder(o.id) })}>Cancel Order</button>}
            {!o.cancelled && o.step < 7 && <button className="btn-primary" onClick={() => a.advanceOrder(o.id)}>{ACTION[o.step]}</button>}
          </>}>
          <div className="mb-4 flex flex-wrap items-center gap-2"><StatusBadge status={orderStatus(o)} /><span className="text-sm text-slate-500">Payment: <b>{o.term}</b></span><span className="text-sm text-slate-500">Merchandiser: <b>{empName(s, o.merchandiser)}</b></span></div>
          <div className="grid gap-5 md:grid-cols-5">
            <div className="md:col-span-3">
              <div className="overflow-x-auto rounded-md border border-slate-200"><table className="w-full"><thead><tr><th className="th">Style / Variant</th><th className="th text-right">Qty</th><th className="th text-right">FOB</th><th className="th text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{o.lines.map((l, i) => <tr key={i}><td className="td"><div className="font-medium text-slate-900">{s.products.find((p) => p.id === l.productId)?.name}</div><div className="text-xs text-slate-400">{l.variant} · <span className="font-mono">{l.sku}</span></div></td><td className="td text-right">{fmt(l.qty)}</td><td className="td text-right tabular-nums">{usd(l.price, 2)}</td><td className="td text-right"><Usd v={Math.round(l.qty * l.price)} /></td></tr>)}</tbody>
                <tfoot><tr className="bg-slate-50"><td className="td font-semibold">Total</td><td className="td text-right font-semibold">{fmt(qtyOf(o))}</td><td className="td" /><td className="td text-right font-semibold"><Usd v={Math.round(orderTotal(o))} /></td></tr></tfoot></table></div>
              <div className="mt-2 text-xs text-slate-500">≈ <Money v={Math.round(orderTotal(o) * 120)} /> at ৳ 120 / USD</div>
              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <div className="mb-2 text-xs font-medium uppercase text-slate-500">Finished goods coverage</div>
                {[...new Set(o.lines.map((l) => l.productId))].map((pid) => { const p = s.products.find((x) => x.id === pid)!; const need = o.lines.filter((l) => l.productId === pid).reduce((t, l) => t + l.qty, 0); const avail = p.stock - reservedFor(s.orders.filter((x) => x.id !== o.id), pid); return <div key={pid} className="flex items-center justify-between py-1 text-sm"><span>{p.name}</span><span className={avail >= need ? 'text-emerald-600' : 'text-amber-600'}>{fmt(avail)} available / {fmt(need)} needed</span></div> })}
                <Link to="/manufacturing/plans/new" className="mt-2 inline-block text-xs text-brand-600 hover:underline">Need more? Create a production plan →</Link>
              </div>
            </div>
            <div className="md:col-span-2"><div className="mb-3 text-xs font-medium uppercase text-slate-500">Order timeline</div>
              {o.cancelled ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">This order was cancelled.</div> : <Timeline steps={[...ORDER_FLOW]} current={Math.min(8, o.step + 1)} />}</div>
          </div>
        </Drawer>
      )}
      {el}
    </>
  )
}

export function Shipments() {
  const { s } = useStore()
  const rows = live(s).filter((o) => o.step >= 4).map((o) => ({ o, id: `SH-${o.id.slice(-4)}`, cartons: Math.ceil(qtyOf(o) / 48), mode: qtyOf(o) < 400 ? 'Air' : 'Sea', port: s.countries.find((c) => c.code === o.country)?.port || '', status: o.step >= 6 ? (o.step === 7 ? 'Delivered' : 'Shipped') : 'Ready to Ship' }))
  return (
    <>
      <PageHeader title="Shipments" subtitle="Packed and shipped export consignments" />
      <div className="mb-4 grid grid-cols-3 gap-3"><StatCard label="Ready to Ship" value={rows.filter((r) => r.status === 'Ready to Ship').length} accent="amber" icon={<Package size={18} />} /><StatCard label="On the Way" value={rows.filter((r) => r.status === 'Shipped').length} accent="blue" icon={<Ship size={18} />} /><StatCard label="Delivered" value={rows.filter((r) => r.status === 'Delivered').length} accent="green" icon={<Anchor size={18} />} /></div>
      <DataTable rows={rows} rowKey={(r) => r.id} filters={[{ label: 'Status', options: ['Ready to Ship', 'Shipped', 'Delivered'], get: (r) => r.status }, { label: 'Mode', options: ['Sea', 'Air'], get: (r) => r.mode }]} searchPlaceholder="Search shipment, buyer…"
        columns={[
          { key: 'id', header: 'Shipment', sort: (r) => r.id, search: (r) => r.id, render: (r) => <b className="text-slate-900">{r.id}</b> },
          { key: 'o', header: 'Order', render: (r) => <Link className="text-brand-600 hover:underline" to={`/merchandising/orders?open=${r.o.id}`}>{r.o.id}</Link> },
          { key: 'b', header: 'Buyer', sort: (r) => buyerName(s, r.o.buyer), search: (r) => buyerName(s, r.o.buyer), render: (r) => buyerName(s, r.o.buyer) },
          { key: 'd', header: 'Destination', search: (r) => countryName(s, r.o.country), render: (r) => <span><CC code={r.o.country} />{countryName(s, r.o.country)} <span className="text-xs text-slate-400">via {r.port}</span></span> },
          { key: 'q', header: 'Qty', align: 'right', sort: (r) => qtyOf(r.o), render: (r) => `${fmt(qtyOf(r.o))} pcs` },
          { key: 'c', header: 'Cartons', align: 'right', render: (r) => fmt(r.cartons) },
          { key: 'v', header: 'Invoice Value', align: 'right', sort: (r) => orderTotal(r.o), render: (r) => <Usd v={Math.round(orderTotal(r.o))} /> },
          { key: 'e', header: 'ETD', sort: (r) => r.o.shipDate, render: (r) => fmtDate(r.o.shipDate) },
          { key: 'm', header: 'Mode', render: (r) => r.mode },
          { key: 's', header: 'Status', sort: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
        ]} empty={<EmptyState title="No shipments yet" text="Orders appear here once finished goods are allocated and packed." />} />
    </>
  )
}

export function Countries() {
  const { s, a } = useStore()
  return (
    <>
      <PageHeader title="Countries" subtitle="Destination countries, currencies and ports" actions={<button className="btn-primary" onClick={() => a.openModal('country')}><Plus size={15} />Add Country</button>} />
      <DataTable rows={s.countries} rowKey={(c) => c.code} searchPlaceholder="Search country, region…" filters={[{ label: 'Region', options: [...new Set(s.countries.map((c) => c.region))], get: (c) => c.region }]}
        columns={[
          { key: 'code', header: 'Code', sort: (c) => c.code, render: (c) => <CC code={c.code} /> },
          { key: 'n', header: 'Country', sort: (c) => c.name, search: (c) => c.name, render: (c) => <b className="text-slate-900">{c.name}</b> },
          { key: 'r', header: 'Region', sort: (c) => c.region, search: (c) => c.region },
          { key: 'cur', header: 'Currency', render: (c) => c.currency }, { key: 'p', header: 'Main Port', render: (c) => c.port },
          { key: 'b', header: 'Buyers', align: 'right', sort: (c) => s.buyers.filter((b) => b.country === c.code).length, render: (c) => s.buyers.filter((b) => b.country === c.code).length },
          { key: 'o', header: 'Orders', align: 'right', sort: (c) => s.orders.filter((o) => o.country === c.code).length, render: (c) => s.orders.filter((o) => o.country === c.code).length },
          { key: 'v', header: 'Export Value', align: 'right', sort: (c) => live(s).filter((o) => o.country === c.code).reduce((t, o) => t + orderTotal(o), 0), render: (c) => <Usd v={Math.round(live(s).filter((o) => o.country === c.code).reduce((t, o) => t + orderTotal(o), 0))} /> },
        ]} />
    </>
  )
}
export { TODAY }
