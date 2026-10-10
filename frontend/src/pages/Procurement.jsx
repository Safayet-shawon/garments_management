import { useState } from 'react';
import { DataTable, FormModal, Loading, Modal, PageHead, Pill } from '../components/ui.jsx';
import { Hub } from './Hub.jsx';
import { api } from '../api.js';
import { useAction, useFetch } from '../hooks.js';
import { bdt, num } from '../format.js';

export const ProcurementHub = () => (
  <Hub title="Procurement" sub="Suppliers, purchase requirements and orders" cards={[
    ['/procurement/suppliers', 'Suppliers', 'Vendor directory and ratings'],
    ['/procurement/requirements', 'Purchase Requirements', 'Materials that need buying'],
    ['/procurement/orders', 'Purchase Orders', 'Draft, approve and track orders'],
    ['/procurement/receiving', 'Receiving', 'Goods received against POs'],
  ]} />
);

export function Suppliers() {
  const st = useFetch('/procurement/suppliers');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Suppliers"><button className="btn primary" onClick={() => setOpen(true)}>+ Add supplier</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['name', 'contact', 'location']} filters={[{ key: 'type', label: 'All types' }]} columns={[
        { label: 'Supplier', render: (s) => <b>{s.name}</b> }, { key: 'type', label: 'Type' }, { key: 'contact', label: 'Contact' }, { key: 'phone', label: 'Phone' },
        { key: 'location', label: 'Location' }, { label: 'Rating', render: (s) => `★ ${s.rating}` }, { label: 'Status', render: (s) => <Pill>{s.status}</Pill> },
        { label: '', render: (s) => <button className="btn sm" onClick={() => run(() => api.put(`/procurement/suppliers/${s.id}`, { status: s.status === 'Active' ? 'Inactive' : 'Active' }), 'Supplier updated')}>{s.status === 'Active' ? 'Deactivate' : 'Activate'}</button> },
      ]} />}
      {open && <FormModal title="Add supplier" onClose={() => setOpen(false)}
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'type', label: 'Type', type: 'select', required: true, options: ['Fabric Manufacturer', 'Fabric Supplier', 'Accessories Supplier', 'Packaging Supplier', 'Thread Supplier'] },
          { name: 'contact', label: 'Contact person' }, { name: 'phone', label: 'Phone' }, { name: 'location', label: 'Location' }, { name: 'rating', label: 'Rating (0–5)', type: 'number', default: 4 }]}
        onSubmit={async (v) => (await run(() => api.post('/procurement/suppliers', v), 'Supplier added')) !== null} />}
    </>
  );
}

export function PurchaseRequirements() {
  const st = useFetch('/procurement/requirements');
  const mats = useFetch('/inventory/materials');
  const sups = useFetch('/procurement/suppliers');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  const [po, setPo] = useState(null);
  const price = (id) => mats.data?.find((m) => m.id === id)?.unit_cost ?? 0;
  return (
    <>
      <PageHead title="Purchase Requirements"><button className="btn primary" onClick={() => setOpen(true)}>+ New requirement</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['id', 'material', 'reason']} filters={[{ key: 'status', label: 'All statuses' }, { key: 'priority', label: 'All priorities' }]} columns={[
        { label: 'ID', render: (r) => <b>{r.id}</b> }, { key: 'material', label: 'Material' }, { label: 'Qty', align: 'right', render: (r) => `${num(r.qty)} ${r.unit}` },
        { key: 'reason', label: 'Reason' }, { key: 'expected', label: 'Needed by' }, { label: 'Priority', render: (r) => <Pill>{r.priority}</Pill> }, { label: 'Status', render: (r) => <Pill>{r.status}</Pill> },
        { label: '', render: (r) => r.status === 'Pending Purchase' ? <button className="btn sm primary" onClick={() => setPo(r)}>Create PO</button> : r.po_id },
      ]} />}
      {open && <FormModal title="New purchase requirement" onClose={() => setOpen(false)}
        fields={[{ name: 'material_id', label: 'Material', type: 'select', required: true, options: (mats.data || []).map((m) => [m.id, m.name]) }, { name: 'qty', label: 'Quantity', type: 'number', required: true },
          { name: 'reason', label: 'Reason' }, { name: 'supplier_id', label: 'Preferred supplier', type: 'select', options: (sups.data || []).map((s) => [s.id, s.name]) },
          { name: 'expected', label: 'Needed by', type: 'date' }, { name: 'priority', label: 'Priority', type: 'select', default: 'Normal', options: ['Low', 'Normal', 'High'] }]}
        onSubmit={async (v) => (await run(() => api.post('/procurement/requirements', v), 'Requirement saved as Pending Purchase')) !== null} />}
      {po && <FormModal title={`Create PO from ${po.id}`} submitLabel="Create draft PO" onClose={() => setPo(null)}
        initial={{ supplier_id: po.supplier_id, qty: po.qty, price: price(po.material_id), expected: po.expected }}
        fields={[{ name: 'supplier_id', label: 'Supplier', type: 'select', required: true, options: (sups.data || []).map((s) => [s.id, s.name]) }, { name: 'qty', label: `Quantity (${po.unit})`, type: 'number', required: true },
          { name: 'price', label: 'Unit price', type: 'number', required: true }, { name: 'expected', label: 'Expected delivery', type: 'date' }]}
        onSubmit={async (v) => (await run(() => api.post('/procurement/orders', { supplier_id: v.supplier_id, expected: v.expected, req_id: po.id, items: [{ material_id: po.material_id, qty: v.qty, price: v.price }] }), 'Purchase order created as Draft')) !== null} />}
    </>
  );
}

const NEXT = { Draft: 'Approved', Approved: 'Ordered', Ordered: null, Received: 'Closed' };
export function PurchaseOrders() {
  const st = useFetch('/procurement/orders');
  const mats = useFetch('/inventory/materials');
  const run = useAction(st.reload);
  const [view, setView] = useState(null);
  const name = (id) => mats.data?.find((m) => m.id === id)?.name ?? id;
  return (
    <>
      <PageHead title="Purchase Orders" />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['id', 'supplier']} filters={[{ key: 'status', label: 'All statuses' }]} onRowClick={setView} columns={[
        { label: 'PO', render: (p) => <b>{p.id}</b> }, { key: 'supplier', label: 'Supplier' }, { label: 'Items', render: (p) => p.items.length },
        { label: 'Total', align: 'right', render: (p) => bdt(p.total) }, { key: 'expected', label: 'Expected' }, { label: 'Status', render: (p) => <Pill>{p.status}</Pill> },
        { label: '', render: (p) => NEXT[p.status] ? <button className="btn sm" onClick={(e) => { e.stopPropagation(); run(() => api.put(`/procurement/orders/${p.id}/status`, { status: NEXT[p.status] }), `Purchase order ${NEXT[p.status].toLowerCase()}`); }}>Mark {NEXT[p.status]}</button> : null },
      ]} />}
      {view && (
        <Modal title={`${view.id} · ${view.supplier}`} onClose={() => setView(null)}>
          <table>
            <thead><tr><th>Material</th><th className="right">Ordered</th><th className="right">Received</th><th className="right">Price</th></tr></thead>
            <tbody>{view.items.map((i) => <tr key={i.material_id}><td>{name(i.material_id)}</td><td className="right">{num(i.qty)}</td><td className="right">{num(i.received)}</td><td className="right">{bdt(i.price)}</td></tr>)}</tbody>
          </table>
          {view.notes && <p className="muted">{view.notes}</p>}
          <div className="actions"><button className="btn" onClick={() => setView(null)}>Close</button></div>
        </Modal>
      )}
    </>
  );
}

export function Receiving() {
  const st = useFetch('/procurement/orders');
  const mats = useFetch('/inventory/materials');
  const run = useAction(st.reload);
  const [rec, setRec] = useState(null);
  const open = (st.data || []).filter((p) => ['Ordered', 'Partially Received', 'Approved'].includes(p.status));
  const name = (id) => mats.data?.find((m) => m.id === id)?.name ?? id;
  const lines = open.flatMap((p) => p.items.filter((i) => i.received < i.qty).map((i) => ({ id: `${p.id}-${i.material_id}`, po: p, ...i })));
  return (
    <>
      <PageHead title="Receiving" sub="Goods due against open purchase orders" />
      <Loading state={st} />
      {st.data && <DataTable rows={lines} empty="Nothing waiting to be received" columns={[
        { label: 'PO', render: (l) => <b>{l.po.id}</b> }, { key: 'supplier', label: 'Supplier', render: (l) => l.po.supplier }, { label: 'Material', render: (l) => name(l.material_id) },
        { label: 'Ordered', align: 'right', render: (l) => num(l.qty) }, { label: 'Received', align: 'right', render: (l) => num(l.received) }, { label: 'Outstanding', align: 'right', render: (l) => num(l.qty - l.received) },
        { label: '', render: (l) => <button className="btn sm primary" onClick={() => setRec(l)}>Receive</button> },
      ]} />}
      {rec && <FormModal title={`Receive ${name(rec.material_id)}`} submitLabel="Receive" onClose={() => setRec(null)}
        initial={{ qty: rec.qty - rec.received, warehouse: rec.po.warehouse }}
        fields={[{ name: 'qty', label: 'Quantity received', type: 'number', required: true }, { name: 'warehouse', label: 'Warehouse', required: true }, { name: 'batch', label: 'Lot / batch no.' }, { name: 'quality', label: 'Quality check', type: 'select', default: 'Accepted', options: ['Accepted', 'Rejected'] }]}
        onSubmit={async (v) => (await run(() => api.post('/inventory/receive', { ...v, material_id: rec.material_id, po_id: rec.po.id }), 'Material received successfully.')) !== null} />}
    </>
  );
}
