import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Plus, Star } from 'lucide-react'
import { useStore, poTotal, supplierName } from '../store'
import { PO_FLOW, type PO } from '../data'
import { Card, DataTable, Drawer, EmptyState, Money, PageHeader, StatCard, StatusBadge, Stepper, fmt, fmtDate, money, useConfirm, Qty } from '../ui'

export function ProcurementOverview() {
  const { s } = useStore()
  const c = (st: string) => s.pos.filter((p) => p.status === st).length
  return (
    <>
      <PageHeader title="Procurement" subtitle="From material shortage to goods received" actions={<Link to="/procurement/orders" className="btn-primary">Purchase Orders</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pending Requirements" value={s.reqs.filter((r) => r.status === 'Pending Purchase').length} accent="amber" to="/procurement/requirements" />
        <StatCard label="Draft POs" value={c('Draft')} to="/procurement/orders" />
        <StatCard label="Ordered" value={c('Ordered') + c('Approved')} accent="blue" to="/procurement/orders" />
        <StatCard label="Partially Received" value={c('Partially Received')} accent="amber" to="/procurement/receiving" />
        <StatCard label="Received" value={c('Received') + c('Closed')} accent="green" to="/procurement/orders" />
        <StatCard label="Total Purchase Value" value={<Money v={s.pos.reduce((t, p) => t + poTotal(p), 0)} />} />
      </div>
      <Card title="How purchasing flows" className="mt-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['Material Shortage', 'Purchase Requirement', 'Purchase Order', 'Supplier', 'Receiving', 'Inventory'].map((x, i, a) => <span key={x} className="flex items-center gap-2"><span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-700">{x}</span>{i < a.length - 1 && <ChevronRight size={16} className="text-slate-300" />}</span>)}
        </div>
      </Card>
      <Card title="Recent purchase orders" className="mt-4" pad={false} action={<Link to="/procurement/orders" className="text-xs text-brand-600 hover:underline">View all</Link>}>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">PO</th><th className="th">Supplier</th><th className="th">Expected</th><th className="th text-right">Total</th><th className="th">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{s.pos.slice(0, 5).map((p) => <tr key={p.id} className="hover:bg-slate-50"><td className="td"><Link className="font-medium text-brand-600" to={`/procurement/orders?open=${p.id}`}>{p.id}</Link></td><td className="td">{supplierName(s, p.supplierId)}</td><td className="td">{fmtDate(p.expected)}</td><td className="td text-right"><Money v={poTotal(p)} /></td><td className="td"><StatusBadge status={p.status} /></td></tr>)}</tbody></table></div>
      </Card>
    </>
  )
}

export function Suppliers() {
  const { s, a } = useStore()
  const { ask, el } = useConfirm()
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Fabric, thread, accessories and packaging partners" actions={<button className="btn-primary" onClick={() => a.openModal('supplier')}><Plus size={15} />Add Supplier</button>} />
      <DataTable rows={s.suppliers} rowKey={(x) => x.id} searchPlaceholder="Search suppliers…"
        filters={[{ label: 'Type', options: [...new Set(s.suppliers.map((x) => x.type))], get: (x) => x.type }, { label: 'Status', options: ['Active', 'Inactive'], get: (x) => x.status }]}
        columns={[
          { key: 'name', header: 'Supplier', sort: (x) => x.name, search: (x) => x.name, render: (x) => <b className="text-slate-900">{x.name}</b> },
          { key: 'type', header: 'Type', sort: (x) => x.type, search: (x) => x.type }, { key: 'contact', header: 'Contact', render: (x) => <div>{x.contact}<div className="text-xs text-slate-400">{x.phone}</div></div> },
          { key: 'loc', header: 'Location', sort: (x) => x.location, search: (x) => x.location },
          { key: 'spend', header: 'Total Spend', align: 'right', sort: (x) => s.pos.filter((p) => p.supplierId === x.id).reduce((t, p) => t + poTotal(p), 0), render: (x) => <Money v={s.pos.filter((p) => p.supplierId === x.id).reduce((t, p) => t + poTotal(p), 0)} /> },
          { key: 'rating', header: 'Rating', sort: (x) => x.rating, render: (x) => <span className="inline-flex items-center gap-1"><Star size={13} className="fill-amber-400 text-amber-400" />{x.rating.toFixed(1)}</span> },
          { key: 'status', header: 'Status', render: (x) => <StatusBadge status={x.status} /> },
        ]}
        actions={(x) => [{ label: 'Create Purchase Order', onClick: () => a.openModal('po') }, { label: x.status === 'Active' ? 'Deactivate' : 'Activate', onClick: () => ask({ title: `${x.status === 'Active' ? 'Deactivate' : 'Activate'} supplier?`, message: x.name, confirmLabel: x.status === 'Active' ? 'Deactivate' : 'Activate', danger: x.status === 'Active', onConfirm: () => a.toast(`${x.name} ${x.status === 'Active' ? 'deactivated' : 'activated'} (demo)`, 'info') }) }]} />
      {el}
    </>
  )
}

export function Requirements() {
  const { s, a } = useStore()
  return (
    <>
      <PageHeader title="Purchase Requirements" subtitle="Materials that need to be bought – convert them into purchase orders" actions={<button className="btn-primary" onClick={() => a.openModal('requirement')}><Plus size={15} />Create Purchase Requirement</button>} />
      <DataTable rows={s.reqs} rowKey={(r) => r.id} filters={[{ label: 'Status', options: ['Pending Purchase', 'PO Created'], get: (r) => r.status }, { label: 'Priority', options: ['Low', 'Normal', 'High', 'Urgent'], get: (r) => r.priority }]}
        columns={[
          { key: 'id', header: 'Requirement', sort: (r) => r.id, search: (r) => r.id, render: (r) => <b className="text-slate-900">{r.id}</b> },
          { key: 'mat', header: 'Material', sort: (r) => s.materials.find((m) => m.id === r.materialId)!.name, search: (r) => s.materials.find((m) => m.id === r.materialId)!.name, render: (r) => s.materials.find((m) => m.id === r.materialId)!.name },
          { key: 'qty', header: 'Quantity', align: 'right', sort: (r) => r.qty, render: (r) => <Qty v={r.qty} unit={s.materials.find((m) => m.id === r.materialId)!.unit} /> },
          { key: 'reason', header: 'Reason', search: (r) => r.reason, render: (r) => <span className="text-slate-600">{r.reason}</span> },
          { key: 'sup', header: 'Supplier', render: (r) => supplierName(s, r.supplierId) },
          { key: 'exp', header: 'Expected', sort: (r) => r.expected, render: (r) => fmtDate(r.expected) },
          { key: 'pri', header: 'Priority', sort: (r) => r.priority, render: (r) => <StatusBadge status={r.priority} /> },
          { key: 'st', header: 'Status', sort: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
          { key: 'a', header: '', render: (r) => r.status === 'Pending Purchase' ? <button className="btn-primary btn-sm" onClick={() => a.openModal('po', { reqId: r.id })}>Create Purchase Order</button> : <Link to={`/procurement/orders?open=${r.poId}`} className="text-xs text-brand-600 hover:underline">{r.poId}</Link> },
        ]} empty={<EmptyState title="No purchase requirements" text="Requirements appear here when materials run short." action={<button className="btn-primary" onClick={() => a.openModal('requirement')}>Create Purchase Requirement</button>} />} />
    </>
  )
}

export function PurchaseOrders() {
  const { s, a } = useStore()
  const [sp, setSp] = useSearchParams()
  const [openId, setOpenId] = useState<string | null>(sp.get('open'))
  useEffect(() => { if (sp.get('open')) { setOpenId(sp.get('open')); setSp({}, { replace: true }) } }, [sp, setSp])
  const { ask, el } = useConfirm()
  const po = s.pos.find((p) => p.id === openId)
  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Draft → Approved → Ordered → Received → Closed" actions={<button className="btn-primary" onClick={() => a.openModal('po')}><Plus size={15} />Create Purchase Order</button>} />
      <DataTable rows={s.pos} rowKey={(p) => p.id} onRowClick={(p) => setOpenId(p.id)} searchPlaceholder="Search PO or supplier…" defaultSort={{ key: 'id', dir: -1 }}
        filters={[{ label: 'Status', options: [...PO_FLOW], get: (p) => p.status }, { label: 'Supplier', options: s.suppliers.map((x) => x.name), get: (p) => supplierName(s, p.supplierId) }]}
        columns={[
          { key: 'id', header: 'PO', sort: (p) => p.id, search: (p) => p.id, render: (p) => <b className="text-brand-600">{p.id}</b> },
          { key: 'sup', header: 'Supplier', sort: (p) => supplierName(s, p.supplierId), search: (p) => supplierName(s, p.supplierId), render: (p) => supplierName(s, p.supplierId) },
          { key: 'items', header: 'Items', render: (p) => p.items.map((i) => s.materials.find((m) => m.id === i.materialId)?.name).join(', '), search: (p) => p.items.map((i) => s.materials.find((m) => m.id === i.materialId)?.name).join(' ') },
          { key: 'exp', header: 'Expected', sort: (p) => p.expected, render: (p) => fmtDate(p.expected) },
          { key: 'total', header: 'Total', align: 'right', sort: (p) => poTotal(p), render: (p) => <Money v={poTotal(p)} /> },
          { key: 'st', header: 'Status', sort: (p) => PO_FLOW.indexOf(p.status), render: (p) => <StatusBadge status={p.status} /> },
        ]} />
      {po && (
        <Drawer width="max-w-2xl" title={po.id} subtitle={`${supplierName(s, po.supplierId)} · expected ${fmtDate(po.expected)} · deliver to ${po.warehouse}`} onClose={() => setOpenId(null)}
          footer={<POActions po={po} ask={ask} close={() => setOpenId(null)} />}>
          <div className="mb-5 rounded-lg border border-slate-200 p-4"><Stepper steps={[...PO_FLOW].map((x) => x.replace('Partially Received', 'Part. Received'))} current={PO_FLOW.indexOf(po.status)} /></div>
          <div className="overflow-x-auto rounded-md border border-slate-200"><table className="w-full"><thead><tr><th className="th">Item</th><th className="th text-right">Ordered</th><th className="th text-right">Received</th><th className="th text-right">Unit price</th><th className="th text-right">Line total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{po.items.map((i) => { const m = s.materials.find((x) => x.id === i.materialId)!; return <tr key={i.materialId}><td className="td font-medium">{m.name}</td><td className="td text-right"><Qty v={i.qty} unit={m.unit} /></td><td className="td text-right"><Qty v={i.received} /></td><td className="td text-right tabular-nums">{money(i.price, i.price < 10 ? 2 : 0)}</td><td className="td text-right"><Money v={i.qty * i.price} /></td></tr> })}</tbody>
            <tfoot><tr className="border-t border-slate-200 bg-slate-50"><td colSpan={4} className="td text-right font-semibold">Total</td><td className="td text-right text-base font-semibold"><Money v={poTotal(po)} /></td></tr></tfoot></table></div>
          {po.notes && <p className="mt-4 text-sm text-slate-600"><b>Notes:</b> {po.notes}</p>}
          {po.reqId && <p className="mt-2 text-sm text-slate-500">Created from requirement {po.reqId}</p>}
        </Drawer>
      )}
      {el}
    </>
  )
}

function POActions({ po, ask, close }: { po: PO; ask: ReturnType<typeof useConfirm>['ask']; close: () => void }) {
  const { a } = useStore()
  const nav = useNavigate()
  return (
    <>
      <button className="btn-secondary" onClick={close}>Close</button>
      {po.status === 'Draft' && <button className="btn-primary" onClick={() => ask({ title: 'Approve Purchase Order?', message: `${po.id} will be approved and can then be sent to the supplier.`, confirmLabel: 'Approve', onConfirm: () => a.setPOStatus(po.id, 'Approved') })}><Check size={14} />Approve</button>}
      {po.status === 'Approved' && <button className="btn-primary" onClick={() => ask({ title: 'Mark as Ordered?', message: `${po.id} will be marked as sent to the supplier.`, confirmLabel: 'Mark as Ordered', onConfirm: () => a.setPOStatus(po.id, 'Ordered') })}>Mark as Ordered</button>}
      {(po.status === 'Ordered' || po.status === 'Partially Received') && <button className="btn-primary" onClick={() => a.openModal('receive', { poId: po.id })}>Receive Material</button>}
      {po.status === 'Received' && <button className="btn-primary" onClick={() => ask({ title: 'Close Purchase Order?', message: 'All items have been received. The PO will be closed.', confirmLabel: 'Close PO', onConfirm: () => a.setPOStatus(po.id, 'Closed') })}>Close PO</button>}
      {po.status === 'Received' && <button className="btn-secondary" onClick={() => { close(); nav('/inventory/raw-materials') }}>View inventory <ArrowRight size={14} /></button>}
    </>
  )
}

export function Receiving() {
  const { s, a } = useStore()
  const open = s.pos.filter((p) => p.status === 'Ordered' || p.status === 'Partially Received')
  const receipts = s.movements.filter((m) => m.type === 'RECEIPT')
  return (
    <>
      <PageHeader title="Receiving" subtitle="Goods expected from suppliers and recent receipts" actions={<button className="btn-primary" onClick={() => a.openModal('receive')}>Receive Material</button>} />
      <Card title="Awaiting delivery" pad={false} className="mb-4">
        {open.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">PO</th><th className="th">Supplier</th><th className="th">Pending items</th><th className="th">Expected</th><th className="th">Status</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">{open.map((p) => <tr key={p.id}><td className="td font-medium text-brand-600">{p.id}</td><td className="td">{supplierName(s, p.supplierId)}</td><td className="td">{p.items.filter((i) => i.received < i.qty).map((i) => `${s.materials.find((m) => m.id === i.materialId)?.name} (${fmt(i.qty - i.received)})`).join(', ')}</td><td className="td">{fmtDate(p.expected)}</td><td className="td"><StatusBadge status={p.status} /></td><td className="td text-right"><button className="btn-primary btn-sm" onClick={() => a.openModal('receive', { poId: p.id })}>Receive Material</button></td></tr>)}</tbody></table></div>
          : <EmptyState title="Nothing awaiting delivery" text="Approve and place a purchase order to expect goods here." action={<Link to="/procurement/orders" className="btn-primary">Purchase Orders</Link>} />}
      </Card>
      <Card title="Recent receipts" pad={false}>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Date</th><th className="th">Material</th><th className="th">Warehouse</th><th className="th text-right">Quantity</th><th className="th">Reference</th><th className="th">Received by</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{receipts.slice(0, 8).map((m) => <tr key={m.id}><td className="td">{fmtDate(m.date)}</td><td className="td font-medium">{m.item}</td><td className="td">{m.warehouse}</td><td className="td text-right text-emerald-600 tabular-nums">+{fmt(m.qty)} {m.unit}</td><td className="td">{m.ref}</td><td className="td">{m.user}</td></tr>)}</tbody></table></div>
      </Card>
    </>
  )
}
