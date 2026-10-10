import { useState } from 'react';
import { DataTable, FormModal, Loading, PageHead, Pill } from '../components/ui.jsx';
import { Hub } from './Hub.jsx';
import { api } from '../api.js';
import { useAction, useFetch } from '../hooks.js';
import { bdt, label, num } from '../format.js';

export const InventoryHub = () => (
  <Hub title="Inventory" sub="Raw materials, finished goods and stock control" cards={[
    ['/inventory/raw-materials', 'Raw Materials', 'Fabric, thread, trims and packaging'],
    ['/inventory/finished-goods', 'Finished Goods', 'Ready garments and availability'],
    ['/inventory/warehouses', 'Warehouses', 'Storage locations and value'],
    ['/inventory/movements', 'Stock Movements', 'Receipts, issues and adjustments'],
    ['/inventory/low-stock', 'Low Stock', 'Items below reorder level'],
    ['/inventory/reservations', 'Reservations', 'Stock held for buyer orders'],
  ]} />
);

export function RawMaterials() {
  const st = useFetch('/inventory/materials');
  const wh = useFetch('/inventory/warehouses');
  const run = useAction(st.reload);
  const [modal, setModal] = useState(null);
  return (
    <>
      <PageHead title="Raw Materials" sub="Current on-hand stock">
        <button className="btn" onClick={() => setModal({ type: 'receive' })}>Receive material</button>
        <button className="btn primary" onClick={() => setModal({ type: 'adjust' })}>Adjust stock</button>
      </PageHead>
      <Loading state={st} />
      {st.data && (
        <DataTable rows={st.data} search={['name', 'sku']} filters={[{ key: 'warehouse', label: 'All warehouses' }, { key: 'status', label: 'All statuses' }]}
          columns={[
            { label: 'Material', render: (m) => <><b>{m.name}</b><div className="muted mono">{m.sku}</div></> },
            { key: 'warehouse', label: 'Warehouse' },
            { label: 'On hand', align: 'right', render: (m) => `${num(m.on_hand, 2)} ${m.unit}` },
            { label: 'Reserved', align: 'right', render: (m) => num(m.reserved) },
            { label: 'Reorder at', align: 'right', render: (m) => num(m.reorder) },
            { label: 'Unit cost', align: 'right', render: (m) => bdt(m.unit_cost) },
            { label: 'Status', render: (m) => <Pill>{m.status}</Pill> },
          ]} />
      )}
      {modal?.type === 'receive' && (
        <FormModal title="Receive material" submitLabel="Receive" onClose={() => setModal(null)}
          fields={[
            { name: 'material_id', label: 'Material', type: 'select', required: true, options: st.data.map((m) => [m.id, `${m.name} (${m.unit})`]) },
            { name: 'qty', label: 'Quantity', type: 'number', required: true },
            { name: 'warehouse', label: 'Warehouse', type: 'select', required: true, default: 'RM-WH', options: (wh.data || []).map((w) => w.code) },
            { name: 'batch', label: 'Lot / batch no.' },
            { name: 'quality', label: 'Quality check', type: 'select', default: 'Accepted', options: ['Accepted', 'Rejected'] },
          ]}
          onSubmit={async (v) => (await run(() => api.post('/inventory/receive', v), 'Material received')) !== null} />
      )}
      {modal?.type === 'adjust' && (
        <FormModal title="Adjust stock" submitLabel="Apply" onClose={() => setModal(null)}
          fields={[
            { name: 'material_id', label: 'Material', type: 'select', required: true, options: st.data.map((m) => [m.id, `${m.name} (${m.unit})`]) },
            { name: 'delta', label: 'Change (use − for decrease)', type: 'number', required: true },
            { name: 'reason', label: 'Reason', required: true, placeholder: 'damaged, recount…' },
          ]}
          onSubmit={async (v) => (await run(() => api.post('/inventory/adjust', v), 'Inventory adjusted')) !== null} />
      )}
    </>
  );
}

export function FinishedGoods() {
  const st = useFetch('/inventory/finished-goods');
  return (
    <>
      <PageHead title="Finished Goods" sub="Ready garments and availability after reservations" />
      <Loading state={st} />
      {st.data && (
        <DataTable rows={st.data} search={['name', 'sku']} columns={[
          { label: 'Product', render: (p) => <><b>{p.name}</b><div className="muted mono">{p.sku}</div></> },
          { key: 'category', label: 'Category' },
          { label: 'In stock', align: 'right', render: (p) => num(p.stock) },
          { label: 'Reserved', align: 'right', render: (p) => num(p.reserved) },
          { label: 'Available', align: 'right', render: (p) => num(p.available) },
          { label: 'Status', render: (p) => <Pill>{p.status}</Pill> },
        ]} />
      )}
    </>
  );
}

export function Warehouses() {
  const st = useFetch('/inventory/warehouses');
  const run = useAction(st.reload);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Warehouses"><button className="btn primary" onClick={() => setOpen(true)}>+ New warehouse</button></PageHead>
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} columns={[
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'location', label: 'Location' }, { key: 'type', label: 'Type' },
        { label: 'Items', align: 'right', render: (w) => w.items }, { label: 'Stock value', align: 'right', render: (w) => bdt(w.value) },
        { label: 'Status', render: (w) => <Pill>{w.status}</Pill> },
      ]} />}
      {open && <FormModal title="New warehouse" onClose={() => setOpen(false)}
        fields={[{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true }, { name: 'location', label: 'Location' },
          { name: 'type', label: 'Type', type: 'select', required: true, options: ['Raw Material', 'Finished Goods', 'Production Floor Store'] }]}
        onSubmit={async (v) => (await run(() => api.post('/inventory/warehouses', v), `Warehouse "${v.name}" created`)) !== null} />}
    </>
  );
}

export function Movements() {
  const st = useFetch('/inventory/movements');
  return (
    <>
      <PageHead title="Stock Movements" sub="Latest 200 transactions" />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} search={['item', 'sku', 'ref']} filters={[{ key: 'type', label: 'All types' }, { key: 'warehouse', label: 'All warehouses' }]} columns={[
        { key: 'date', label: 'Date' }, { label: 'Item', render: (m) => <><b>{m.item}</b><div className="muted mono">{m.sku}</div></> },
        { key: 'warehouse', label: 'Warehouse' }, { label: 'Type', render: (m) => label(m.type) },
        { label: 'Qty', align: 'right', render: (m) => <span style={{ color: m.qty < 0 ? 'var(--bad)' : 'var(--ok)' }}>{m.qty > 0 ? '+' : ''}{num(m.qty)} {m.unit}</span> },
        { key: 'ref', label: 'Reference' }, { key: 'user', label: 'User' },
      ]} />}
    </>
  );
}

export function LowStock() {
  const st = useFetch('/inventory/low-stock');
  return (
    <>
      <PageHead title="Low Stock" sub="Materials at or below reorder level" />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data} empty="All materials are healthy" columns={[
        { label: 'Material', render: (m) => <><b>{m.name}</b><div className="muted mono">{m.sku}</div></> },
        { label: 'On hand', align: 'right', render: (m) => `${num(m.on_hand)} ${m.unit}` },
        { label: 'Reorder at', align: 'right', render: (m) => num(m.reorder) }, { label: 'Critical at', align: 'right', render: (m) => num(m.critical) },
        { label: 'Status', render: (m) => <Pill>{m.status}</Pill> },
      ]} />}
    </>
  );
}

export function Reservations() {
  const st = useFetch('/inventory/reservations');
  return (
    <>
      <PageHead title="Reservations" sub="Finished goods held for allocated or packed buyer orders" />
      <Loading state={st} />
      {st.data && <DataTable rows={st.data.map((r, i) => ({ ...r, id: i }))} empty="No stock is currently reserved" columns={[
        { key: 'order_id', label: 'Order' }, { key: 'buyer', label: 'Buyer' }, { key: 'variant', label: 'Variant' }, { key: 'sku', label: 'SKU' },
        { label: 'Qty', align: 'right', render: (r) => num(r.qty) }, { key: 'stage', label: 'Stage' },
      ]} />}
    </>
  );
}
